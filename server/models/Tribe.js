/**
 * TRIBE MODEL
 * 12-person teams with roles, treasury, and collective VP
 */

const mongoose = require('mongoose');
const { TRIBE_SETTINGS } = require('../config/constants');

const TribeSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTITY
    // ============================================
    name: {
      type: String,
      required: [true, 'Tribe name is required'],
      trim: true,
      minlength: [3, 'Tribe name must be at least 3 characters'],
      maxlength: [30, 'Tribe name cannot exceed 30 characters'],
      index: true
    },

    tag: {
      type: String,
      required: [true, 'Tribe tag is required'],
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9]{2,5}$/, 'Tribe tag must be 2-5 uppercase letters/numbers'],
      index: true
    },

    // ============================================
    // SEASON
    // ============================================
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'Season ID is required'],
      index: true
    },

    // ============================================
    // LEADERSHIP
    // ============================================
    chieftainId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Chieftain is required'],
      index: true
    },

    captains: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],

    // ============================================
    // MEMBERS
    // ============================================
    members: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        role: {
          type: String,
          enum: ['chieftain', 'captain', 'warrior'],
          required: true
        },
        joinedAt: {
          type: Date,
          default: Date.now
        },
        isActive: {
          type: Boolean,
          default: true
        },
        lastLogin: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================
    // TREASURY
    // ============================================
    treasury: {
      gold: {
        type: Number,
        default: 0,
        min: [0, 'Treasury gold cannot be negative']
      },

      // Transaction history for transparency
      transactions: [
        {
          type: {
            type: String,
            enum: ['contribution', 'withdrawal', 'tax', 'battle_loot', 'compensation'],
            required: true
          },
          amount: {
            type: Number,
            required: true
          },
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          },
          reason: {
            type: String,
            maxlength: 200
          },
          timestamp: {
            type: Date,
            default: Date.now
          }
        }
      ]
    },

    // ============================================
    // VICTORY POINTS
    // ============================================
    totalVP: {
      type: Number,
      default: 0,
      min: 0,
      index: true
    },

    vpRank: {
      type: Number,
      default: null,
      index: true
    },

    // ============================================
    // TERRITORIES
    // ============================================
    territoriesControlled: [
      {
        type: Number, // Territory ID (1-50)
        min: 1,
        max: 50
      }
    ],

    territoryCount: {
      type: Number,
      default: 0,
      min: 0
    },

    // ============================================
    // WAR DECLARATIONS
    // ============================================
    warTarget: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null,
      index: true
    },

    warDeclaredAt: {
      type: Date,
      default: null
    },

    warUntil: {
      type: Date,
      default: null
    },

    // Wars declared against this tribe
    warsAgainstUs: [
      {
        attackerTribeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tribe'
        },
        declaredAt: {
          type: Date,
          default: Date.now
        },
        expiresAt: {
          type: Date
        }
      }
    ],

    // ============================================
    // VOTING RECORDS
    // ============================================
    activeVotes: [
      {
        voteType: {
          type: String,
          enum: ['war_declaration', 'member_kick', 'chieftain_transfer'],
          required: true
        },
        targetId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true
        },
        targetName: {
          type: String
        },
        votesFor: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        ],
        votesAgainst: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        ],
        createdAt: {
          type: Date,
          default: Date.now
        },
        expiresAt: {
          type: Date,
          default: function() {
            return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
          }
        },
        status: {
          type: String,
          enum: ['active', 'passed', 'failed', 'expired'],
          default: 'active'
        }
      }
    ],

    // ============================================
    // STATISTICS
    // ============================================
    stats: {
      totalBattles: { type: Number, default: 0 },
      battlesWon: { type: Number, default: 0 },
      territoriesCaptured: { type: Number, default: 0 },
      totalGoldEarned: { type: Number, default: 0 },
      totalVPEarned: { type: Number, default: 0 }
    },

    // ============================================
    // FORMATION METHOD
    // ============================================
    formationMethod: {
      type: String,
      enum: ['self_organized', 'auto_matchmaking'],
      default: 'self_organized'
    },

    // ============================================
    // STATUS
    // ============================================
    isActive: {
      type: Boolean,
      default: true
    },

    disqualified: {
      type: Boolean,
      default: false
    },

    disqualificationReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'tribes'
  }
);

// ============================================
// INDEXES
// ============================================

// Unique tribe name per season
TribeSchema.index({ name: 1, seasonId: 1 }, { unique: true });

// Unique tribe tag per season
TribeSchema.index({ tag: 1, seasonId: 1 }, { unique: true });

// Leaderboard queries
TribeSchema.index({ seasonId: 1, totalVP: -1 });

// War queries
TribeSchema.index({ seasonId: 1, warTarget: 1 });

// Active tribes
TribeSchema.index({ seasonId: 1, isActive: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Member count
TribeSchema.virtual('memberCount').get(function() {
  return this.members.filter(m => m.isActive).length;
});

// Is tribe full (12/12 members)
TribeSchema.virtual('isFull').get(function() {
  return this.memberCount >= TRIBE_SETTINGS.maxMembers;
});

// Is tribe at war
TribeSchema.virtual('isAtWar').get(function() {
  return this.warTarget !== null && this.warUntil && this.warUntil > new Date();
});

// Win rate percentage
TribeSchema.virtual('winRate').get(function() {
  if (this.stats.totalBattles === 0) return 0;
  return ((this.stats.battlesWon / this.stats.totalBattles) * 100).toFixed(2);
});

// Average VP per member
TribeSchema.virtual('avgVPPerMember').get(function() {
  if (this.memberCount === 0) return 0;
  return (this.totalVP / this.memberCount).toFixed(2);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if tribe can declare war
 * @param {ObjectId} targetTribeId
 * @returns {Object} { canDeclare: Boolean, reason: String }
 */
TribeSchema.methods.canDeclareWar = function(targetTribeId) {
  // Already at war with someone
  if (this.isAtWar) {
    return { canDeclare: false, reason: 'Already at war with another tribe' };
  }

  // Cannot declare war on self
  if (this._id.equals(targetTribeId)) {
    return { canDeclare: false, reason: 'Cannot declare war on your own tribe' };
  }

  return { canDeclare: true };
};

/**
 * Add member to tribe
 * @param {ObjectId} userId
 * @param {String} role - 'chieftain', 'captain', 'warrior'
 * @returns {Object} { success: Boolean, error: String }
 */
TribeSchema.methods.addMember = function(userId, role = 'warrior') {
  // Check if already member
  const existingMember = this.members.find(m => m.userId.equals(userId) && m.isActive);
  if (existingMember) {
    return { success: false, error: 'User is already a member' };
  }

  // Check if full
  if (this.isFull) {
    return { success: false, error: 'Tribe is full (12/12 members)' };
  }

  this.members.push({
    userId,
    role,
    joinedAt: new Date(),
    isActive: true,
    lastLogin: new Date()
  });

  return { success: true };
};

/**
 * Remove member from tribe
 * @param {ObjectId} userId
 * @returns {Object} { success: Boolean, error: String }
 */
TribeSchema.methods.removeMember = function(userId) {
  const memberIndex = this.members.findIndex(m => m.userId.equals(userId) && m.isActive);

  if (memberIndex === -1) {
    return { success: false, error: 'User is not a member' };
  }

  // Cannot remove chieftain
  if (this.members[memberIndex].role === 'chieftain') {
    return { success: false, error: 'Cannot remove chieftain. Transfer leadership first.' };
  }

  // Mark as inactive instead of removing (preserve history)
  this.members[memberIndex].isActive = false;

  // Remove from captains array if applicable
  if (this.members[memberIndex].role === 'captain') {
    this.captains = this.captains.filter(c => !c.equals(userId));
  }

  return { success: true };
};

/**
 * Check if user is member
 * @param {ObjectId} userId
 * @returns {Boolean}
 */
TribeSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.userId.equals(userId) && m.isActive);
};

/**
 * Check if user is chieftain or captain
 * @param {ObjectId} userId
 * @returns {Boolean}
 */
TribeSchema.methods.isLeader = function(userId) {
  const member = this.members.find(m => m.userId.equals(userId) && m.isActive);
  return member && (member.role === 'chieftain' || member.role === 'captain');
};

/**
 * Add gold to treasury
 * @param {Number} amount
 * @param {ObjectId} userId - who contributed
 * @param {String} source - 'contribution', 'tax', 'battle_loot'
 * @param {String} reason
 */
TribeSchema.methods.addToTreasury = function(amount, userId, source, reason = '') {
  this.treasury.gold += amount;
  this.treasury.transactions.push({
    type: source,
    amount,
    userId,
    reason,
    timestamp: new Date()
  });
};

/**
 * Withdraw gold from treasury (requires approval for large amounts)
 * @param {Number} amount
 * @param {ObjectId} userId - who is withdrawing
 * @param {String} reason
 * @returns {Object} { success: Boolean, error: String, requiresApproval: Boolean }
 */
TribeSchema.methods.withdrawFromTreasury = function(amount, userId, reason) {
  if (this.treasury.gold < amount) {
    return { success: false, error: 'Insufficient treasury funds' };
  }

  // Large withdrawals (>1000g) require captain approval
  if (amount > 1000) {
    const isChieftain = this.chieftainId.equals(userId);
    const isCaptain = this.captains.some(c => c.equals(userId));

    if (!isChieftain && !isCaptain) {
      return {
        success: false,
        error: 'Large withdrawals require chieftain or captain approval',
        requiresApproval: true
      };
    }
  }

  this.treasury.gold -= amount;
  this.treasury.transactions.push({
    type: 'withdrawal',
    amount: -amount,
    userId,
    reason,
    timestamp: new Date()
  });

  return { success: true };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get leaderboard for a season
 * @param {ObjectId} seasonId
 * @param {Number} limit
 * @returns {Promise<Array<Tribe>>}
 */
TribeSchema.statics.getLeaderboard = async function(seasonId, limit = 25) {
  return this.find({ seasonId, isActive: true, disqualified: false })
    .sort({ totalVP: -1 })
    .limit(limit)
    .populate('chieftainId', 'username walletAddress')
    .select('name tag totalVP territoryCount memberCount stats');
};

/**
 * Find tribe by name (case-insensitive)
 * @param {String} name
 * @param {ObjectId} seasonId
 * @returns {Promise<Tribe>}
 */
TribeSchema.statics.findByName = async function(name, seasonId) {
  return this.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') },
    seasonId
  });
};

/**
 * Find tribe by tag (case-insensitive)
 * @param {String} tag
 * @param {ObjectId} seasonId
 * @returns {Promise<Tribe>}
 */
TribeSchema.statics.findByTag = async function(tag, seasonId) {
  return this.findOne({
    tag: tag.toUpperCase(),
    seasonId
  });
};

/**
 * Get tribes at war with a specific tribe
 * @param {ObjectId} tribeId
 * @returns {Promise<Array<Tribe>>}
 */
TribeSchema.statics.getTribesAtWarWith = async function(tribeId) {
  return this.find({
    warTarget: tribeId,
    warUntil: { $gt: new Date() }
  }).select('name tag warDeclaredAt warUntil');
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Ensure chieftain is in members array
TribeSchema.pre('save', function(next) {
  const chieftainInMembers = this.members.some(
    m => m.userId.equals(this.chieftainId) && m.isActive
  );

  if (!chieftainInMembers) {
    this.members.push({
      userId: this.chieftainId,
      role: 'chieftain',
      joinedAt: new Date(),
      isActive: true,
      lastLogin: new Date()
    });
  }

  // Update territory count from array length
  this.territoryCount = this.territoriesControlled.length;

  next();
});

// Ensure captains are in members array
TribeSchema.pre('save', function(next) {
  for (const captainId of this.captains) {
    const captainInMembers = this.members.some(
      m => m.userId.equals(captainId) && m.isActive
    );

    if (!captainInMembers) {
      this.members.push({
        userId: captainId,
        role: 'captain',
        joinedAt: new Date(),
        isActive: true,
        lastLogin: new Date()
      });
    }
  }

  next();
});

// Validation: max 2 captains
TribeSchema.pre('save', function(next) {
  if (this.captains.length > TRIBE_SETTINGS.maxCaptains) {
    return next(new Error(`Cannot have more than ${TRIBE_SETTINGS.maxCaptains} captains`));
  }
  next();
});

// Validation: max 12 members
TribeSchema.pre('save', function(next) {
  const activeMembers = this.members.filter(m => m.isActive).length;
  if (activeMembers > TRIBE_SETTINGS.maxMembers) {
    return next(new Error(`Cannot have more than ${TRIBE_SETTINGS.maxMembers} members`));
  }
  next();
});

// Ensure virtuals are included in JSON
TribeSchema.set('toJSON', { virtuals: true });
TribeSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Tribe', TribeSchema);
