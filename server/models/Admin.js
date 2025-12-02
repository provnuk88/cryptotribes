/**
 * ADMIN MODEL
 * Admin users with role-based permissions for CryptoTribes admin panel
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = {
  SUPER_ADMIN: 'super_admin',
  GAME_MASTER: 'game_master',
  MODERATOR: 'moderator'
};

const adminSchema = new mongoose.Schema({
  // Auth
  email: { type: String, unique: true, sparse: true }, // Super Admin only
  walletAddress: { type: String, unique: true, sparse: true }, // GM + Mod
  passwordHash: String, // Super Admin only

  // Profile
  username: { type: String, required: true, unique: true },
  role: {
    type: String,
    enum: Object.values(ROLES),
    required: true
  },

  // Status
  isActive: { type: Boolean, default: true },
  lastLogin: Date,
  loginCount: { type: Number, default: 0 },

  // Security
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: String,
  ipWhitelist: [String],
  failedLoginAttempts: { type: Number, default: 0 },
  lockedUntil: Date,

  // Permissions (custom overrides)
  customPermissions: {
    canBanPermanent: Boolean,
    canRollbackBattles: Boolean,
    canCompensate: Boolean,
    canDeleteSeasons: Boolean
  },

  // Meta
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Indexes
adminSchema.index({ email: 1 });
adminSchema.index({ walletAddress: 1 });
adminSchema.index({ role: 1, isActive: 1 });

// Pre-save: hash password
adminSchema.pre('save', async function(next) {
  if (this.isModified('passwordHash') && this.passwordHash && !this.passwordHash.startsWith('$2')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

// Methods
adminSchema.methods.comparePassword = async function(password) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(password, this.passwordHash);
};

adminSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    super_admin: ['*'], // All permissions
    game_master: [
      'seasons:read', 'seasons:create', 'seasons:update',
      'players:read', 'players:flag', 'players:warn', 'players:ban_short', 'players:kick',
      'tribes:read', 'tribes:flag', 'tribes:propose_disqualify',
      'battles:read',
      'moderation:read', 'moderation:resolve',
      'analytics:read',
      'audit:read_own'
    ],
    moderator: [
      'players:read', 'players:flag', 'players:warn', 'players:ban_short',
      'tribes:read', 'tribes:flag',
      'moderation:read', 'moderation:resolve',
      'audit:read_own'
    ]
  };

  const permissions = rolePermissions[this.role] || [];
  if (permissions.includes('*')) return true;

  // Check custom overrides
  if (this.customPermissions) {
    if (permission === 'players:ban_permanent' && this.customPermissions.canBanPermanent) return true;
    if (permission === 'battles:rollback' && this.customPermissions.canRollbackBattles) return true;
    if (permission === 'players:compensate' && this.customPermissions.canCompensate) return true;
  }

  return permissions.includes(permission);
};

adminSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.twoFactorSecret;
  return obj;
};

adminSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('Admin', adminSchema);
