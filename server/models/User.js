/**
 * USER MODEL
 * Core player data with optimistic locking for concurrency control
 */

const mongoose = require('mongoose');
const { SUPPLY_CAP } = require('../config/constants');

const UserSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTITY
    // ============================================
    walletAddress: {
      type: String,
      required: [true, 'Wallet address is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum wallet address']
    },

    username: {
      type: String,
      default: function() {
        // Default username: "Player_" + last 6 chars of wallet
        return `Player_${this.walletAddress.slice(-6)}`;
      },
      trim: true,
      maxlength: [20, 'Username cannot exceed 20 characters']
    },

    // ============================================
    // SEASON & TRIBE
    // ============================================
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'Season ID is required'],
      index: true
    },

    tribeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null,
      index: true
    },

    tribeRole: {
      type: String,
      enum: ['chieftain', 'captain', 'warrior', null],
      default: null
    },

    // ============================================
    // RESOURCES
    // ============================================
    gold: {
      type: Number,
      default: 500, // Starting gold
      min: [0, 'Gold cannot be negative'],
      index: true
    },

    goldCapacity: {
      type: Number,
      default: 1000 // Warehouse Lv1 capacity
    },

    // ============================================
    // ARMY
    // ============================================
    army: {
      militia: { type: Number, default: 0, min: 0 },
      spearman: { type: Number, default: 0, min: 0 },
      archer: { type: Number, default: 0, min: 0 },
      cavalry: { type: Number, default: 0, min: 0 }
    },

    // ============================================
    // BUILDINGS
    // ============================================
    buildings: {
      barracks: {
        level: { type: Number, default: 1, min: 1, max: 10 },
        upgrading: { type: Boolean, default: false },
        upgradeEndTime: { type: Date, default: null }
      },
      warehouse: {
        level: { type: Number, default: 1, min: 1, max: 10 },
        upgrading: { type: Boolean, default: false },
        upgradeEndTime: { type: Date, default: null }
      },
      workshop: {
        level: { type: Number, default: 1, min: 1, max: 10 },
        upgrading: { type: Boolean, default: false },
        upgradeEndTime: { type: Date, default: null }
      }
    },

    // ============================================
    // TRAINING QUEUE
    // ============================================
    trainingQueue: [
      {
        unitType: {
          type: String,
          enum: ['militia', 'spearman', 'archer', 'cavalry'],
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        endTime: {
          type: Date,
          required: true
        }
      }
    ],

    // ============================================
    // VICTORY POINTS
    // ============================================
    victoryPoints: {
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
    // ANTI-CHEAT DATA
    // ============================================
    walletAge: {
      type: Date,
      default: null // First transaction date of wallet (set during registration)
    },

    transactionCount: {
      type: Number,
      default: 0 // Total on-chain transactions (set during registration)
    },

    behaviorScore: {
      type: Number,
      default: 100, // Starts at 100, decreases with suspicious behavior
      min: 0,
      max: 100
    },

    // ============================================
    // ACTIVITY TRACKING
    // ============================================
    lastActive: {
      type: Date,
      default: Date.now,
      index: true
    },

    totalLogins: {
      type: Number,
      default: 0
    },

    totalBattles: {
      type: Number,
      default: 0
    },

    totalBattlesWon: {
      type: Number,
      default: 0
    },

    // ============================================
    // OPTIMISTIC LOCKING (CRITICAL for concurrency)
    // ============================================
    version: {
      type: Number,
      default: 0
    },

    // ============================================
    // SHIELDS
    // ============================================
    shieldAvailable: {
      type: Date,
      default: Date.now, // When personal shield becomes available again
      index: true
    }
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'users'
  }
);

// ============================================
// INDEXES (for performance)
// ============================================

// Compound index for leaderboard queries
UserSchema.index({ seasonId: 1, victoryPoints: -1 });

// Index for tribe member queries
UserSchema.index({ tribeId: 1, seasonId: 1 });

// Index for activity tracking
UserSchema.index({ seasonId: 1, lastActive: -1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Total army size
UserSchema.virtual('totalArmy').get(function() {
  return (
    this.army.militia +
    this.army.spearman +
    this.army.archer +
    this.army.cavalry
  );
});

// Total building levels (for supply cap calculation)
UserSchema.virtual('totalBuildingLevels').get(function() {
  return (
    this.buildings.barracks.level +
    this.buildings.warehouse.level +
    this.buildings.workshop.level
  );
});

// Current supply cap
UserSchema.virtual('supplyCap').get(function() {
  return SUPPLY_CAP.base + (this.totalBuildingLevels * SUPPLY_CAP.perBuildingLevel);
});

// Win rate percentage
UserSchema.virtual('winRate').get(function() {
  if (this.totalBattles === 0) return 0;
  return ((this.totalBattlesWon / this.totalBattles) * 100).toFixed(2);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Check if user can train more units (supply cap check)
 * @param {Number} quantity - number of units to train
 * @returns {Boolean}
 */
UserSchema.methods.canTrainUnits = function(quantity) {
  return (this.totalArmy + quantity) <= this.supplyCap;
};

/**
 * Check if building can be upgraded
 * @param {String} buildingType - 'barracks', 'warehouse', 'workshop'
 * @returns {Object} { canUpgrade: Boolean, reason: String }
 */
UserSchema.methods.canUpgradeBuilding = function(buildingType) {
  const building = this.buildings[buildingType];

  if (!building) {
    return { canUpgrade: false, reason: 'Invalid building type' };
  }

  if (building.level >= 10) {
    return { canUpgrade: false, reason: 'Building is already max level' };
  }

  if (building.upgrading) {
    return { canUpgrade: false, reason: 'Building is already upgrading' };
  }

  // Check if ANY building is currently upgrading (can only upgrade 1 at a time)
  const anyUpgrading = Object.values(this.buildings).some(b => b.upgrading);
  if (anyUpgrading) {
    return { canUpgrade: false, reason: 'Another building is already upgrading' };
  }

  return { canUpgrade: true };
};

/**
 * Get army value in gold (total cost of all units)
 * @returns {Number}
 */
UserSchema.methods.getArmyValue = function() {
  const { UNIT_STATS } = require('../config/constants');
  return (
    (this.army.militia * UNIT_STATS.militia.cost) +
    (this.army.spearman * UNIT_STATS.spearman.cost) +
    (this.army.archer * UNIT_STATS.archer.cost) +
    (this.army.cavalry * UNIT_STATS.cavalry.cost)
  );
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Find user by wallet address (case-insensitive)
 * @param {String} walletAddress
 * @returns {Promise<User>}
 */
UserSchema.statics.findByWallet = async function(walletAddress) {
  return this.findOne({ walletAddress: walletAddress.toLowerCase() });
};

/**
 * Get top players by VP for a season
 * @param {ObjectId} seasonId
 * @param {Number} limit - default 100
 * @returns {Promise<Array<User>>}
 */
UserSchema.statics.getTopPlayers = async function(seasonId, limit = 100) {
  return this.find({ seasonId })
    .sort({ victoryPoints: -1 })
    .limit(limit)
    .select('username walletAddress victoryPoints totalBattles winRate tribeId')
    .populate('tribeId', 'name tag');
};

/**
 * Deduct gold with optimistic locking (CRITICAL for concurrency)
 * @param {ObjectId} userId
 * @param {Number} amount
 * @param {Number} currentVersion - version from read
 * @returns {Promise<Object>} { success: Boolean, user: User, error: String }
 */
UserSchema.statics.deductGoldSafe = async function(userId, amount, currentVersion) {
  const result = await this.updateOne(
    {
      _id: userId,
      gold: { $gte: amount },
      version: currentVersion // Optimistic locking check
    },
    {
      $inc: { gold: -amount, version: 1 }
    }
  );

  if (result.modifiedCount === 0) {
    // Either insufficient gold or version mismatch (concurrent update)
    const user = await this.findById(userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }
    if (user.gold < amount) {
      return { success: false, error: 'Insufficient gold' };
    }
    return { success: false, error: 'Concurrent update detected, retry required' };
  }

  const user = await this.findById(userId);
  return { success: true, user };
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Update lastActive on any save
UserSchema.pre('save', function(next) {
  this.lastActive = new Date();
  next();
});

// Ensure virtuals are included in JSON responses
UserSchema.set('toJSON', { virtuals: true });
UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', UserSchema);
