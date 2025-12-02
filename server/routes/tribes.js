/**
 * TRIBE ROUTES
 * Tribe management, membership, voting, and wars
 */

const express = require('express');
const router = express.Router();

const Tribe = require('../models/Tribe');
const User = require('../models/User');
const logger = require('../utils/logger');
const { TRIBE_SETTINGS } = require('../config/constants');
const {
  authenticate,
  requireTribe,
  requireTribeLeader,
  requireActiveSeason,
} = require('../middleware/auth');
const {
  asyncHandler,
  NotFoundError,
  ConflictError,
  ForbiddenError,
  AppError,
} = require('../middleware/errorHandler');
const { validate, tribeSchemas, idParamSchema } = require('../middleware/validator');
const { withTransaction } = require('../config/database');

/**
 * @route   GET /api/v1/tribes
 * @desc    List all tribes (with optional filters)
 * @access  Private
 */
router.get('/',
  authenticate,
  asyncHandler(async (req, res) => {
    const { search, page = 1, limit = 20, sort = '-victoryPoints.total' } = req.query;

    const query = { status: 'active' };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { tag: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [tribes, total] = await Promise.all([
      Tribe.find(query)
        .select('name tag banner memberCount territoryCount victoryPoints.total recruitment')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Tribe.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        tribes,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/tribes/:id
 * @desc    Get tribe details
 * @access  Private
 */
router.get('/:id',
  authenticate,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id)
      .populate('chieftain.userId', 'profile.displayName profile.avatar')
      .populate('captains.userId', 'profile.displayName profile.avatar')
      .populate('members.userId', 'profile.displayName profile.avatar')
      .lean();

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    // Check if user is member
    const isMember = tribe.members.some(m =>
      m.userId._id.toString() === req.user.id.toString()
    );

    // Build response
    const response = {
      id: tribe._id,
      name: tribe.name,
      tag: tribe.tag,
      banner: tribe.banner,
      description: tribe.description,
      chieftain: {
        id: tribe.chieftain.userId._id,
        displayName: tribe.chieftain.userId.profile.displayName,
        avatar: tribe.chieftain.userId.profile.avatar,
      },
      captains: tribe.captains.map(c => ({
        id: c.userId._id,
        displayName: c.userId.profile.displayName,
        avatar: c.userId.profile.avatar,
      })),
      memberCount: tribe.memberCount,
      maxMembers: TRIBE_SETTINGS.maxMembers,
      territoryCount: tribe.territoryCount,
      victoryPoints: tribe.victoryPoints.total,
      createdAt: tribe.createdAt,
      recruitment: tribe.recruitment,
    };

    // Add member list for tribe members only
    if (isMember) {
      response.members = tribe.members.map(m => ({
        id: m.userId._id,
        displayName: m.userId.profile.displayName,
        avatar: m.userId.profile.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
        contribution: m.contribution,
      }));

      response.treasury = tribe.treasury;
      response.diplomacy = tribe.diplomacy;
    }

    res.json({
      success: true,
      data: response,
    });
  })
);

/**
 * @route   POST /api/v1/tribes
 * @desc    Create new tribe
 * @access  Private
 */
router.post('/',
  authenticate,
  requireActiveSeason,
  validate(tribeSchemas.create),
  asyncHandler(async (req, res) => {
    const { name, description, tag, isPublic } = req.body;

    // Check if user already in a tribe
    const user = await User.findById(req.user.id);
    if (user.currentSeason?.tribeId) {
      throw new ConflictError('You are already in a tribe. Leave first to create a new one.');
    }

    // Check name uniqueness
    const nameExists = await Tribe.findOne({
      $or: [
        { name: { $regex: `^${name}$`, $options: 'i' } },
        { tag: tag?.toUpperCase() },
      ],
    });

    if (nameExists) {
      throw new ConflictError('Tribe name or tag already exists');
    }

    // Create tribe
    const tribe = await Tribe.create({
      name,
      description,
      tag: tag?.toUpperCase(),
      seasonId: req.user.seasonId,
      chieftain: {
        userId: req.user.id,
        assignedAt: new Date(),
      },
      members: [{
        userId: req.user.id,
        role: 'chieftain',
        joinedAt: new Date(),
      }],
      memberCount: 1,
      recruitment: {
        isOpen: isPublic !== false,
      },
    });

    // Update user
    user.currentSeason.tribeId = tribe._id;
    user.currentSeason.tribeRole = 'chieftain';
    await user.save();

    logger.info('Tribe created', {
      tribeId: tribe._id,
      tribeName: name,
      chieftain: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: {
        id: tribe._id,
        name: tribe.name,
        tag: tribe.tag,
      },
    });
  })
);

/**
 * @route   PATCH /api/v1/tribes/:id
 * @desc    Update tribe settings
 * @access  Private (Leadership)
 */
router.patch('/:id',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.update),
  asyncHandler(async (req, res) => {
    const { description, banner, isPublic, recruitmentMessage } = req.body;

    const updateFields = {};
    if (description !== undefined) updateFields.description = description;
    if (banner) updateFields.banner = banner;
    if (isPublic !== undefined) updateFields['recruitment.isOpen'] = isPublic;
    if (recruitmentMessage) updateFields['recruitment.message'] = recruitmentMessage;

    const tribe = await Tribe.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    );

    logger.info('Tribe updated', { tribeId: req.params.id, updatedBy: req.user.id });

    res.json({
      success: true,
      data: tribe,
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/join
 * @desc    Join tribe (if public)
 * @access  Private
 */
router.post('/:id/join',
  authenticate,
  requireActiveSeason,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    // Check if user already in a tribe
    const user = await User.findById(req.user.id);
    if (user.currentSeason?.tribeId) {
      throw new ConflictError('You are already in a tribe');
    }

    // Check if tribe is accepting members
    if (!tribe.recruitment.isOpen) {
      throw new ForbiddenError('This tribe is not accepting new members');
    }

    // Check member limit
    if (tribe.memberCount >= TRIBE_SETTINGS.maxMembers) {
      throw new AppError('Tribe is at maximum capacity', 400, 'TRIBE_FULL');
    }

    // Add member
    tribe.members.push({
      userId: req.user.id,
      role: 'member',
      joinedAt: new Date(),
    });
    tribe.memberCount = tribe.members.length;
    await tribe.save();

    // Update user
    user.currentSeason.tribeId = tribe._id;
    user.currentSeason.tribeRole = 'member';
    await user.save();

    logger.info('User joined tribe', { userId: req.user.id, tribeId: tribe._id });

    res.json({
      success: true,
      message: `You have joined ${tribe.name}`,
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/leave
 * @desc    Leave tribe
 * @access  Private
 */
router.post('/:id/leave',
  authenticate,
  requireTribe,
  validate(idParamSchema, 'params'),
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    // Check if user is chieftain
    if (tribe.chieftain.userId.equals(req.user.id)) {
      throw new ForbiddenError('Chieftain cannot leave. Transfer leadership or disband tribe first.');
    }

    // Remove member
    tribe.members = tribe.members.filter(m => !m.userId.equals(req.user.id));
    tribe.captains = tribe.captains.filter(c => !c.userId.equals(req.user.id));
    tribe.memberCount = tribe.members.length;
    await tribe.save();

    // Update user
    await User.updateOne(
      { _id: req.user.id },
      {
        $unset: {
          'currentSeason.tribeId': 1,
          'currentSeason.tribeRole': 1,
        },
      }
    );

    logger.info('User left tribe', { userId: req.user.id, tribeId: tribe._id });

    res.json({
      success: true,
      message: 'You have left the tribe',
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/invite
 * @desc    Invite user to tribe
 * @access  Private (Leadership)
 */
router.post('/:id/invite',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.invite),
  asyncHandler(async (req, res) => {
    const { userId, message } = req.body;

    const tribe = req.tribe;

    // Check member limit
    if (tribe.memberCount >= TRIBE_SETTINGS.maxMembers) {
      throw new AppError('Tribe is at maximum capacity', 400, 'TRIBE_FULL');
    }

    // Check if user exists and not already in tribe
    const invitee = await User.findById(userId);
    if (!invitee) {
      throw new NotFoundError('User');
    }

    if (invitee.currentSeason?.tribeId) {
      throw new ConflictError('User is already in a tribe');
    }

    // Check for pending invite
    const existingInvite = tribe.recruitment.pendingInvites?.find(
      i => i.userId.equals(userId) && i.status === 'pending'
    );

    if (existingInvite) {
      throw new ConflictError('User already has a pending invite');
    }

    // Add invite
    if (!tribe.recruitment.pendingInvites) {
      tribe.recruitment.pendingInvites = [];
    }

    tribe.recruitment.pendingInvites.push({
      userId,
      invitedBy: req.user.id,
      message,
      status: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await tribe.save();

    // TODO: Send notification to user

    logger.info('Tribe invite sent', {
      tribeId: tribe._id,
      invitee: userId,
      invitedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Invite sent',
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/kick
 * @desc    Kick member from tribe
 * @access  Private (Leadership)
 */
router.post('/:id/kick',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.kick),
  asyncHandler(async (req, res) => {
    const { userId, reason } = req.body;
    const tribe = req.tribe;

    // Cannot kick chieftain
    if (tribe.chieftain.userId.equals(userId)) {
      throw new ForbiddenError('Cannot kick the chieftain');
    }

    // Captains can only kick members, not other captains
    if (req.isCaptain) {
      const targetIsCaptain = tribe.captains.some(c => c.userId.equals(userId));
      if (targetIsCaptain) {
        throw new ForbiddenError('Captains cannot kick other captains');
      }
    }

    // Remove member
    tribe.members = tribe.members.filter(m => !m.userId.equals(userId));
    tribe.captains = tribe.captains.filter(c => !c.userId.equals(userId));
    tribe.memberCount = tribe.members.length;
    await tribe.save();

    // Update user
    await User.updateOne(
      { _id: userId },
      {
        $unset: {
          'currentSeason.tribeId': 1,
          'currentSeason.tribeRole': 1,
        },
      }
    );

    logger.info('Member kicked from tribe', {
      tribeId: tribe._id,
      kickedUser: userId,
      kickedBy: req.user.id,
      reason,
    });

    res.json({
      success: true,
      message: 'Member kicked',
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/promote
 * @desc    Promote/demote member
 * @access  Private (Chieftain only)
 */
router.post('/:id/promote',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.promote),
  asyncHandler(async (req, res) => {
    const { userId, role } = req.body;
    const tribe = req.tribe;

    // Only chieftain can promote
    if (!req.isChieftain) {
      throw new ForbiddenError('Only chieftain can promote/demote members');
    }

    // Cannot change own role
    if (userId === req.user.id) {
      throw new ForbiddenError('Cannot change your own role');
    }

    // Check member exists
    const memberIndex = tribe.members.findIndex(m => m.userId.equals(userId));
    if (memberIndex === -1) {
      throw new NotFoundError('Member');
    }

    // Check captain limit
    if (role === 'captain' && tribe.captains.length >= TRIBE_SETTINGS.maxCaptains) {
      throw new AppError('Maximum captains reached', 400, 'MAX_CAPTAINS');
    }

    // Update role
    tribe.members[memberIndex].role = role;

    if (role === 'captain') {
      // Check not already captain
      const isCaptain = tribe.captains.some(c => c.userId.equals(userId));
      if (!isCaptain) {
        tribe.captains.push({
          userId,
          assignedAt: new Date(),
        });
      }
    } else {
      // Remove from captains if demoted
      tribe.captains = tribe.captains.filter(c => !c.userId.equals(userId));
    }

    await tribe.save();

    // Update user
    await User.updateOne(
      { _id: userId },
      { $set: { 'currentSeason.tribeRole': role } }
    );

    logger.info('Member role changed', {
      tribeId: tribe._id,
      targetUser: userId,
      newRole: role,
      changedBy: req.user.id,
    });

    res.json({
      success: true,
      message: `Member ${role === 'captain' ? 'promoted to captain' : 'demoted to member'}`,
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/transfer-leadership
 * @desc    Transfer chieftain role
 * @access  Private (Chieftain only)
 */
router.post('/:id/transfer-leadership',
  authenticate,
  requireTribeLeader,
  asyncHandler(async (req, res) => {
    const { newChieftainId } = req.body;
    const tribe = req.tribe;

    if (!req.isChieftain) {
      throw new ForbiddenError('Only chieftain can transfer leadership');
    }

    // Check new chieftain is a member
    const newChieftain = tribe.members.find(m => m.userId.equals(newChieftainId));
    if (!newChieftain) {
      throw new NotFoundError('Member');
    }

    await withTransaction(async (session) => {
      // Update tribe
      tribe.chieftain = {
        userId: newChieftainId,
        assignedAt: new Date(),
      };

      // Update member roles
      const currentChieftainIndex = tribe.members.findIndex(m => m.userId.equals(req.user.id));
      const newChieftainIndex = tribe.members.findIndex(m => m.userId.equals(newChieftainId));

      tribe.members[currentChieftainIndex].role = 'member';
      tribe.members[newChieftainIndex].role = 'chieftain';

      // Remove from captains if they were captain
      tribe.captains = tribe.captains.filter(c => !c.userId.equals(newChieftainId));

      await tribe.save({ session });

      // Update users
      await User.updateOne(
        { _id: req.user.id },
        { $set: { 'currentSeason.tribeRole': 'member' } },
        { session }
      );

      await User.updateOne(
        { _id: newChieftainId },
        { $set: { 'currentSeason.tribeRole': 'chieftain' } },
        { session }
      );
    });

    logger.info('Tribe leadership transferred', {
      tribeId: tribe._id,
      fromUser: req.user.id,
      toUser: newChieftainId,
    });

    res.json({
      success: true,
      message: 'Leadership transferred',
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/declare-war
 * @desc    Declare war on another tribe
 * @access  Private (Chieftain only)
 */
router.post('/:id/declare-war',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.declareWar),
  asyncHandler(async (req, res) => {
    const { targetTribeId, declaration } = req.body;
    const tribe = req.tribe;

    if (!req.isChieftain) {
      throw new ForbiddenError('Only chieftain can declare war');
    }

    const targetTribe = await Tribe.findById(targetTribeId);
    if (!targetTribe) {
      throw new NotFoundError('Target tribe');
    }

    // Check not already at war
    const existingWar = tribe.diplomacy.wars.find(
      w => w.targetTribeId.equals(targetTribeId) && w.status === 'active'
    );

    if (existingWar) {
      throw new ConflictError('Already at war with this tribe');
    }

    // Check war limit
    const activeWars = tribe.diplomacy.wars.filter(w => w.status === 'active');
    if (activeWars.length >= TRIBE_SETTINGS.maxWarsActive) {
      throw new AppError('Maximum active wars reached', 400, 'MAX_WARS');
    }

    const warEndDate = new Date(Date.now() + TRIBE_SETTINGS.warDuration * 1000);

    // Add war to both tribes
    const warRecord = {
      targetTribeId,
      targetTribeName: targetTribe.name,
      declaredBy: req.user.id,
      declaration,
      status: 'active',
      startedAt: new Date(),
      endsAt: warEndDate,
      vpBonus: 1.5,
    };

    tribe.diplomacy.wars.push(warRecord);
    await tribe.save();

    targetTribe.diplomacy.wars.push({
      targetTribeId: tribe._id,
      targetTribeName: tribe.name,
      declaredBy: req.user.id,
      declaration: `${tribe.name} has declared war!`,
      status: 'active',
      startedAt: new Date(),
      endsAt: warEndDate,
      vpBonus: 1.5,
    });
    await targetTribe.save();

    logger.info('War declared', {
      attackerTribe: tribe._id,
      defenderTribe: targetTribeId,
      declaredBy: req.user.id,
    });

    res.json({
      success: true,
      message: `War declared on ${targetTribe.name}!`,
      data: {
        endsAt: warEndDate,
        vpBonus: 1.5,
      },
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/votes
 * @desc    Create a tribe vote
 * @access  Private (Leadership)
 */
router.post('/:id/votes',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.createVote),
  asyncHandler(async (req, res) => {
    const { type, targetId, amount, description, options, duration } = req.body;
    const tribe = req.tribe;

    const vote = {
      type,
      targetId,
      amount,
      description,
      options: options || ['approve', 'reject'],
      createdBy: req.user.id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 1000),
      status: 'active',
      votes: [],
      requiredVotes: TRIBE_SETTINGS.votingThreshold,
    };

    tribe.governance.activeVotes.push(vote);
    await tribe.save();

    logger.info('Tribe vote created', {
      tribeId: tribe._id,
      voteType: type,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: vote,
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/votes/:voteId
 * @desc    Cast vote
 * @access  Private (Members)
 */
router.post('/:id/votes/:voteId',
  authenticate,
  requireTribe,
  validate(tribeSchemas.castVote),
  asyncHandler(async (req, res) => {
    const { choice } = req.body;
    const tribe = await Tribe.findById(req.params.id);

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    const voteIndex = tribe.governance.activeVotes.findIndex(
      v => v._id.equals(req.params.voteId)
    );

    if (voteIndex === -1) {
      throw new NotFoundError('Vote');
    }

    const vote = tribe.governance.activeVotes[voteIndex];

    // Check if vote is still active
    if (vote.status !== 'active' || vote.expiresAt < new Date()) {
      throw new AppError('Vote has ended', 400, 'VOTE_ENDED');
    }

    // Check if already voted
    const hasVoted = vote.votes.some(v => v.userId.equals(req.user.id));
    if (hasVoted) {
      throw new ConflictError('You have already voted');
    }

    // Cast vote
    vote.votes.push({
      userId: req.user.id,
      choice,
      votedAt: new Date(),
    });

    // Check if threshold reached
    const approveCount = vote.votes.filter(v => v.choice === 'approve').length;
    const rejectCount = vote.votes.filter(v => v.choice === 'reject').length;

    if (approveCount >= vote.requiredVotes) {
      vote.status = 'passed';
      vote.result = 'approved';
      // TODO: Execute vote action
    } else if (rejectCount >= vote.requiredVotes) {
      vote.status = 'failed';
      vote.result = 'rejected';
    }

    await tribe.save();

    logger.info('Vote cast', {
      tribeId: tribe._id,
      voteId: req.params.voteId,
      userId: req.user.id,
      choice,
    });

    res.json({
      success: true,
      data: {
        voteStatus: vote.status,
        approveCount,
        rejectCount,
        requiredVotes: vote.requiredVotes,
      },
    });
  })
);

/**
 * @route   POST /api/v1/tribes/:id/announcements
 * @desc    Create tribe announcement
 * @access  Private (Leadership)
 */
router.post('/:id/announcements',
  authenticate,
  requireTribeLeader,
  validate(tribeSchemas.announcement),
  asyncHandler(async (req, res) => {
    const { title, content, priority, isPinned } = req.body;
    const tribe = req.tribe;

    const announcement = {
      title,
      content,
      priority,
      isPinned,
      createdBy: req.user.id,
      createdAt: new Date(),
    };

    tribe.announcements.unshift(announcement);

    // Keep only last 50 announcements
    if (tribe.announcements.length > 50) {
      tribe.announcements = tribe.announcements.slice(0, 50);
    }

    await tribe.save();

    res.status(201).json({
      success: true,
      data: announcement,
    });
  })
);

/**
 * @route   GET /api/v1/tribes/:id/announcements
 * @desc    Get tribe announcements
 * @access  Private (Members)
 */
router.get('/:id/announcements',
  authenticate,
  requireTribe,
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id)
      .select('announcements')
      .populate('announcements.createdBy', 'profile.displayName')
      .lean();

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    res.json({
      success: true,
      data: tribe.announcements,
    });
  })
);

/**
 * @route   GET /api/v1/tribes/:id/treasury
 * @desc    Get tribe treasury info
 * @access  Private (Members)
 */
router.get('/:id/treasury',
  authenticate,
  requireTribe,
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.params.id)
      .select('treasury')
      .lean();

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    res.json({
      success: true,
      data: tribe.treasury,
    });
  })
);

module.exports = router;
