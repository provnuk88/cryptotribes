/**
 * SEASON MODEL
 * 10-day competitive periods with prize pools and events
 */

const mongoose = require('mongoose');
const { SEASON_SETTINGS } = require('../config/constants');

const SeasonSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTITY
    // ============================================
    seasonNumber: {
      type: Number,
      required: [true, 'Season number is required'],
      unique: true,
      min: 1,
      index: true
    },

    name: {
      type: String,
      default: function() {
        return `Season ${this.seasonNumber}`;
      }
    },

    // ============================================
    // TIMING
    // ============================================
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
      index: true
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required'],
      index: true
    },

    duration: {
      type: Number,
      default: SEASON_SETTINGS.durationDays, // 10 days
      min: 1
    },

    startHourUTC: {
      type: Number,
      default: SEASON_SETTINGS.startHourUTC, // 16:00 UTC
      min: 0,
      max: 23
    },

    // ============================================
    // STATUS
    // ============================================
    status: {
      type: String,
      enum: ['upcoming', 'registration', 'active', 'completed', 'cancelled'],
      default: 'upcoming',
      index: true
    },

    // Registration period (7 days before start)
    registrationStartDate: {
      type: Date,
      default: function() {
        return new Date(this.startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      }
    },

    registrationEndDate: {
      type: Date,
      default: function() {
        return this.startDate;
      }
    },

    // ============================================
    // PARTICIPANTS
    // ============================================
    playerCount: {
      type: Number,
      default: 0,
      min: 0
    },

    targetPlayerCount: {
      type: Number,
      default: 300, // Expected for Season 1
      min: 100
    },

    tribeCount: {
      type: Number,
      default: 0,
      min: 0
    },

    registeredPlayers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        registeredAt: {
          type: Date,
          default: Date.now
        },
        paymentStatus: {
          type: String,
          enum: ['pending', 'paid', 'refunded'],
          default: 'pending'
        }
      }
    ],

    // ============================================
    // PRIZE POOL
    // ============================================
    entryFeeDollars: {
      type: Number,
      default: SEASON_SETTINGS.entryFeeDollars, // $25
      min: 0
    },

    totalRevenue: {
      type: Number,
      default: 0, // playerCount × entryFee
      min: 0
    },

    prizePoolPercentage: {
      type: Number,
      default: SEASON_SETTINGS.prizePoolPercentage, // 85%
      min: 0,
      max: 100
    },

    prizePool: {
      type: Number,
      default: 0, // totalRevenue × prizePoolPercentage
      min: 0
    },

    rakePercentage: {
      type: Number,
      default: SEASON_SETTINGS.rakePercentage, // 15%
      min: 0,
      max: 100
    },

    rake: {
      type: Number,
      default: 0, // totalRevenue × rakePercentage
      min: 0
    },

    // Prize distribution (calculated after season ends)
    prizeDistribution: {
      tribal: {
        firstPlace: { type: Number, default: 0 },
        secondPlace: { type: Number, default: 0 },
        thirdPlace: { type: Number, default: 0 },
        fourthPlace: { type: Number, default: 0 },
        fifthPlace: { type: Number, default: 0 }
      },
      individual: {
        total: { type: Number, default: 0 },
        categories: [
          {
            name: String, // 'War Hero', 'Empire Builder', etc.
            firstPlace: { type: Number, default: 0 },
            secondPlace: { type: Number, default: 0 },
            thirdPlace: { type: Number, default: 0 }
          }
        ]
      },
      participation: {
        total: { type: Number, default: 0 },
        perPlayer: { type: Number, default: 0 }
      }
    },

    // ============================================
    // LEADERBOARD
    // ============================================
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },

    topTribes: [
      {
        rank: { type: Number, min: 1, max: 5 },
        tribeId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tribe'
        },
        tribeName: String,
        totalVP: { type: Number, default: 0 },
        prizeAmount: { type: Number, default: 0 }
      }
    ],

    leaderboardFrozenAt: {
      type: Date,
      default: null
    },

    // ============================================
    // ADAPTIVE MAP CONFIGURATION
    // ============================================
    adaptiveRingConfig: {
      centerCount: {
        type: Number,
        default: 5 // Always 5 center territories
      },
      innerRingCount: {
        type: Number,
        default: 15 // Scales with player count
      },
      outerRingCount: {
        type: Number,
        default: 30
      },
      edgeRingCount: {
        type: Number,
        default: 0 // Optional 4th ring for 800+ players
      },
      totalTerritories: {
        type: Number,
        default: 50
      },
      scalingFactor: {
        type: Number,
        default: 1.0 // players / 20
      }
    },

    // Preset chosen (Casual/Competitive/Hardcore)
    difficultyPreset: {
      type: String,
      enum: ['casual', 'competitive', 'hardcore', 'custom'],
      default: 'competitive'
    },

    // ============================================
    // SEASON EVENTS
    // ============================================
    events: [
      {
        day: {
          type: Number,
          min: 1,
          max: 10,
          required: true
        },
        name: {
          type: String,
          required: true
        },
        description: {
          type: String,
          default: ''
        },
        active: {
          type: Boolean,
          default: false
        },
        startTime: {
          type: Date,
          default: null
        },
        endTime: {
          type: Date,
          default: null
        },
        effects: {
          type: mongoose.Schema.Types.Mixed, // Flexible object for event-specific data
          default: {}
        }
      }
    ],

    // ============================================
    // STATISTICS
    // ============================================
    stats: {
      totalBattles: { type: Number, default: 0 },
      totalTerritoriesCaptured: { type: Number, default: 0 },
      totalGoldGenerated: { type: Number, default: 0 },
      totalVPGenerated: { type: Number, default: 0 },
      averageBattlesPerPlayer: { type: Number, default: 0 },
      mostActivePlayer: {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        battleCount: { type: Number, default: 0 }
      },
      mostContestedTerritory: {
        territoryId: { type: Number },
        battleCount: { type: Number, default: 0 }
      }
    },

    // ============================================
    // ADMIN METADATA
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin who created this season
      default: null
    },

    notes: {
      type: String,
      default: '',
      maxlength: 1000
    },

    // ============================================
    // PAYMENTS
    // ============================================
    prizesDistributed: {
      type: Boolean,
      default: false
    },

    prizeDistributionDate: {
      type: Date,
      default: null
    },

    // ============================================
    // FLAGS
    // ============================================
    isActive: {
      type: Boolean,
      default: false,
      index: true
    }
  },
  {
    timestamps: true,
    collection: 'seasons'
  }
);

// ============================================
// INDEXES
// ============================================

// Query current/active season
SeasonSchema.index({ status: 1, isActive: 1 });

// Query by start date
SeasonSchema.index({ startDate: -1 });

// Query by season number
SeasonSchema.index({ seasonNumber: 1 }, { unique: true });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Is season currently running
SeasonSchema.virtual('isRunning').get(function() {
  const now = new Date();
  return this.status === 'active' && now >= this.startDate && now <= this.endDate;
});

// Is registration open
SeasonSchema.virtual('registrationOpen').get(function() {
  const now = new Date();
  return (
    this.status === 'registration' &&
    now >= this.registrationStartDate &&
    now < this.registrationEndDate
  );
});

// Days remaining
SeasonSchema.virtual('daysRemaining').get(function() {
  if (!this.isRunning) return 0;
  const now = new Date();
  const remaining = this.endDate - now;
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
});

// Registration percentage
SeasonSchema.virtual('registrationPercentage').get(function() {
  if (this.targetPlayerCount === 0) return 0;
  return ((this.playerCount / this.targetPlayerCount) * 100).toFixed(2);
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Calculate prize pool from registered players
 */
SeasonSchema.methods.calculatePrizePool = function() {
  this.totalRevenue = this.playerCount * this.entryFeeDollars;
  this.prizePool = (this.totalRevenue * this.prizePoolPercentage) / 100;
  this.rake = (this.totalRevenue * this.rakePercentage) / 100;

  // Calculate tribal prize distribution (60% of prize pool)
  const tribalPool = this.prizePool * 0.60;
  this.prizeDistribution.tribal = {
    firstPlace: tribalPool * 0.55, // 55% of tribal pool
    secondPlace: tribalPool * 0.24, // 24%
    thirdPlace: tribalPool * 0.14, // 14%
    fourthPlace: tribalPool * 0.05, // 5%
    fifthPlace: tribalPool * 0.02  // 2%
  };

  // Individual prizes (30% of prize pool)
  const individualPool = this.prizePool * 0.30;
  this.prizeDistribution.individual.total = individualPool;

  // Participation rewards (10% of prize pool)
  const participationPool = this.prizePool * 0.10;
  this.prizeDistribution.participation.total = participationPool;
  this.prizeDistribution.participation.perPlayer = participationPool / (this.playerCount * 0.5); // Assuming 50% complete
};

/**
 * Start the season (change status to active)
 * @returns {Object} { success: Boolean, error: String }
 */
SeasonSchema.methods.startSeason = function() {
  if (this.status !== 'registration') {
    return { success: false, error: 'Season must be in registration status to start' };
  }

  if (this.playerCount < 100) {
    return { success: false, error: 'Minimum 100 players required to start season' };
  }

  this.status = 'active';
  this.isActive = true;
  this.startDate = new Date();
  this.endDate = new Date(this.startDate.getTime() + this.duration * 24 * 60 * 60 * 1000);

  // Initialize events with timestamps
  this.events = SEASON_SETTINGS.events.map(event => ({
    day: event.day,
    name: event.name,
    description: event.description || '',
    active: false,
    startTime: new Date(this.startDate.getTime() + (event.day - 1) * 24 * 60 * 60 * 1000),
    endTime: new Date(this.startDate.getTime() + event.day * 24 * 60 * 60 * 1000),
    effects: event
  }));

  this.calculatePrizePool();

  return { success: true };
};

/**
 * End the season (finalize leaderboard)
 * @returns {Object} { success: Boolean, error: String }
 */
SeasonSchema.methods.endSeason = async function() {
  if (this.status !== 'active') {
    return { success: false, error: 'Season must be active to end' };
  }

  this.status = 'completed';
  this.isActive = false;
  this.leaderboardFrozenAt = new Date();

  // Fetch top 5 tribes (will be populated by season service)
  // This is a placeholder - actual implementation in season.service.js

  return { success: true };
};

/**
 * Register player for season
 * @param {ObjectId} userId
 * @param {String} paymentStatus
 * @returns {Object} { success: Boolean, error: String }
 */
SeasonSchema.methods.registerPlayer = function(userId, paymentStatus = 'pending') {
  if (!this.registrationOpen) {
    return { success: false, error: 'Registration is not open' };
  }

  // Check if already registered
  const alreadyRegistered = this.registeredPlayers.some(p => p.userId.equals(userId));
  if (alreadyRegistered) {
    return { success: false, error: 'Player already registered' };
  }

  this.registeredPlayers.push({
    userId,
    registeredAt: new Date(),
    paymentStatus
  });

  this.playerCount += 1;
  this.calculatePrizePool();

  return { success: true };
};

/**
 * Get active event for current day
 * @returns {Object|null} Active event or null
 */
SeasonSchema.methods.getCurrentEvent = function() {
  if (!this.isRunning) return null;

  const now = new Date();
  const activeEvent = this.events.find(event =>
    event.startTime <= now && event.endTime > now
  );

  return activeEvent || null;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get current active season
 * @returns {Promise<Season|null>}
 */
SeasonSchema.statics.getCurrentSeason = async function() {
  return this.findOne({ status: 'active', isActive: true });
};

/**
 * Get upcoming season
 * @returns {Promise<Season|null>}
 */
SeasonSchema.statics.getUpcomingSeason = async function() {
  return this.findOne({ status: 'upcoming' }).sort({ startDate: 1 });
};

/**
 * Get latest completed season
 * @returns {Promise<Season|null>}
 */
SeasonSchema.statics.getLatestCompletedSeason = async function() {
  return this.findOne({ status: 'completed' }).sort({ endDate: -1 });
};

/**
 * Get season by number
 * @param {Number} seasonNumber
 * @returns {Promise<Season|null>}
 */
SeasonSchema.statics.getByNumber = async function(seasonNumber) {
  return this.findOne({ seasonNumber });
};

/**
 * Create new season
 * @param {Object} data - season data
 * @returns {Promise<Season>}
 */
SeasonSchema.statics.createNewSeason = async function(data) {
  // Get latest season number
  const latestSeason = await this.findOne().sort({ seasonNumber: -1 });
  const seasonNumber = latestSeason ? latestSeason.seasonNumber + 1 : 1;

  const season = new this({
    seasonNumber,
    ...data,
    status: 'upcoming'
  });

  return season.save();
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Calculate derived fields before saving
SeasonSchema.pre('save', function(next) {
  // Ensure only one season is active
  if (this.isActive && this.isModified('isActive')) {
    this.constructor.updateMany(
      { _id: { $ne: this._id }, isActive: true },
      { isActive: false }
    ).exec();
  }

  // Calculate end date if not set
  if (!this.endDate && this.startDate && this.duration) {
    this.endDate = new Date(
      this.startDate.getTime() + this.duration * 24 * 60 * 60 * 1000
    );
  }

  next();
});

// Ensure virtuals are included in JSON
SeasonSchema.set('toJSON', { virtuals: true });
SeasonSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Season', SeasonSchema);
