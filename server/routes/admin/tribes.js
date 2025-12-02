/**
 * ADMIN TRIBES ROUTES
 * Tribe management for admin panel
 */

const express = require('express');
const router = express.Router();
const Tribe = require('../../models/Tribe');
const User = require('../../models/User');
const Territory = require('../../models/Territory');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { roleCheck, requireRole } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

/**
 * List/Search tribes
 * GET /api/admin/tribes
 */
router.get('/', roleCheck('tribes:read'), async (req, res) => {
  try {
    const { q, season, flagged, page = 1, limit = 20, sort = '-victoryPoints' } = req.query;

    const query = {};
    if (q) {
      query.$or = [
        { name: new RegExp(q, 'i') },
        { tag: new RegExp(q, 'i') }
      ];
    }
    if (season) query.seasonId = season;
    if (flagged === 'true') query['flags.isUnderReview'] = true;

    const tribes = await Tribe.find(query)
      .select('name tag chieftainId memberCount victoryPoints treasury territoriesControlled flags createdAt')
      .populate('chieftainId', 'username walletAddress')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Tribe.countDocuments(query);

    res.json({
      success: true,
      data: tribes.map(t => ({ ...t.toObject(), id: t._id })),
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get tribe details
 * GET /api/admin/tribes/:tribeId
 */
router.get('/:tribeId', roleCheck('tribes:read'), async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.tribeId)
      .populate('chieftainId', 'username walletAddress')
      .populate('members.userId', 'username walletAddress');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRIBE_NOT_FOUND', message: 'Tribe not found' }
      });
    }

    // Get territories
    const territories = await Territory.find({ ownerId: tribe._id })
      .select('territoryId name tier');

    // Get members
    const members = await User.find({ tribeId: tribe._id })
      .select('username walletAddress gold victoryPoints');

    // Get moderation history
    const moderationHistory = await AdminAuditLog.find({
      'target.id': tribe._id,
      action: { $in: ['TRIBE_FLAG', 'TRIBE_DISQUALIFY', 'TRIBE_WARN'] }
    }).sort({ timestamp: -1 }).limit(20);

    res.json({
      success: true,
      data: {
        ...tribe.toObject(),
        id: tribe._id,
        territories,
        membersList: members,
        moderationHistory
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Flag tribe for review
 * POST /api/admin/tribes/:tribeId/flag
 */
router.post('/:tribeId/flag',
  roleCheck('tribes:flag'),
  auditLogger('TRIBE_FLAG', (req) => ({
    type: 'tribe',
    id: req.params.tribeId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason, priority = 'medium' } = req.body;

      const tribe = await Tribe.findByIdAndUpdate(req.params.tribeId, {
        $set: { 'flags.isUnderReview': true, 'flags.priority': priority },
        $push: {
          'flags.history': {
            type: 'flagged',
            reason,
            by: req.admin._id,
            at: new Date()
          }
        }
      }, { new: true });

      if (!tribe) {
        return res.status(404).json({
          success: false,
          error: { code: 'TRIBE_NOT_FOUND', message: 'Tribe not found' }
        });
      }

      res.json({ success: true, data: { message: 'Tribe flagged for review' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Propose disqualification
 * POST /api/admin/tribes/:tribeId/propose-disqualify
 */
router.post('/:tribeId/propose-disqualify',
  roleCheck('tribes:propose_disqualify'),
  auditLogger('TRIBE_PROPOSE_DISQUALIFY', (req) => ({
    type: 'tribe',
    id: req.params.tribeId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason, evidence } = req.body;

      const tribe = await Tribe.findByIdAndUpdate(req.params.tribeId, {
        $set: {
          'disqualification.proposed': true,
          'disqualification.proposedBy': req.admin._id,
          'disqualification.proposedAt': new Date(),
          'disqualification.reason': reason,
          'disqualification.evidence': evidence
        }
      }, { new: true });

      if (!tribe) {
        return res.status(404).json({
          success: false,
          error: { code: 'TRIBE_NOT_FOUND', message: 'Tribe not found' }
        });
      }

      res.json({ success: true, data: { message: 'Disqualification proposed' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Approve disqualification (Super Admin only)
 * POST /api/admin/tribes/:tribeId/approve-disqualify
 */
router.post('/:tribeId/approve-disqualify',
  requireRole('super_admin'),
  auditLogger('TRIBE_DISQUALIFY', (req) => ({
    type: 'tribe',
    id: req.params.tribeId,
    changes: { approved: true }
  })),
  async (req, res) => {
    try {
      const tribe = await Tribe.findByIdAndUpdate(req.params.tribeId, {
        $set: {
          status: 'disqualified',
          'disqualification.approved': true,
          'disqualification.approvedBy': req.admin._id,
          'disqualification.approvedAt': new Date()
        }
      }, { new: true });

      if (!tribe) {
        return res.status(404).json({
          success: false,
          error: { code: 'TRIBE_NOT_FOUND', message: 'Tribe not found' }
        });
      }

      // Remove tribe from leaderboards, etc.
      // TODO: Implement full disqualification effects

      res.json({ success: true, data: { message: 'Tribe disqualified' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
  });

/**
 * Get tribe treasury logs
 * GET /api/admin/tribes/:tribeId/treasury
 */
router.get('/:tribeId/treasury', roleCheck('tribes:treasury_logs'), async (req, res) => {
  try {
    const tribe = await Tribe.findById(req.params.tribeId)
      .select('treasury treasuryLog');

    if (!tribe) {
      return res.status(404).json({
        success: false,
        error: { code: 'TRIBE_NOT_FOUND', message: 'Tribe not found' }
      });
    }

    res.json({
      success: true,
      data: {
        balance: tribe.treasury,
        logs: tribe.treasuryLog || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

/**
 * Get tribe members
 * GET /api/admin/tribes/:tribeId/members
 */
router.get('/:tribeId/members', roleCheck('tribes:read'), async (req, res) => {
  try {
    const members = await User.find({ tribeId: req.params.tribeId })
      .select('username walletAddress gold victoryPoints role createdAt');

    res.json({
      success: true,
      data: members.map(m => ({ ...m.toObject(), id: m._id }))
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
