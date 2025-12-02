/**
 * REPORT MODEL
 * Player reports for moderation system
 */

const mongoose = require('mongoose');

const REPORT_TYPES = {
  OFFENSIVE_NAME: 'offensive_name',
  HARASSMENT: 'harassment',
  MULTI_ACCOUNT: 'multi_account',
  CHEATING: 'cheating',
  BUG_EXPLOIT: 'bug_exploit',
  OTHER: 'other'
};

const REPORT_STATUS = {
  PENDING: 'pending',
  INVESTIGATING: 'investigating',
  RESOLVED: 'resolved',
  DISMISSED: 'dismissed'
};

const reportSchema = new mongoose.Schema({
  // Reporter
  reporterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reporterWallet: String,

  // Target
  targetType: { type: String, enum: ['player', 'tribe'], required: true },
  targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
  targetName: String,

  // Report details
  type: { type: String, enum: Object.values(REPORT_TYPES), required: true },
  description: { type: String, maxlength: 1000 },
  evidence: [{
    type: { type: String, enum: ['screenshot', 'battleId', 'chatLog', 'other'] },
    url: String,
    description: String
  }],

  // Status
  status: { type: String, enum: Object.values(REPORT_STATUS), default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },

  // Resolution
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  resolution: {
    action: { type: String, enum: ['no_action', 'warning', 'ban', 'kick', 'disqualify'] },
    duration: Number, // Ban duration in days
    reason: String,
    notes: String
  },
  resolvedAt: Date,

  // Meta
  seasonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Season' },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });
reportSchema.index({ reporterId: 1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ priority: 1, status: 1 });

reportSchema.statics.TYPES = REPORT_TYPES;
reportSchema.statics.STATUS = REPORT_STATUS;

module.exports = mongoose.model('Report', reportSchema);
