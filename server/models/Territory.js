/**
 * TERRITORY MODEL
 * 50 map tiles with ownership, garrisons, NPC defenders, and resource generation
 */

const mongoose = require('mongoose');
const { TERRITORY_TIERS } = require('../config/constants');

const TerritorySchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTITY
    // ============================================
    territoryId: {
      type: Number,
      required: [true, 'Territory ID is required'],
      min: 1,
      max: 50,
      index: true
    },

    name: {
      type: String,
      default: function() {
        return `Territory #${this.territoryId}`;
      }
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
    // CLASSIFICATION
    // ============================================
    tier: {
      type: String,
      enum: ['center', 'ring', 'edge'],
      required: [true, 'Territory tier is required'],
      index: true
    },

    terrain: {
      type: String,
      enum: ['plains', 'forest', 'hills', 'castle'],
      required: [true, 'Terrain type is required'],
      index: true
    },

    // ============================================
    // OWNERSHIP
    // ============================================
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null,
      index: true
    },

    capturedAt: {
      type: Date,
      default: null
    },

    captureHistory: [
      {
        tribeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tribe'
        },
        tribeName: String,
        capturedAt: {
          type: Date,
          default: Date.now
        },
        lostAt: {
          type: Date,
          default: null
        }
      }
    ],

    // ============================================
    // GARRISON (Player Defense)
    // ============================================
    garrison: {
      tribeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tribe',
        default: null
      },
      units: {
        militia: { type: Number, default: 0, min: 0 },
        spearman: { type: Number, default: 0, min: 0 },
        archer: { type: Number, default: 0, min: 0 },
        cavalry: { type: Number, default: 0, min: 0 }
      },
      formation: {
        type: String,
        enum: ['offensive', 'defensive', 'balanced'],
        default: 'balanced'
      },
      lastUpdated: {
        type: Date,
        default: Date.now
      }
    },

    // Track individual player contributions to garrison
    garrisonContributors: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        units: {
          militia: { type: Number, default: 0, min: 0 },
          spearman: { type: Number, default: 0, min: 0 },
          archer: { type: Number, default: 0, min: 0 },
          cavalry: { type: Number, default: 0, min: 0 }
        },
        addedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================
    // NPC GARRISON (Initial Defense)
    // ============================================
    npcGarrison: {
      difficulty: {
        type: String,
        enum: ['weak', 'strong', 'elite'],
        default: null
      },
      units: {
        militia: { type: Number, default: 0 },
        spearman: { type: Number, default: 0 },
        archer: { type: Number, default: 0 },
        cavalry: { type: Number, default: 0 }
      },
      active: {
        type: Boolean,
        default: true
      }
    },

    // ============================================
    // RESOURCE GENERATION
    // ============================================
    goldPerHour: {
      type: Number,
      required: [true, 'Gold per hour is required'],
      min: 0
    },

    vpPerHour: {
      type: Number,
      required: [true, 'VP per hour is required'],
      min: 0
    },

    upkeepPerHour: {
      type: Number,
      default: 20 // Base upkeep cost
    },

    // ============================================
    // SHIELD
    // ============================================
    shieldActive: {
      type: Boolean,
      default: false
    },

    shieldUntil: {
      type: Date,
      default: null,
      index: true
    },

    shieldedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    // ============================================
    // MAP POSITION
    // ============================================
    position: {
      x: {
        type: Number,
        required: [true, 'X coordinate is required']
      },
      y: {
        type: Number,
        required: [true, 'Y coordinate is required']
      }
    },

    // Adjacent territory IDs (for pathfinding/visualization)
    adjacentTerritories: [
      {
        type: Number,
        min: 1,
        max: 50
      }
    ],

    // ============================================
    // STATISTICS
    // ============================================
    stats: {
      totalBattles: { type: Number, default: 0 },
      successfulDefenses: { type: Number, default: 0 },
      timesLost: { type: Number, default: 0 },
      totalGoldGenerated: { type: Number, default: 0 },
      totalVPGenerated: { type: Number, default: 0 }
    },

    // ============================================
    // STATUS
    // ============================================
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'territories'
  }
);

// ============================================
// INDEXES
// ============================================

// Unique territory per season
TerritorySchema.index({ territoryId: 1, seasonId: 1 }, { unique: true });

// Query territories by owner
TerritorySchema.index({ ownerId: 1, seasonId: 1 });

// Query by tier
TerritorySchema.index({ seasonId: 1, tier: 1 });

// Find shielded territories
TerritorySchema.index({ seasonId: 1, shieldActive: 1, shieldUntil: 1 });

// Find available (uncaptured) territories
TerritorySchema.index({ seasonId: 1, ownerId: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Is territory captured
TerritorySchema.virtual('isCaptured').get(function() {
  return this.ownerId !== null;
});

// Has active NPC defense
TerritorySchema.virtual('hasNPCDefense').get(function() {
  return this.npcGarrison && this.npcGarrison.active;
});

// Total garrison units
TerritorySchema.virtual('totalGarrisonUnits').get(function() {
  if (this.hasNPCDefense) {
    const npc = this.npcGarrison.units;
    return npc.militia + npc.spearman + npc.archer + npc.cavalry;
  }

  const g = this.garrison.units;
  return g.militia + g.spearman + g.archer + g.cavalry;
});

// Is currently shielded
TerritorySchema.virtual('isShielded').get(function() {
  return this.shieldActive && this.shieldUntil && this.shieldUntil > new Date();
});

// Net gold generation (after upkeep)
TerritorySchema.virtual('netGoldPerHour').get(function() {
  return this.goldPerHour - this.upkeepPerHour;
});

// Territory value score (for AI/strategy)
TerritorySchema.virtual('valueScore').get(function() {
  // Simple heuristic: VP is worth 2x gold
  return this.vpPerHour * 2 + this.goldPerHour;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Transfer ownership to new tribe
 * @param {ObjectId} newOwnerId - new tribe ID
 * @returns {Object} { success: Boolean }
 */
TerritorySchema.methods.transferOwnership = function(newOwnerId) {
  // Record capture history
  if (this.ownerId) {
    const currentCapture = this.captureHistory.find(
      h => h.tribeId.equals(this.ownerId) && !h.lostAt
    );
    if (currentCapture) {
      currentCapture.lostAt = new Date();
    }
  }

  // Set new owner
  this.ownerId = newOwnerId;
  this.capturedAt = new Date();

  // Clear NPC garrison
  if (this.npcGarrison) {
    this.npcGarrison.active = false;
  }

  // Reset garrison to empty (new owner must garrison)
  this.garrison = {
    tribeId: newOwnerId,
    units: { militia: 0, spearman: 0, archer: 0, cavalry: 0 },
    formation: 'balanced',
    lastUpdated: new Date()
  };

  this.garrisonContributors = [];

  return { success: true };
};

/**
 * Add units to garrison
 * @param {ObjectId} userId - player contributing units
 * @param {Object} units - { militia, spearman, archer, cavalry }
 * @returns {Object} { success: Boolean, error: String }
 */
TerritorySchema.methods.addToGarrison = function(userId, units) {
  if (!this.isCaptured) {
    return { success: false, error: 'Cannot garrison uncaptured territory' };
  }

  // Update total garrison
  this.garrison.units.militia += units.militia || 0;
  this.garrison.units.spearman += units.spearman || 0;
  this.garrison.units.archer += units.archer || 0;
  this.garrison.units.cavalry += units.cavalry || 0;
  this.garrison.lastUpdated = new Date();

  // Track individual contribution
  let contributor = this.garrisonContributors.find(c => c.userId.equals(userId));

  if (contributor) {
    contributor.units.militia += units.militia || 0;
    contributor.units.spearman += units.spearman || 0;
    contributor.units.archer += units.archer || 0;
    contributor.units.cavalry += units.cavalry || 0;
  } else {
    this.garrisonContributors.push({
      userId,
      units: {
        militia: units.militia || 0,
        spearman: units.spearman || 0,
        archer: units.archer || 0,
        cavalry: units.cavalry || 0
      },
      addedAt: new Date()
    });
  }

  return { success: true };
};

/**
 * Remove units from garrison
 * @param {ObjectId} userId - player withdrawing units
 * @param {Object} units - units to withdraw
 * @returns {Object} { success: Boolean, error: String }
 */
TerritorySchema.methods.removeFromGarrison = function(userId, units) {
  const contributor = this.garrisonContributors.find(c => c.userId.equals(userId));

  if (!contributor) {
    return { success: false, error: 'No units garrisoned by this player' };
  }

  // Check if user has enough units
  const hasEnough = (
    contributor.units.militia >= (units.militia || 0) &&
    contributor.units.spearman >= (units.spearman || 0) &&
    contributor.units.archer >= (units.archer || 0) &&
    contributor.units.cavalry >= (units.cavalry || 0)
  );

  if (!hasEnough) {
    return { success: false, error: 'Insufficient units garrisoned' };
  }

  // Remove from contributor
  contributor.units.militia -= units.militia || 0;
  contributor.units.spearman -= units.spearman || 0;
  contributor.units.archer -= units.archer || 0;
  contributor.units.cavalry -= units.cavalry || 0;

  // Remove from total garrison
  this.garrison.units.militia -= units.militia || 0;
  this.garrison.units.spearman -= units.spearman || 0;
  this.garrison.units.archer -= units.archer || 0;
  this.garrison.units.cavalry -= units.cavalry || 0;
  this.garrison.lastUpdated = new Date();

  // Remove contributor if no units left
  const contributorTotalUnits = (
    contributor.units.militia +
    contributor.units.spearman +
    contributor.units.archer +
    contributor.units.cavalry
  );

  if (contributorTotalUnits === 0) {
    this.garrisonContributors = this.garrisonContributors.filter(
      c => !c.userId.equals(userId)
    );
  }

  return { success: true };
};

/**
 * Activate shield on this territory
 * @param {ObjectId} userId - player activating shield
 * @param {Number} durationSeconds
 * @returns {Object} { success: Boolean, error: String }
 */
TerritorySchema.methods.activateShield = function(userId, durationSeconds = 4 * 3600) {
  if (this.isShielded) {
    return { success: false, error: 'Territory already shielded' };
  }

  this.shieldActive = true;
  this.shieldUntil = new Date(Date.now() + durationSeconds * 1000);
  this.shieldedBy = userId;

  return { success: true, expiresAt: this.shieldUntil };
};

/**
 * Calculate proportional rewards for garrison contributors
 * @param {Number} totalGold - total gold to distribute
 * @param {Number} totalVP - total VP to distribute
 * @returns {Array} rewards per contributor [{ userId, gold, vp }]
 */
TerritorySchema.methods.calculateGarrisonRewards = function(totalGold, totalVP) {
  if (this.garrisonContributors.length === 0) {
    return [];
  }

  const totalGarrison = this.totalGarrisonUnits;

  if (totalGarrison === 0) {
    return [];
  }

  const rewards = this.garrisonContributors.map(contributor => {
    const contributorUnits = (
      contributor.units.militia +
      contributor.units.spearman +
      contributor.units.archer +
      contributor.units.cavalry
    );

    const proportion = contributorUnits / totalGarrison;

    return {
      userId: contributor.userId,
      gold: Math.floor(totalGold * proportion),
      vp: Math.floor(totalVP * proportion),
      proportion: (proportion * 100).toFixed(2) // percentage
    };
  });

  return rewards;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get all territories controlled by a tribe
 * @param {ObjectId} tribeId
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Territory>>}
 */
TerritorySchema.statics.findByOwner = async function(tribeId, seasonId) {
  return this.find({ ownerId: tribeId, seasonId, isActive: true })
    .sort({ vpPerHour: -1 });
};

/**
 * Get all uncaptured territories
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Territory>>}
 */
TerritorySchema.statics.findUncaptured = async function(seasonId) {
  return this.find({ seasonId, ownerId: null, isActive: true })
    .sort({ tier: 1, vpPerHour: -1 });
};

/**
 * Get territories by tier
 * @param {String} tier - 'center', 'ring', 'edge'
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Territory>>}
 */
TerritorySchema.statics.findByTier = async function(tier, seasonId) {
  return this.find({ tier, seasonId, isActive: true })
    .sort({ territoryId: 1 });
};

/**
 * Get center territories (most valuable)
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Territory>>}
 */
TerritorySchema.statics.getCenterTerritories = async function(seasonId) {
  return this.findByTier('center', seasonId);
};

/**
 * Find territory by ID and season
 * @param {Number} territoryId
 * @param {ObjectId} seasonId
 * @returns {Promise<Territory>}
 */
TerritorySchema.statics.findByTerritoryId = async function(territoryId, seasonId) {
  return this.findOne({ territoryId, seasonId });
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Update shield status based on time
TerritorySchema.pre('save', function(next) {
  if (this.shieldUntil && this.shieldUntil < new Date()) {
    this.shieldActive = false;
    this.shieldedBy = null;
  }
  next();
});

// Ensure virtuals are included in JSON
TerritorySchema.set('toJSON', { virtuals: true });
TerritorySchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Territory', TerritorySchema);
