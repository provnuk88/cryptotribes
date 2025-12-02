/**
 * PAYMENT MODEL
 * Entry fees, prize distributions, and transaction tracking
 */

const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    // ============================================
    // USER & SEASON
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
    // PAYMENT DETAILS
    // ============================================
    type: {
      type: String,
      enum: ['entry_fee', 'prize_distribution', 'refund', 'compensation'],
      required: [true, 'Payment type is required'],
      index: true
    },

    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: 0
    },

    currency: {
      type: String,
      enum: ['usd', 'usdt'],
      default: 'usd'
    },

    // ============================================
    // PAYMENT METHOD
    // ============================================
    paymentMethod: {
      type: String,
      enum: ['stripe', 'usdt_wallet', 'crypto', 'manual'],
      required: [true, 'Payment method is required'],
      index: true
    },

    // Stripe payment intent ID
    stripePaymentIntentId: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },

    // Blockchain transaction hash (for USDT/crypto payments)
    transactionHash: {
      type: String,
      default: null,
      index: true,
      sparse: true
    },

    // Wallet address (for crypto payments)
    walletAddress: {
      type: String,
      default: null,
      lowercase: true
    },

    // ============================================
    // STATUS
    // ============================================
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
      default: 'pending',
      required: true,
      index: true
    },

    // ============================================
    // TIMESTAMPS
    // ============================================
    paidAt: {
      type: Date,
      default: null
    },

    refundedAt: {
      type: Date,
      default: null
    },

    // ============================================
    // ERROR HANDLING
    // ============================================
    error: {
      code: {
        type: String,
        default: null
      },
      message: {
        type: String,
        default: null
      }
    },

    // ============================================
    // METADATA
    // ============================================
    metadata: {
      // Prize rank (for prize distributions)
      prizeRank: {
        type: Number,
        default: null
      },

      // Prize category (for individual prizes)
      prizeCategory: {
        type: String,
        default: null
      },

      // Tribe ID (for tribal prizes)
      tribeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Tribe',
        default: null
      },

      // Admin who processed (for manual payments/compensations)
      processedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },

      // Reason (for refunds/compensations)
      reason: {
        type: String,
        default: null,
        maxlength: 500
      },

      // IP address (for fraud detection)
      ipAddress: {
        type: String,
        default: null
      },

      // User agent
      userAgent: {
        type: String,
        default: null
      },

      // Additional data
      additionalData: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
      }
    },

    // ============================================
    // STRIPE-SPECIFIC
    // ============================================
    stripe: {
      customerId: {
        type: String,
        default: null
      },
      chargeId: {
        type: String,
        default: null
      },
      refundId: {
        type: String,
        default: null
      },
      receiptUrl: {
        type: String,
        default: null
      }
    },

    // ============================================
    // BLOCKCHAIN-SPECIFIC
    // ============================================
    blockchain: {
      network: {
        type: String,
        enum: ['mainnet', 'testnet', 'polygon', 'bsc'],
        default: 'mainnet'
      },
      blockNumber: {
        type: Number,
        default: null
      },
      confirmations: {
        type: Number,
        default: 0
      },
      gasUsed: {
        type: String,
        default: null
      }
    },

    // ============================================
    // RETRY TRACKING
    // ============================================
    retryCount: {
      type: Number,
      default: 0
    },

    lastRetryAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    collection: 'payments'
  }
);

// ============================================
// INDEXES
// ============================================

// Query payments by user and season
PaymentSchema.index({ userId: 1, seasonId: 1 });

// Query by payment status
PaymentSchema.index({ status: 1, createdAt: -1 });

// Query by payment type
PaymentSchema.index({ type: 1, createdAt: -1 });

// Find payment by Stripe ID
PaymentSchema.index({ stripePaymentIntentId: 1 }, { sparse: true });

// Find payment by transaction hash
PaymentSchema.index({ transactionHash: 1 }, { sparse: true });

// Query pending payments (for retries)
PaymentSchema.index({ status: 1, createdAt: 1 });

// ============================================
// VIRTUAL FIELDS
// ============================================

// Is payment successful
PaymentSchema.virtual('isSuccessful').get(function() {
  return this.status === 'completed';
});

// Is payment pending
PaymentSchema.virtual('isPending').get(function() {
  return this.status === 'pending' || this.status === 'processing';
});

// Is payment failed
PaymentSchema.virtual('isFailed').get(function() {
  return this.status === 'failed' || this.status === 'cancelled';
});

// Processing time (if completed)
PaymentSchema.virtual('processingTime').get(function() {
  if (this.paidAt && this.createdAt) {
    return ((this.paidAt - this.createdAt) / 1000).toFixed(2); // seconds
  }
  return null;
});

// ============================================
// INSTANCE METHODS
// ============================================

/**
 * Mark payment as completed
 * @param {Object} data - payment confirmation data
 */
PaymentSchema.methods.markCompleted = function(data = {}) {
  this.status = 'completed';
  this.paidAt = new Date();

  if (data.transactionHash) {
    this.transactionHash = data.transactionHash;
  }

  if (data.stripePaymentIntentId) {
    this.stripePaymentIntentId = data.stripePaymentIntentId;
  }

  if (data.receiptUrl) {
    this.stripe.receiptUrl = data.receiptUrl;
  }
};

/**
 * Mark payment as failed
 * @param {String} errorCode
 * @param {String} errorMessage
 */
PaymentSchema.methods.markFailed = function(errorCode, errorMessage) {
  this.status = 'failed';
  this.error = {
    code: errorCode,
    message: errorMessage
  };
};

/**
 * Process refund
 * @param {String} reason
 * @returns {Object} { success: Boolean, error: String }
 */
PaymentSchema.methods.processRefund = function(reason) {
  if (this.status !== 'completed') {
    return { success: false, error: 'Can only refund completed payments' };
  }

  this.status = 'refunded';
  this.refundedAt = new Date();
  this.metadata.reason = reason;

  return { success: true };
};

/**
 * Increment retry counter
 */
PaymentSchema.methods.incrementRetry = function() {
  this.retryCount += 1;
  this.lastRetryAt = new Date();
};

// ============================================
// STATIC METHODS
// ============================================

/**
 * Get total revenue for a season
 * @param {ObjectId} seasonId
 * @returns {Promise<Number>}
 */
PaymentSchema.statics.getSeasonRevenue = async function(seasonId) {
  const result = await this.aggregate([
    {
      $match: {
        seasonId: new mongoose.Types.ObjectId(seasonId),
        type: 'entry_fee',
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  return result.length > 0 ? result[0] : { totalRevenue: 0, count: 0 };
};

/**
 * Get user's payment history
 * @param {ObjectId} userId
 * @param {Number} limit
 * @returns {Promise<Array<Payment>>}
 */
PaymentSchema.statics.getUserPayments = async function(userId, limit = 20) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('seasonId', 'seasonNumber name');
};

/**
 * Find pending payments older than X minutes
 * @param {Number} minutes
 * @returns {Promise<Array<Payment>>}
 */
PaymentSchema.statics.findStalePendingPayments = async function(minutes = 30) {
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

  return this.find({
    status: 'pending',
    createdAt: { $lt: cutoffTime },
    retryCount: { $lt: 3 } // Max 3 retries
  });
};

/**
 * Get failed payments for investigation
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Payment>>}
 */
PaymentSchema.statics.getFailedPayments = async function(seasonId) {
  return this.find({
    seasonId,
    status: 'failed'
  })
    .sort({ createdAt: -1 })
    .populate('userId', 'username walletAddress');
};

/**
 * Check if user has paid entry fee for season
 * @param {ObjectId} userId
 * @param {ObjectId} seasonId
 * @returns {Promise<Boolean>}
 */
PaymentSchema.statics.hasUserPaid = async function(userId, seasonId) {
  const payment = await this.findOne({
    userId,
    seasonId,
    type: 'entry_fee',
    status: 'completed'
  });

  return !!payment;
};

/**
 * Get prize distribution payments for season
 * @param {ObjectId} seasonId
 * @returns {Promise<Array<Payment>>}
 */
PaymentSchema.statics.getSeasonPrizePayments = async function(seasonId) {
  return this.find({
    seasonId,
    type: 'prize_distribution',
    status: { $in: ['completed', 'processing', 'pending'] }
  })
    .sort({ 'metadata.prizeRank': 1 })
    .populate('userId', 'username walletAddress');
};

// ============================================
// PRE-SAVE MIDDLEWARE
// ============================================

// Set paidAt timestamp when status changes to completed
PaymentSchema.pre('save', function(next) {
  if (this.isModified('status') && this.status === 'completed' && !this.paidAt) {
    this.paidAt = new Date();
  }

  if (this.isModified('status') && this.status === 'refunded' && !this.refundedAt) {
    this.refundedAt = new Date();
  }

  next();
});

// Ensure virtuals are included in JSON
PaymentSchema.set('toJSON', { virtuals: true });
PaymentSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Payment', PaymentSchema);
