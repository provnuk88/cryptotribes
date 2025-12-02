/**
 * BATTLE MODEL
 * Immutable battle history log with full combat details for audit trail
 */

const mongoose = require('mongoose');

const BattleSchema = new mongoose.Schema(
  {
    // ============================================
    // SEASON & CLASSIFICATION
    // ============================================
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'Season ID is required'],
      index: true
    },

    battleType: {
      type: String,
      enum: ['pvp', 'pve_npc', 'pve_raid'],
      required: [true, 'Battle type is required'],
      index: true
    },

    // ============================================
    // PARTICIPANTS
    // ============================================
    attackerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attacker ID is required'],
      index: true
    },

    attackerUsername: {
      type: String,
      default: 'Unknown'
    },

    attackerTribeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },

    attackerTribeName: {
      type: String,
      default: null
    },

    defenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null, // null for NPC battles
      index: true
    },

    defenderUsername: {
      type: String,
      default: 'NPC Garrison'
    },

    defenderTribeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },

    defenderTribeName: {
      type: String,
      default: null
    },

    // ============================================
    // TERRITORY INFORMATION
    // ============================================
    territoryId: {
      type: Number,
      required: [true, 'Territory ID is required'],
      min: 1,
      max: 50,
      index: true
    },

    territoryName: {
      type: String,
      default: function() {
        return `Territory #${this.territoryId}`;
      }
    },

    territoryTier: {
      type: String,
      enum: ['center', 'ring', 'edge'],
      required: true
    },

    terrain: {
      type: String,
      enum: ['plains', 'forest', 'hills', 'castle'],
      required: [true, 'Terrain is required']
    },

    // ============================================
    // ARMIES
    // ============================================
    attackerArmy: {
      militia: { type: Number, default: 0, min: 0 },
      spearman: { type: Number, default: 0, min: 0 },
      archer: { type: Number, default: 0, min: 0 },
      cavalry: { type: Number, default: 0, min: 0 }
    },

    defenderArmy: {
      militia: { type: Number, default: 0, min: 0 },
      spearman: { type: Number, default: 0, min: 0 },
      archer: { type: Number, default: 0, min: 0 },
      cavalry: { type: Number, default: 0, min: 0 }
    },

    // ============================================
    // FORMATIONS
    // ============================================
    attackerFormation: {
      type: String,
      enum: ['offensive', 'defensive', 'balanced'],
      default: 'balanced'
    },

    defenderFormation: {
      type: String,
      enum: ['offensive', 'defensive', 'balanced'],
      default: 'defensive'
    },

    // ============================================
    // POWER CALCULATIONS
    // ============================================
    attackerPower: {
      type: Number,
      required: [true, 'Attacker power is required'],
      min: 0
    },

    defenderPower: {
      type: Number,
      required: [true, 'Defender power is required'],
      min: 0
    },

    // Power breakdown (for debugging and transparency)
    powerBreakdown: {
      attacker: {
        basePower: { type: Number },
        counterBonus: { type: Number },
        formationBonus: { type: Number },
        terrainBonus: { type: Number },
        positionBonus: { type: Number },
        finalPower: { type: Number }
      },
      defender: {
        basePower: { type: Number },
        counterBonus: { type: Number },
        formationBonus: { type: Number },
        terrainBonus: { type: Number },
        positionBonus: { type: Number },
        finalPower: { type: Number }
      }
    },

    // ============================================
    // RNG & DETERMINISM
    // ============================================
    rngVariance: {
      type: Number,
      min: 0.9,
      max: 1.1,
      default: 1.0
    },

    rngSeed: {
      type: String,
      required: [true, 'RNG seed is required for deterministic replay']
    },

    // ============================================
    // BATTLE OUTCOME
    // ============================================
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Winner ID is required'],
      index: true
    },

    winnerUsername: {
      type: String,
      default: 'Unknown'
    },

    // ============================================
    // CASUALTIES
    // ============================================
    casualties: {
      attacker: {
        militia: { type: Number, default: 0, min: 0 },
        spearman: { type: Number, default: 0, min: 0 },
        archer: { type: Number, default: 0, min: 0 },
        cavalry: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        percentage: { type: Number, default: 0, min: 0, max: 100 }
      },
      defender: {
        militia: { type: Number, default: 0, min: 0 },
        spearman: { type: Number, default: 0, min: 0 },
        archer: { type: Number, default: 0, min: 0 },
        cavalry: { type: Number, default: 0, min: 0 },
        total: { type: Number, default: 0, min: 0 },
        percentage: { type: Number, default: 0, min: 0, max: 100 }
      }
    },

    // ============================================
    // LOOT & REWARDS
    // ============================================
    loot: {
      gold: { type: Number, default: 0, min: 0 },
      stolenFrom: { type: String, enum: ['defender', 'territory', 'npc'], default: 'defender' }
    },

    vpGained: {
      attacker: { type: Number, default: 0, min: 0 },
      defender: { type: Number, default: 0, min: 0 }
    },

    // War declaration bonus applied
    warBonusApplied: {
      type: Boolean,
      default: false
    },

    // ============================================
    // TERRITORY TRANSFER
    // ============================================
    territoryTransferred: {
      type: Boolean,
      default: false
    },

    previousOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },

    newOwnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },

    // ============================================
    // BATTLE METADATA
    // ============================================
    duration: {
      type: Number, // Battle calculation time in milliseconds
      default: 0
    },

    queuePosition: {
      type: Number,
      default: 1
    },

    queueWaitTime: {
      type: Number, // Time waited in queue (seconds)
      default: 0
    },

    // ============================================
    // STATUS & FLAGS
    // ============================================
    status: {
      type: String,
      enum: ['queued', 'processing', 'completed', 'failed'],
      default: 'completed',
      index: true
    },

    error: {
      type: String,
      default: null
    },

    // Flag for admin review
    flaggedForReview: {
      type: Boolean,
      default: false,
      index: true
    },

    reviewReason: {
      type: String,
      default: null
    },

    // ============================================
    // ROLLBACK TRACKING
    // ============================================
    rolledBack: {
      type: Boolean,
      default: false
    },

    rollbackReason: {
      type: String,
      default: null
    },

    rollbackBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who performed rollback
      default: null
    },

    rollbackAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true, // createdAt and updatedAt
    collection: 'battles'
  }
);

// ============================================
// INDEXES
// ============================================

// Query battles by attacker
BattleSchema.index({ attackerId: 1, createdAt: -1 });

// Query battles by defender
BattleSchema.index({ defenderId: 1, createdAt: -1 });

// Query battles for a territory
BattleSchema.index({ territoryId: 1, createdAt: -1 });

// Query battles for a season
BattleSchema.index({ seasonId: 1, createdAt: -1 });

// Query battles by winner (for stats)
BattleSchema.index({ winnerId: 1, createdAt: -1 });

// Query battles by type
BattleSchema.index({ seasonId: 1, battleType: 1, createdAt: -1 });

// Find flagged battles
BattleSchema.index({ flaggedForReview: 1, createdAt: -1 });

// Find rolled back battles
BattleSchema.index({ rolledBack: 1, createdAt: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Total attackers units before battle
BattleSchema.virtual('attackerTotalUnits').get(function() {
  const a = this.attackerArmy;
  return a.militia + a.spearman + a.archer + a.cavalry;
});

// Total defender units before battle
BattleSchema.virtual('defenderTotalUnits').get(function() {
  const d = this.defenderArmy;
  return d.militia + d.spearman + d.archer + d.cavalry;
});

// Power ratio (attacker / defender)
BattleSchema.virtual('powerRatio').get(function() {
  if (this.defenderPower === 0) return Infinity;
  return (this.attackerPower / this.defenderPower).toFixed(2);
});

// Battle summary text
BattleSchema.virtual('summary').get(function() {
  const winner = this.winnerId.equals(this.attackerId) ? 'Attacker' : 'Defender';
  return `${this.attackerUsername} attacked ${this.defenderUsername} at Territory #${this.territoryId}. ${winner} won.`;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if attacker won
 * @returns {Boolean}
 */
BattleSchema.methods.attackerWon = function() {
  return this.winnerId && this.winnerId.equals(this.attackerId);
};

/**
 * Check if defender won
 * @returns {Boolean}
 */
BattleSchema.methods.defenderWon = function() {
  return this.winnerId && this.defenderId && this.winnerId.equals(this.defenderId);
};

/**
 * Get battle result for a specific user
 * @param {ObjectId} userId
 * @returns {String} 'victory', 'defeat', 'not_involved'
 */
BattleSchema.methods.getResultFor = function(userId) {
  if (this.winnerId.equals(userId)) {
    return 'victory';
  }

  if (this.attackerId.equals(userId) || (this.defenderId && this.defenderId.equals(userId))) {
    return 'defeat';
  }

  return 'not_involved';
};

/**
 * Calculate total gold value lost in this battle
 * @returns {Number}
 */
BattleSchema.methods.getTotalValueLost = function() {
  const { UNIT_STATS } = require('../config/constants');

  const attackerLoss = (
    (this.casualties.attacker.militia * UNIT_STATS.militia.cost) +
    (this.casualties.attacker.spearman * UNIT_STATS.spearman.cost) +
    (this.casualties.attacker.archer * UNIT_STATS.archer.cost) +
    (this.casualties.attacker.cavalry * UNIT_STATS.cavalry.cost)
  );

  const defenderLoss = (
    (this.casualties.defender.militia * UNIT_STATS.militia.cost) +
    (this.casualties.defender.spearman * UNIT_STATS.spearman.cost) +
    (this.casualties.defender.archer * UNIT_STATS.archer.cost) +
    (this.casualties.defender.cavalry * UNIT_STATS.cavalry.cost)
  );

  return attackerLoss + defenderLoss;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get battle history for a user
 * @param {ObjectId} userId
 * @param {Number} limit
 * @returns {Promise<Array<Battle>>}
 */
BattleSchema.statics.getUserBattleHistory = async function(userId, limit = 50) {
  return this.find({
    $or: [
      { attackerId: userId },
      { defenderId: userId }
    ]
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-powerBreakdown -rngSeed'); // Exclude technical details
};

/**
 * Get battles for a territory
 * @param {Number} territoryId
 * @param {ObjectId} seasonId
 * @param {Number} limit
 * @returns {Promise<Array<Battle>>}
 */
BattleSchema.statics.getTerritoryBattleHistory = async function(territoryId, seasonId, limit = 20) {
  return this.find({ territoryId, seasonId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

/**
 * Get user's win/loss record
 * @param {ObjectId} userId
 * @param {ObjectId} seasonId
 * @returns {Promise<Object>} { wins, losses, winRate }
 */
BattleSchema.statics.getUserRecord = async function(userId, seasonId) {
  const battles = await this.find({
    seasonId,
    $or: [
      { attackerId: userId },
      { defenderId: userId }
    ]
  });

  const wins = battles.filter(b => b.winnerId.equals(userId)).length;
  const losses = battles.length - wins;
  const winRate = battles.length > 0 ? ((wins / battles.length) * 100).toFixed(2) : 0;

  return { wins, losses, total: battles.length, winRate };
};

/**
 * Get most contested territories (most battles)
 * @param {ObjectId} seasonId
 * @param {Number} limit
 * @returns {Promise<Array>}
 */
BattleSchema.statics.getMostContestedTerritories = async function(seasonId, limit = 10) {
  return this.aggregate([
    { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
    { $group: { _id: '$territoryId', battleCount: { $sum: 1 } } },
    { $sort: { battleCount: -1 } },
    { $limit: limit }
  ]);
};

/**
 * Get flagged battles for admin review
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Battle>>}
 */
BattleSchema.statics.getFlaggedBattles = async function(seasonId) {
  return this.find({ seasonId, flaggedForReview: true, rolledBack: false })
    .sort({ createdAt: -1 })
    .populate('attackerId', 'username walletAddress')
    .populate('defenderId', 'username walletAddress');
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Make battle records immutable after creation (cannot be modified, only flagged)
BattleSchema.pre('save', function(next) {
  if (!this.isNew && !this.rolledBack) {
    // Allow updates only for flagging or rollback
    const modifiedPaths = this.modifiedPaths();
    const allowedPaths = ['flaggedForReview', 'reviewReason', 'rolledBack', 'rollbackReason', 'rollbackBy', 'rollbackAt'];

    const hasUnallowedChanges = modifiedPaths.some(path => !allowedPaths.includes(path));

    if (hasUnallowedChanges) {
      return next(new Error('Battle records are immutable and cannot be modified'));
    }
  }

  next();
});

// Ensure virtuals are included in JSON
BattleSchema.set('toJSON', { virtuals: true });
BattleSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Battle', BattleSchema);
