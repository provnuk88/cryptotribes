/**
 * BEHAVIORAL FLAG MODEL
 * Anti-cheat system for detecting suspicious player behavior patterns
 */

const mongoose = require('mongoose');

const BehavioralFlagSchema = new mongoose.Schema(
  {
    // ============================================
    // IDENTITY
    // ============================================
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true
    },

    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      required: [true, 'Season ID is required'],
      index: true
    },

    // ============================================
    // FLAG CLASSIFICATION
    // ============================================
    flagType: {
      type: String,
      enum: [
        // Multi-account detection
        'multi_account_suspected',
        'shared_ip',
        'duplicate_device',

        // Bot detection
        'bot_behavior',
        'suspicious_timing',
        'impossible_actions',
        'velocity_abuse',

        // Collusion
        'win_trading',
        'coordinated_attacks',
        'resource_funneling',

        // Payment fraud
        'payment_fraud',
        'chargeback_pattern',

        // Other
        'manual_report',
        'suspicious_pattern'
      ],
      required: [true, 'Flag type is required'],
      index: true
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
      required: true,
      index: true
    },

    // ============================================
    // BEHAVIORAL DATA TRACKING
    // ============================================
    loginTimes: [
      {
        timestamp: {
          type: Date,
          default: Date.now
        },
        ipAddress: {
          type: String,
          default: null
        },
        location: {
          country: String,
          city: String
        }
      }
    ],

    ipAddresses: [
      {
        ip: {
          type: String,
          required: true
        },
        firstSeen: {
          type: Date,
          default: Date.now
        },
        lastSeen: {
          type: Date,
          default: Date.now
        },
        usageCount: {
          type: Number,
          default: 1
        },
        location: {
          country: String,
          city: String,
          isp: String
        }
      }
    ],

    browserFingerprints: [
      {
        fingerprint: {
          type: String,
          required: true
        },
        firstSeen: {
          type: Date,
          default: Date.now
        },
        lastSeen: {
          type: Date,
          default: Date.now
        },
        usageCount: {
          type: Number,
          default: 1
        }
      }
    ],

    // Action timing analysis (for bot detection)
    actionTimestamps: [
      {
        action: {
          type: String,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        timeSincePrevious: {
          type: Number, // milliseconds
          default: null
        }
      }
    ],

    deviceInfo: [
      {
        userAgent: String,
        screenResolution: String,
        timezone: String,
        language: String,
        platform: String,
        firstSeen: {
          type: Date,
          default: Date.now
        },
        lastSeen: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================
    // SUSPICIOUS PATTERNS
    // ============================================
    suspiciousPatterns: [
      {
        patternType: {
          type: String,
          required: true
        },
        description: {
          type: String,
          required: true
        },
        detectedAt: {
          type: Date,
          default: Date.now
        },
        confidence: {
          type: Number,
          min: 0,
          max: 100,
          default: 50
        },
        affectedCount: {
          type: Number,
          default: 1
        },
        relatedUserIds: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
          }
        ],
        evidence: {
          type: mongoose.Schema.Types.Mixed,
          default: {}
        }
      }
    ],

    // ============================================
    // LINKED ACCOUNTS
    // ============================================
    similarUsers: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true
        },
        username: {
          type: String,
          default: 'Unknown'
        },
        similarityScore: {
          type: Number,
          min: 0,
          max: 100,
          required: true
        },
        sharedAttributes: [
          {
            type: String,
            enum: [
              'same_ip',
              'same_device',
              'similar_login_times',
              'coordinated_battles',
              'resource_transfer',
              'same_payment_method',
              'identical_behavior_pattern'
            ]
          }
        ],
        detectedAt: {
          type: Date,
          default: Date.now
        },
        confirmedLink: {
          type: Boolean,
          default: false
        }
      }
    ],

    // ============================================
    // DETECTION METADATA
    // ============================================
    autoFlagged: {
      type: Boolean,
      default: true
    },

    confidenceScore: {
      type: Number,
      min: 0,
      max: 100,
      default: 50
    },

    detectionMethod: {
      type: String,
      default: 'automatic'
    },

    detectionDetails: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // ============================================
    // REVIEW WORKFLOW
    // ============================================
    reviewStatus: {
      type: String,
      enum: [
        'pending',
        'under_review',
        'investigating',
        'cleared',
        'confirmed_cheating',
        'banned',
        'false_positive'
      ],
      default: 'pending',
      index: true
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    reviewedAt: {
      type: Date,
      default: null
    },

    reviewNotes: {
      type: String,
      default: '',
      maxlength: 2000
    },

    actionTaken: {
      type: String,
      enum: [
        'none',
        'warning_issued',
        'temp_ban_24h',
        'temp_ban_7d',
        'permanent_ban',
        'prize_revocation',
        'account_restriction',
        'monitoring'
      ],
      default: 'none'
    },

    // ============================================
    // RESOLUTION
    // ============================================
    resolved: {
      type: Boolean,
      default: false,
      index: true
    },

    resolvedAt: {
      type: Date,
      default: null
    },

    falsePositive: {
      type: Boolean,
      default: false
    },

    // ============================================
    // ESCALATION
    // ============================================
    escalated: {
      type: Boolean,
      default: false
    },

    escalatedAt: {
      type: Date,
      default: null
    },

    escalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    escalationReason: {
      type: String,
      default: null
    },

    // ============================================
    // EVIDENCE & ATTACHMENTS
    // ============================================
    evidenceUrls: [
      {
        type: String,
        maxlength: 500
      }
    ],

    screenshots: [
      {
        url: String,
        description: String,
        uploadedAt: {
          type: Date,
          default: Date.now
        }
      }
    ],

    // ============================================
    // STATISTICS
    // ============================================
    stats: {
      totalActionsTracked: { type: Number, default: 0 },
      uniqueIPs: { type: Number, default: 0 },
      uniqueDevices: { type: Number, default: 0 },
      averageActionInterval: { type: Number, default: 0 }, // milliseconds
      flagAgeHours: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    collection: 'behavioralflags'
  }
);

// ============================================
// INDEXES
// ============================================

// Query flags by user and season
BehavioralFlagSchema.index({ userId: 1, seasonId: 1, createdAt: -1 });

// Admin dashboard - pending reviews by severity
BehavioralFlagSchema.index({ seasonId: 1, severity: 1, reviewStatus: 1 });

// Review queue (oldest critical flags first)
BehavioralFlagSchema.index({ reviewStatus: 1, severity: 1, createdAt: 1 });

// Query by flag type
BehavioralFlagSchema.index({ flagType: 1, createdAt: -1 });

// Find flags linked to specific user
BehavioralFlagSchema.index({ 'similarUsers.userId': 1 });

// Find unresolved flags
BehavioralFlagSchema.index({ seasonId: 1, resolved: 1, severity: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Is flag pending review
BehavioralFlagSchema.virtual('isPending').get(function() {
  return this.reviewStatus === 'pending';
});

// Is flag high priority
BehavioralFlagSchema.virtual('isHighPriority').get(function() {
  return this.severity === 'critical' || this.severity === 'high';
});

// Flag age in hours
BehavioralFlagSchema.virtual('ageHours').get(function() {
  return ((Date.now() - this.createdAt) / (1000 * 60 * 60)).toFixed(2);
});

// Number of linked accounts
BehavioralFlagSchema.virtual('linkedAccountsCount').get(function() {
  return this.similarUsers.length;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Add similar user to linked accounts
 * @param {ObjectId} userId
 * @param {Number} similarityScore
 * @param {Array<String>} sharedAttributes
 * @returns {Object} { success: Boolean }
 */
BehavioralFlagSchema.methods.addSimilarUser = function(userId, similarityScore, sharedAttributes = []) {
  // Check if already exists
  const existing = this.similarUsers.find(u => u.userId.equals(userId));

  if (existing) {
    // Update existing entry
    existing.similarityScore = Math.max(existing.similarityScore, similarityScore);
    existing.sharedAttributes = [...new Set([...existing.sharedAttributes, ...sharedAttributes])];
    existing.detectedAt = new Date();
  } else {
    // Add new entry
    this.similarUsers.push({
      userId,
      similarityScore,
      sharedAttributes,
      detectedAt: new Date()
    });
  }

  // Increase severity if many linked accounts
  if (this.similarUsers.length >= 3 && this.severity === 'low') {
    this.severity = 'medium';
  }
  if (this.similarUsers.length >= 5 && this.severity === 'medium') {
    this.severity = 'high';
  }

  return { success: true };
};

/**
 * Add suspicious pattern
 * @param {Object} pattern
 * @returns {Object} { success: Boolean }
 */
BehavioralFlagSchema.methods.addPattern = function(pattern) {
  this.suspiciousPatterns.push({
    patternType: pattern.type,
    description: pattern.description,
    confidence: pattern.confidence || 50,
    affectedCount: pattern.affectedCount || 1,
    relatedUserIds: pattern.relatedUserIds || [],
    evidence: pattern.evidence || {},
    detectedAt: new Date()
  });

  // Update overall confidence score (weighted average)
  const totalConfidence = this.suspiciousPatterns.reduce((sum, p) => sum + p.confidence, 0);
  this.confidenceScore = Math.round(totalConfidence / this.suspiciousPatterns.length);

  // Escalate severity based on pattern count
  if (this.suspiciousPatterns.length >= 3 && this.severity === 'low') {
    this.severity = 'medium';
  }
  if (this.suspiciousPatterns.length >= 5 && this.severity === 'medium') {
    this.severity = 'high';
  }

  return { success: true };
};

/**
 * Mark flag as reviewed
 * @param {ObjectId} adminId
 * @param {String} status
 * @param {String} notes
 * @param {String} action
 * @returns {Object} { success: Boolean }
 */
BehavioralFlagSchema.methods.markReviewed = function(adminId, status, notes, action = 'none') {
  this.reviewStatus = status;
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.reviewNotes = notes;
  this.actionTaken = action;

  if (['cleared', 'confirmed_cheating', 'banned', 'false_positive'].includes(status)) {
    this.resolved = true;
    this.resolvedAt = new Date();
  }

  if (status === 'false_positive') {
    this.falsePositive = true;
  }

  return { success: true };
};

/**
 * Escalate flag severity
 * @param {ObjectId} adminId
 * @param {String} reason
 * @returns {Object} { success: Boolean, error: String }
 */
BehavioralFlagSchema.methods.escalate = function(adminId, reason) {
  if (this.severity === 'critical') {
    return { success: false, error: 'Flag is already at critical severity' };
  }

  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const currentIndex = severityOrder.indexOf(this.severity);
  this.severity = severityOrder[currentIndex + 1];

  this.escalated = true;
  this.escalatedAt = new Date();
  this.escalatedBy = adminId;
  this.escalationReason = reason;

  return { success: true, newSeverity: this.severity };
};

/**
 * Add action timestamp (for bot detection)
 * @param {String} action
 * @param {Date} timestamp
 */
BehavioralFlagSchema.methods.trackAction = function(action, timestamp = new Date()) {
  const previousAction = this.actionTimestamps[this.actionTimestamps.length - 1];
  const timeSincePrevious = previousAction ? timestamp - previousAction.timestamp : null;

  this.actionTimestamps.push({
    action,
    timestamp,
    timeSincePrevious
  });

  // Keep only last 100 actions
  if (this.actionTimestamps.length > 100) {
    this.actionTimestamps = this.actionTimestamps.slice(-100);
  }

  // Calculate average interval
  const intervals = this.actionTimestamps
    .filter(a => a.timeSincePrevious !== null)
    .map(a => a.timeSincePrevious);

  if (intervals.length > 0) {
    this.stats.averageActionInterval = Math.round(
      intervals.reduce((sum, i) => sum + i, 0) / intervals.length
    );
  }

  this.stats.totalActionsTracked = this.actionTimestamps.length;
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get all flags for a user
 * @param {ObjectId} userId
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<BehavioralFlag>>}
 */
BehavioralFlagSchema.statics.getFlagsByUser = async function(userId, seasonId) {
  return this.find({ userId, seasonId })
    .sort({ createdAt: -1 })
    .populate('reviewedBy', 'username adminRole');
};

/**
 * Get pending reviews by severity
 * @param {String} severity - 'low', 'medium', 'high', 'critical', or 'all'
 * @param {Number} limit
 * @returns {Promise<Array<BehavioralFlag>>}
 */
BehavioralFlagSchema.statics.getPendingReviews = async function(severity = 'all', limit = 50) {
  const query = { reviewStatus: 'pending' };

  if (severity !== 'all') {
    query.severity = severity;
  }

  return this.find(query)
    .sort({ severity: -1, createdAt: 1 }) // Critical first, oldest first
    .limit(limit)
    .populate('userId', 'username walletAddress')
    .populate('seasonId', 'seasonNumber name');
};

/**
 * Get flag network (all linked accounts)
 * @param {ObjectId} userId
 * @returns {Promise<Object>} { nodes: [], edges: [] }
 */
BehavioralFlagSchema.statics.getFlagNetwork = async function(userId) {
  const flags = await this.find({
    $or: [
      { userId },
      { 'similarUsers.userId': userId }
    ]
  }).populate('userId', 'username walletAddress')
    .populate('similarUsers.userId', 'username walletAddress');

  // Build graph structure
  const nodes = new Map();
  const edges = [];

  flags.forEach(flag => {
    // Add primary user
    if (!nodes.has(flag.userId._id.toString())) {
      nodes.set(flag.userId._id.toString(), {
        id: flag.userId._id,
        username: flag.userId.username,
        walletAddress: flag.userId.walletAddress,
        flagCount: 1
      });
    } else {
      nodes.get(flag.userId._id.toString()).flagCount++;
    }

    // Add similar users
    flag.similarUsers.forEach(similar => {
      if (!nodes.has(similar.userId._id.toString())) {
        nodes.set(similar.userId._id.toString(), {
          id: similar.userId._id,
          username: similar.userId.username,
          walletAddress: similar.userId.walletAddress,
          flagCount: 0
        });
      }

      // Add edge
      edges.push({
        from: flag.userId._id,
        to: similar.userId._id,
        similarityScore: similar.similarityScore,
        sharedAttributes: similar.sharedAttributes
      });
    });
  });

  return {
    nodes: Array.from(nodes.values()),
    edges
  };
};

/**
 * Get statistics by flag type
 * @param {ObjectId} seasonId
 * @returns {Promise<Array>}
 */
BehavioralFlagSchema.statics.getStatsByType = async function(seasonId) {
  return this.aggregate([
    {
      $match: { seasonId: new mongoose.Types.ObjectId(seasonId) }
    },
    {
      $group: {
        _id: {
          flagType: '$flagType',
          severity: '$severity'
        },
        count: { $sum: 1 },
        pendingCount: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'pending'] }, 1, 0] }
        },
        confirmedCount: {
          $sum: { $cond: [{ $eq: ['$reviewStatus', 'confirmed_cheating'] }, 1, 0] }
        },
        avgConfidence: { $avg: '$confidenceScore' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

/**
 * Get high-risk users (multiple high-severity flags)
 * @param {ObjectId} seasonId
 * @param {Number} minFlags
 * @returns {Promise<Array>}
 */
BehavioralFlagSchema.statics.getHighRiskUsers = async function(seasonId, minFlags = 2) {
  return this.aggregate([
    {
      $match: {
        seasonId: new mongoose.Types.ObjectId(seasonId),
        severity: { $in: ['high', 'critical'] },
        resolved: false
      }
    },
    {
      $group: {
        _id: '$userId',
        flagCount: { $sum: 1 },
        maxSeverity: { $max: '$severity' },
        avgConfidence: { $avg: '$confidenceScore' },
        flagTypes: { $addToSet: '$flagType' }
      }
    },
    {
      $match: {
        flagCount: { $gte: minFlags }
      }
    },
    {
      $sort: { flagCount: -1, avgConfidence: -1 }
    }
  ]);
};

/**
 * Find users with shared IPs/devices
 * @param {String} ipOrFingerprint
 * @returns {Promise<Array<BehavioralFlag>>}
 */
BehavioralFlagSchema.statics.findSharedDevice = async function(ipOrFingerprint) {
  return this.find({
    $or: [
      { 'ipAddresses.ip': ipOrFingerprint },
      { 'browserFingerprints.fingerprint': ipOrFingerprint }
    ]
  }).populate('userId', 'username walletAddress');
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Update statistics before saving
BehavioralFlagSchema.pre('save', function(next) {
  // Update unique counts
  this.stats.uniqueIPs = new Set(this.ipAddresses.map(ip => ip.ip)).size;
  this.stats.uniqueDevices = new Set(this.browserFingerprints.map(fp => fp.fingerprint)).size;
  this.stats.flagAgeHours = parseFloat(this.ageHours);

  // Limit array sizes to prevent unbounded growth
  if (this.loginTimes.length > 100) {
    this.loginTimes = this.loginTimes.slice(-100);
  }
  if (this.actionTimestamps.length > 100) {
    this.actionTimestamps = this.actionTimestamps.slice(-100);
  }

  next();
});

// Ensure virtuals are included in JSON
BehavioralFlagSchema.set('toJSON', { virtuals: true });
BehavioralFlagSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('BehavioralFlag', BehavioralFlagSchema);
