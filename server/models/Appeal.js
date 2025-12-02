/**
 * APPEAL MODEL
 * Ban appeals for moderation system
 */

const mongoose = require('mongoose');

const APPEAL_STATUS = {
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  APPROVED: 'approved',
  REJECTED: 'rejected'
};

const appealSchema = new mongoose.Schema({
  // Appellant
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  walletAddress: String,

  // Original ban
  banId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdminAuditLog' },
  banReason: String,
  banDuration: Number,
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  bannedAt: Date,

  // Appeal content
  appealReason: { type: String, required: true, maxlength: 2000 },
  evidence: [{
    type: String,
    url: String,
    description: String
  }],

  // Status
  status: { type: String, enum: Object.values(APPEAL_STATUS), default: 'pending' },

  // Review
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  reviewNotes: String,
  decision: {
    action: { type: String, enum: ['upheld', 'reduced', 'overturned'] },
    newDuration: Number,
    reason: String
  },
  reviewedAt: Date,

  // Meta
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

appealSchema.index({ status: 1, createdAt: -1 });
appealSchema.index({ userId: 1 });

appealSchema.statics.STATUS = APPEAL_STATUS;

module.exports = mongoose.model('Appeal', appealSchema);
