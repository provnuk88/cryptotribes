/**
 * ADMIN AUDIT LOG MODEL
 * Complete transparency tracking of all admin actions
 */

const mongoose = require('mongoose');

const AdminAuditLogSchema = new mongoose.Schema(
  {
    // ============================================
    // ADMIN IDENTITY
    // ============================================
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Admin ID is required'],
      index: true
    },

    adminUsername: {
      type: String,
      default: 'Unknown Admin'
    },

    adminWalletAddress: {
      type: String,
      default: null,
      lowercase: true
    },

    adminRole: {
      type: String,
      enum: ['super_admin', 'game_master', 'moderator'],
      required: [true, 'Admin role is required'],
      index: true
    },

    // ============================================
    // ACTION DETAILS
    // ============================================
    action: {
      type: String,
      enum: [
        // User moderation
        'BAN_PLAYER',
        'UNBAN_PLAYER',
        'WARN_PLAYER',
        'KICK_FROM_TRIBE',
        'SUSPEND_ACCOUNT',

        // Compensation
        'GIVE_GOLD',
        'GIVE_UNITS',
        'GIVE_VP',

        // Battle management
        'ROLLBACK_BATTLE',
        'FLAG_BATTLE',
        'UNFLAG_BATTLE',

        // Tribe management
        'DISQUALIFY_TRIBE',
        'REINSTATE_TRIBE',
        'TRANSFER_OWNERSHIP',

        // Season management
        'CREATE_SEASON',
        'START_SEASON',
        'END_SEASON',
        'CANCEL_SEASON',
        'MODIFY_SEASON',

        // Territory management
        'FORCE_CAPTURE',
        'CLEAR_GARRISON',
        'REMOVE_SHIELD',

        // Constants/Config
        'MODIFY_CONSTANTS',
        'MODIFY_SETTINGS',

        // Prize distribution
        'DISTRIBUTE_PRIZES',
        'MANUAL_PRIZE_PAYMENT',

        // Anti-cheat
        'REVIEW_FLAG',
        'LINK_MULTI_ACCOUNTS',
        'CLEAR_FLAGS',

        // Admin management
        'PROMOTE_ADMIN',
        'DEMOTE_ADMIN',
        'REVOKE_ACCESS'
      ],
      required: [true, 'Action is required'],
      index: true
    },

    // ============================================
    // TARGET
    // ============================================
    targetType: {
      type: String,
      enum: ['user', 'tribe', 'battle', 'territory', 'season', 'payment', 'system'],
      required: [true, 'Target type is required']
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true
    },

    targetName: {
      type: String,
      default: 'Unknown'
    },

    // ============================================
    // JUSTIFICATION (REQUIRED for sensitive actions)
    // ============================================
    reason: {
      type: String,
      required: function() {
        // Require reason for all actions except read-only
        const readOnlyActions = ['REVIEW_FLAG'];
        return !readOnlyActions.includes(this.action);
      },
      minlength: [10, 'Reason must be at least 10 characters'],
      maxlength: [1000, 'Reason cannot exceed 1000 characters']
    },

    // Evidence (URLs, screenshots, logs)
    evidence: {
      type: String,
      default: null,
      maxlength: 2000
    },

    // ============================================
    // STATE CHANGES
    // ============================================
    changesBefore: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    changesAfter: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },

    // ============================================
    // STATUS & APPROVAL
    // ============================================
    status: {
      type: String,
      enum: ['pending_approval', 'approved', 'rejected', 'success', 'failed'],
      default: 'success',
      index: true
    },

    // For two-step actions (e.g., Game Master proposes, Super Admin approves)
    requiresApproval: {
      type: Boolean,
      default: false
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    approvedAt: {
      type: Date,
      default: null
    },

    rejectionReason: {
      type: String,
      default: null
    },

    // ============================================
    // ERROR TRACKING
    // ============================================
    error: {
      type: String,
      default: null
    },

    // ============================================
    // METADATA
    // ============================================
    metadata: {
      // IP address of admin
      ipAddress: {
        type: String,
        default: null
      },

      // User agent
      userAgent: {
        type: String,
        default: null
      },

      // Session ID
      sessionId: {
        type: String,
        default: null
      },

      // 2FA confirmation (for critical actions)
      twoFactorVerified: {
        type: Boolean,
        default: false
      },

      // Affected users count (for bulk actions)
      affectedCount: {
        type: Number,
        default: 1
      },

      // Additional context
      additionalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },

    // ============================================
    // SEASON CONTEXT
    // ============================================
    seasonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      default: null,
      index: true
    },

    // ============================================
    // REVERSIBILITY
    // ============================================
    isReversible: {
      type: Boolean,
      default: false
    },

    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },

    reversedAt: {
      type: Date,
      default: null
    },

    reversalReason: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'adminauditlogs'
  }
);

// ============================================
// INDEXES
// ============================================

// Query logs by admin
AdminAuditLogSchema.index({ adminId: 1, createdAt: -1 });

// Query logs by action type
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

// Query logs by target
AdminAuditLogSchema.index({ targetId: 1, createdAt: -1 });

// Query logs by status (pending approval, failed, etc.)
AdminAuditLogSchema.index({ status: 1, createdAt: -1 });

// Query logs by season
AdminAuditLogSchema.index({ seasonId: 1, createdAt: -1 });

// Query logs requiring approval
AdminAuditLogSchema.index({ requiresApproval: 1, status: 1, createdAt: -1 });

// Full-text search on reason and evidence (for investigations)
AdminAuditLogSchema.index({ reason: 'text', evidence: 'text' });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Is action pending approval
AdminAuditLogSchema.virtual('isPending').get(function() {
  return this.status === 'pending_approval';
});

// Is action approved
AdminAuditLogSchema.virtual('isApproved').get(function() {
  return this.status === 'approved' || this.status === 'success';
});

// Is action failed
AdminAuditLogSchema.virtual('isFailed').get(function() {
  return this.status === 'failed' || this.status === 'rejected';
});

// Time since action
AdminAuditLogSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  return 'Less than an hour ago';
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Approve action (for two-step workflows)
 * @param {ObjectId} approverId - Super Admin approving
 * @returns {Object} { success: Boolean, error: String }
 */
AdminAuditLogSchema.methods.approve = function(approverId) {
  if (!this.requiresApproval) {
    return { success: false, error: 'This action does not require approval' };
  }

  if (this.status !== 'pending_approval') {
    return { success: false, error: 'Action is not pending approval' };
  }

  this.status = 'approved';
  this.approvedBy = approverId;
  this.approvedAt = new Date();

  return { success: true };
};

/**
 * Reject action
 * @param {ObjectId} approverId
 * @param {String} reason
 * @returns {Object} { success: Boolean, error: String }
 */
AdminAuditLogSchema.methods.reject = function(approverId, reason) {
  if (!this.requiresApproval) {
    return { success: false, error: 'This action does not require approval' };
  }

  if (this.status !== 'pending_approval') {
    return { success: false, error: 'Action is not pending approval' };
  }

  this.status = 'rejected';
  this.approvedBy = approverId;
  this.approvedAt = new Date();
  this.rejectionReason = reason;

  return { success: true };
};

/**
 * Reverse action (undo)
 * @param {ObjectId} adminId
 * @param {String} reason
 * @returns {Object} { success: Boolean, error: String }
 */
AdminAuditLogSchema.methods.reverse = function(adminId, reason) {
  if (!this.isReversible) {
    return { success: false, error: 'This action is not reversible' };
  }

  if (this.reversedBy) {
    return { success: false, error: 'Action has already been reversed' };
  }

  this.reversedBy = adminId;
  this.reversedAt = new Date();
  this.reversalReason = reason;

  return { success: true };
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get admin's action history
 * @param {ObjectId} adminId
 * @param {Number} limit
 * @returns {Promise<Array<AdminAuditLog>>}
 */
AdminAuditLogSchema.statics.getAdminHistory = async function(adminId, limit = 100) {
  return this.find({ adminId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-changesBefore -changesAfter'); // Exclude large fields
};

/**
 * Get actions requiring approval
 * @returns {Promise<Array<AdminAuditLog>>}
 */
AdminAuditLogSchema.statics.getPendingApprovals = async function() {
  return this.find({
    requiresApproval: true,
    status: 'pending_approval'
  })
    .sort({ createdAt: 1 }) // Oldest first
    .populate('adminId', 'username walletAddress')
    .populate('targetId');
};

/**
 * Get failed actions (for debugging)
 * @param {Number} hours - look back X hours
 * @returns {Promise<Array<AdminAuditLog>>}
 */
AdminAuditLogSchema.statics.getRecentFailures = async function(hours = 24) {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.find({
    status: 'failed',
    createdAt: { $gte: cutoff }
  })
    .sort({ createdAt: -1 })
    .populate('adminId', 'username adminRole');
};

/**
 * Get actions for a specific target
 * @param {ObjectId} targetId
 * @param {String} targetType
 * @returns {Promise<Array<AdminAuditLog>>}
 */
AdminAuditLogSchema.statics.getTargetHistory = async function(targetId, targetType) {
  return this.find({ targetId, targetType })
    .sort({ createdAt: -1 })
    .populate('adminId', 'username adminRole');
};

/**
 * Search logs by keyword
 * @param {String} keyword
 * @param {Number} limit
 * @returns {Promise<Array<AdminAuditLog>>}
 */
AdminAuditLogSchema.statics.searchLogs = async function(keyword, limit = 50) {
  return this.find({
    $text: { $search: keyword }
  })
    .sort({ score: { $meta: 'textScore' } })
    .limit(limit)
    .populate('adminId', 'username adminRole');
};

/**
 * Get statistics for a time period
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {Promise<Object>}
 */
AdminAuditLogSchema.statics.getStats = async function(startDate, endDate) {
  const stats = await this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          action: '$action',
          adminRole: '$adminRole'
        },
        count: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);

  return stats;
};

/**
 * Get most active admins
 * @param {Date} startDate
 * @param {Number} limit
 * @returns {Promise<Array>}
 */
AdminAuditLogSchema.statics.getMostActiveAdmins = async function(startDate, limit = 10) {
  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$adminId',
        actionCount: { $sum: 1 },
        adminUsername: { $first: '$adminUsername' },
        adminRole: { $first: '$adminRole' }
      }
    },
    {
      $sort: { actionCount: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Make audit logs immutable (cannot be edited after creation)
AdminAuditLogSchema.pre('save', function(next) {
  if (!this.isNew) {
    // Only allow status updates for approval workflow
    const modifiedPaths = this.modifiedPaths();
    const allowedPaths = ['status', 'approvedBy', 'approvedAt', 'rejectionReason', 'reversedBy', 'reversedAt', 'reversalReason'];

    const hasUnallowedChanges = modifiedPaths.some(path => !allowedPaths.includes(path));

    if (hasUnallowedChanges) {
      return next(new Error('Audit logs are immutable and cannot be modified'));
    }
  }

  next();
});

// Ensure virtuals are included in JSON
AdminAuditLogSchema.set('toJSON', { virtuals: true });
AdminAuditLogSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('AdminAuditLog', AdminAuditLogSchema);
