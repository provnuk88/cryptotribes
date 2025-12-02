# 🛡️ CRYPTOTRIBES ADMIN PANEL - FULL AUTONOMOUS BUILD

<prime_directive>
USER IS SLEEPING. Build the COMPLETE admin panel for CryptoTribes.
Backend API + React Admin Frontend. All features from ADMIN_SYSTEM.md.
DO NOT STOP until admin panel is fully functional.
</prime_directive>

---

## 🎯 GOAL

Create a complete admin panel with:
- 3 roles: Super Admin, Game Master, Moderator
- Full season/player/tribe/battle management
- Audit logging for all actions
- Analytics dashboard
- React-Admin frontend

**Success = `/admin` shows working dashboard with all features**

---

## 📊 ADMIN_TRACKER.json

Create immediately:

```json
{
  "meta": {
    "started": "",
    "updated": "",
    "phase": "init",
    "status": "running"
  },
  "backend": {
    "models": {
      "Admin": { "created": false, "fields": 0 },
      "AdminAuditLog": { "created": false, "fields": 0 },
      "Report": { "created": false, "fields": 0 },
      "Appeal": { "created": false, "fields": 0 }
    },
    "middleware": {
      "adminAuth": false,
      "roleCheck": false,
      "auditLogger": false
    },
    "routes": {
      "auth": { "created": false, "endpoints": 0 },
      "seasons": { "created": false, "endpoints": 0 },
      "players": { "created": false, "endpoints": 0 },
      "tribes": { "created": false, "endpoints": 0 },
      "battles": { "created": false, "endpoints": 0 },
      "moderation": { "created": false, "endpoints": 0 },
      "analytics": { "created": false, "endpoints": 0 },
      "config": { "created": false, "endpoints": 0 },
      "auditLogs": { "created": false, "endpoints": 0 }
    },
    "services": {
      "adminService": false,
      "moderationService": false,
      "analyticsService": false,
      "compensationService": false
    }
  },
  "frontend": {
    "setup": {
      "reactAdmin": false,
      "routing": false,
      "authProvider": false,
      "dataProvider": false
    },
    "pages": {
      "Dashboard": false,
      "SeasonList": false,
      "SeasonCreate": false,
      "SeasonEdit": false,
      "PlayerList": false,
      "PlayerShow": false,
      "TribeList": false,
      "TribeShow": false,
      "BattleList": false,
      "BattleShow": false,
      "ReportList": false,
      "AppealList": false,
      "Analytics": false,
      "AuditLogs": false,
      "AdminConfig": false
    },
    "components": {
      "RoleBasedMenu": false,
      "StatsCard": false,
      "AlertsPanel": false,
      "ActionButtons": false,
      "ConfirmDialog": false
    }
  },
  "tests": {
    "apiEndpoints": { "passed": 0, "failed": 0 },
    "rolePermissions": { "passed": 0, "failed": 0 },
    "auditLogging": { "passed": 0, "failed": 0 }
  },
  "admin_ready": false
}
```

---

## 📁 FILE STRUCTURE TO CREATE

```
server/
├── models/
│   ├── Admin.js              # Admin user model
│   ├── AdminAuditLog.js      # Audit log (may exist)
│   ├── Report.js             # Player reports
│   └── Appeal.js             # Ban appeals
├── middleware/
│   ├── adminAuth.js          # JWT auth for admins
│   ├── roleCheck.js          # Permission checking
│   └── auditLogger.js        # Auto-log all admin actions
├── routes/admin/
│   ├── index.js              # Mount all admin routes
│   ├── auth.js               # Login, logout, 2FA
│   ├── seasons.js            # Season CRUD
│   ├── players.js            # Player management
│   ├── tribes.js             # Tribe management
│   ├── battles.js            # Battle logs, rollback
│   ├── moderation.js         # Reports, appeals
│   ├── analytics.js          # Dashboard data
│   ├── config.js             # System config (Super Admin)
│   └── auditLogs.js          # Audit log viewer
└── services/
    ├── adminService.js       # Admin CRUD
    ├── moderationService.js  # Reports, bans, appeals
    ├── analyticsService.js   # Stats aggregation
    └── compensationService.js # Give gold/units

admin/                         # Separate React app for admin
├── package.json
├── vite.config.js
├── src/
│   ├── main.jsx
│   ├── App.jsx               # React-Admin setup
│   ├── authProvider.js       # Admin auth
│   ├── dataProvider.js       # API connection
│   ├── theme.js              # Dark theme
│   ├── resources/
│   │   ├── seasons/
│   │   │   ├── SeasonList.jsx
│   │   │   ├── SeasonCreate.jsx
│   │   │   ├── SeasonEdit.jsx
│   │   │   └── SeasonShow.jsx
│   │   ├── players/
│   │   │   ├── PlayerList.jsx
│   │   │   ├── PlayerShow.jsx
│   │   │   └── PlayerActions.jsx
│   │   ├── tribes/
│   │   │   ├── TribeList.jsx
│   │   │   └── TribeShow.jsx
│   │   ├── battles/
│   │   │   ├── BattleList.jsx
│   │   │   └── BattleShow.jsx
│   │   ├── moderation/
│   │   │   ├── ReportList.jsx
│   │   │   └── AppealList.jsx
│   │   ├── analytics/
│   │   │   └── Dashboard.jsx
│   │   └── config/
│   │       ├── AdminList.jsx
│   │       └── AuditLogs.jsx
│   └── components/
│       ├── RoleBasedMenu.jsx
│       ├── StatsCards.jsx
│       ├── AlertsPanel.jsx
│       ├── ConfirmDialog.jsx
│       └── ActionButtons.jsx
```

---

## 🔧 PHASE 1: BACKEND MODELS

### 1.1 Admin Model

**server/models/Admin.js:**
```javascript
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

adminSchema.statics.ROLES = ROLES;

module.exports = mongoose.model('Admin', adminSchema);
```

### 1.2 Report Model

**server/models/Report.js:**
```javascript
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

reportSchema.statics.TYPES = REPORT_TYPES;
reportSchema.statics.STATUS = REPORT_STATUS;

module.exports = mongoose.model('Report', reportSchema);
```

### 1.3 Appeal Model

**server/models/Appeal.js:**
```javascript
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
```

---

## 🔐 PHASE 2: MIDDLEWARE

### 2.1 Admin Auth Middleware

**server/middleware/adminAuth.js:**
```javascript
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { code: 'NO_TOKEN', message: 'Authentication required' }
      });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET);
    
    if (!decoded.isAdmin) {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_ADMIN', message: 'Admin access required' }
      });
    }
    
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin || !admin.isActive) {
      return res.status(403).json({
        success: false,
        error: { code: 'ADMIN_INACTIVE', message: 'Admin account inactive' }
      });
    }
    
    // Check IP whitelist for Super Admin
    if (admin.role === 'super_admin' && admin.ipWhitelist?.length > 0) {
      const clientIP = req.ip || req.connection.remoteAddress;
      if (!admin.ipWhitelist.includes(clientIP)) {
        return res.status(403).json({
          success: false,
          error: { code: 'IP_NOT_ALLOWED', message: 'IP not in whitelist' }
        });
      }
    }
    
    req.admin = admin;
    req.adminId = admin._id;
    req.adminRole = admin.role;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: { code: 'TOKEN_EXPIRED', message: 'Token expired' }
      });
    }
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
    });
  }
};

module.exports = adminAuth;
```

### 2.2 Role Check Middleware

**server/middleware/roleCheck.js:**
```javascript
const Admin = require('../models/Admin');

// Permission definitions
const PERMISSIONS = {
  // System
  'admins:manage': ['super_admin'],
  'audit:read_all': ['super_admin'],
  'config:edit': ['super_admin'],
  
  // Seasons
  'seasons:create': ['super_admin', 'game_master'],
  'seasons:update': ['super_admin', 'game_master'],
  'seasons:delete': ['super_admin'],
  'seasons:start': ['super_admin'],
  'seasons:end': ['super_admin'],
  
  // Players
  'players:read': ['super_admin', 'game_master', 'moderator'],
  'players:flag': ['super_admin', 'game_master', 'moderator'],
  'players:warn': ['super_admin', 'game_master', 'moderator'],
  'players:ban_short': ['super_admin', 'game_master', 'moderator'],
  'players:ban_long': ['super_admin', 'game_master'],
  'players:ban_permanent': ['super_admin'],
  'players:kick': ['super_admin', 'game_master'],
  'players:compensate': ['super_admin'],
  
  // Tribes
  'tribes:read': ['super_admin', 'game_master', 'moderator'],
  'tribes:flag': ['super_admin', 'game_master', 'moderator'],
  'tribes:treasury_logs': ['super_admin', 'game_master'],
  'tribes:chat_logs': ['super_admin', 'game_master'],
  'tribes:propose_disqualify': ['super_admin', 'game_master'],
  'tribes:approve_disqualify': ['super_admin'],
  
  // Battles
  'battles:read': ['super_admin', 'game_master'],
  'battles:replay': ['super_admin'],
  'battles:rollback': ['super_admin'],
  
  // Moderation
  'moderation:read': ['super_admin', 'game_master', 'moderator'],
  'moderation:resolve': ['super_admin', 'game_master', 'moderator'],
  'appeals:read': ['super_admin', 'game_master'],
  'appeals:decide': ['super_admin', 'game_master'],
  
  // Analytics
  'analytics:read': ['super_admin', 'game_master']
};

const roleCheck = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' }
      });
    }
    
    const allowedRoles = PERMISSIONS[permission] || [];
    
    // Super admin has all permissions
    if (req.admin.role === 'super_admin') {
      return next();
    }
    
    // Check role-based permission
    if (allowedRoles.includes(req.admin.role)) {
      return next();
    }
    
    // Check custom permissions
    if (req.admin.hasPermission(permission)) {
      return next();
    }
    
    return res.status(403).json({
      success: false,
      error: { 
        code: 'INSUFFICIENT_PERMISSIONS', 
        message: `Permission '${permission}' required`,
        yourRole: req.admin.role
      }
    });
  };
};

// Middleware to require specific roles
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' }
      });
    }
    
    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        error: { 
          code: 'ROLE_REQUIRED', 
          message: `One of these roles required: ${roles.join(', ')}`,
          yourRole: req.admin.role
        }
      });
    }
    
    next();
  };
};

module.exports = { roleCheck, requireRole, PERMISSIONS };
```

### 2.3 Audit Logger Middleware

**server/middleware/auditLogger.js:**
```javascript
const AdminAuditLog = require('../models/AdminAuditLog');

const auditLogger = (action, getTargetInfo) => {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to capture response
    res.json = async (data) => {
      try {
        // Only log if admin is authenticated and action succeeded
        if (req.admin && data.success !== false) {
          const targetInfo = typeof getTargetInfo === 'function' 
            ? await getTargetInfo(req, data)
            : getTargetInfo || {};
          
          await AdminAuditLog.create({
            adminId: req.admin._id,
            adminRole: req.admin.role,
            adminUsername: req.admin.username,
            action: action,
            target: {
              type: targetInfo.type || 'system',
              id: targetInfo.id || null,
              name: targetInfo.name || null
            },
            details: {
              method: req.method,
              path: req.originalUrl,
              body: sanitizeBody(req.body),
              query: req.query,
              ip: req.ip,
              userAgent: req.get('User-Agent')
            },
            changes: targetInfo.changes || null,
            result: data.success ? 'success' : 'failure',
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('Audit log error:', error);
        // Don't fail the request if audit logging fails
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

// Remove sensitive fields from logged body
const sanitizeBody = (body) => {
  if (!body) return null;
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;
  delete sanitized.twoFactorCode;
  return sanitized;
};

module.exports = auditLogger;
```

---

## 🛣️ PHASE 3: ADMIN ROUTES

### 3.1 Route Index

**server/routes/admin/index.js:**
```javascript
const express = require('express');
const router = express.Router();
const adminAuth = require('../../middleware/adminAuth');

// Public routes (no auth)
router.use('/auth', require('./auth'));

// Protected routes (require admin auth)
router.use(adminAuth);

router.use('/seasons', require('./seasons'));
router.use('/players', require('./players'));
router.use('/tribes', require('./tribes'));
router.use('/battles', require('./battles'));
router.use('/moderation', require('./moderation'));
router.use('/analytics', require('./analytics'));
router.use('/config', require('./config'));
router.use('/audit-logs', require('./auditLogs'));

module.exports = router;
```

### 3.2 Auth Routes

**server/routes/admin/auth.js:**
```javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/Admin');
const adminAuth = require('../../middleware/adminAuth');
const auditLogger = require('../../middleware/auditLogger');

// Super Admin email/password login
router.post('/login/super', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;
    
    const admin = await Admin.findOne({ email, role: 'super_admin' });
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }
    
    if (admin.lockedUntil && admin.lockedUntil > new Date()) {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_LOCKED', message: 'Account locked', lockedUntil: admin.lockedUntil }
      });
    }
    
    const validPassword = await admin.comparePassword(password);
    
    if (!validPassword) {
      admin.failedLoginAttempts += 1;
      if (admin.failedLoginAttempts >= 5) {
        admin.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
      }
      await admin.save();
      
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' }
      });
    }
    
    // TODO: Verify 2FA if enabled
    if (admin.twoFactorEnabled && !twoFactorCode) {
      return res.status(200).json({
        success: true,
        data: { requires2FA: true }
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, isAdmin: true },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    // Update login stats
    admin.lastLogin = new Date();
    admin.loginCount += 1;
    admin.failedLoginAttempts = 0;
    await admin.save();
    
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          email: admin.email
        }
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message: error.message }
    });
  }
});

// Wallet-based login for Game Master / Moderator
router.post('/login/wallet', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;
    
    // TODO: Verify signature matches wallet
    // const isValid = verifySignature(message, signature, walletAddress);
    
    const admin = await Admin.findOne({ 
      walletAddress: walletAddress.toLowerCase(),
      role: { $in: ['game_master', 'moderator'] }
    });
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'NOT_ADMIN', message: 'Wallet not registered as admin' }
      });
    }
    
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role, isAdmin: true },
      process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    
    admin.lastLogin = new Date();
    admin.loginCount += 1;
    await admin.save();
    
    res.json({
      success: true,
      data: {
        token,
        admin: {
          id: admin._id,
          username: admin.username,
          role: admin.role,
          walletAddress: admin.walletAddress
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'LOGIN_ERROR', message: error.message }
    });
  }
});

// Get current admin info
router.get('/me', adminAuth, (req, res) => {
  res.json({
    success: true,
    data: {
      id: req.admin._id,
      username: req.admin.username,
      role: req.admin.role,
      email: req.admin.email,
      walletAddress: req.admin.walletAddress,
      lastLogin: req.admin.lastLogin,
      permissions: req.admin.role === 'super_admin' ? ['*'] : undefined
    }
  });
});

// Logout (invalidate token - client side)
router.post('/logout', adminAuth, auditLogger('ADMIN_LOGOUT'), (req, res) => {
  res.json({ success: true, data: { message: 'Logged out' } });
});

module.exports = router;
```

### 3.3 Players Routes

**server/routes/admin/players.js:**
```javascript
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Battle = require('../../models/Battle');
const AdminAuditLog = require('../../models/AdminAuditLog');
const { roleCheck } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

// Search players
router.get('/search', roleCheck('players:read'), async (req, res) => {
  try {
    const { q, season, status, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (q) {
      query.$or = [
        { walletAddress: new RegExp(q, 'i') },
        { username: new RegExp(q, 'i') }
      ];
    }
    if (season) query.seasonId = season;
    if (status) query.status = status;
    
    const players = await User.find(query)
      .select('walletAddress username tribeId gold victoryPoints status createdAt')
      .populate('tribeId', 'name tag')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    
    res.json({
      success: true,
      data: players,
      meta: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get player details
router.get('/:playerId', roleCheck('players:read'), async (req, res) => {
  try {
    const player = await User.findById(req.params.playerId)
      .populate('tribeId');
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player not found' }
      });
    }
    
    // Get additional stats
    const battleCount = await Battle.countDocuments({
      $or: [{ attackerId: player._id }, { defenderId: player._id }]
    });
    
    const flags = await AdminAuditLog.find({
      'target.id': player._id,
      action: { $in: ['PLAYER_FLAG', 'PLAYER_WARN', 'PLAYER_BAN'] }
    }).sort({ timestamp: -1 }).limit(10);
    
    res.json({
      success: true,
      data: {
        player,
        stats: { battleCount },
        moderationHistory: flags
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Flag player for review
router.post('/:playerId/flag', 
  roleCheck('players:flag'),
  auditLogger('PLAYER_FLAG', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason, priority = 'medium' } = req.body;
      
      await User.findByIdAndUpdate(req.params.playerId, {
        $set: { 'flags.isUnderReview': true },
        $push: { 
          'flags.history': {
            type: 'flagged',
            reason,
            by: req.admin._id,
            at: new Date()
          }
        }
      });
      
      res.json({ success: true, data: { message: 'Player flagged for review' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Issue warning
router.post('/:playerId/warn',
  roleCheck('players:warn'),
  auditLogger('PLAYER_WARN', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      await User.findByIdAndUpdate(req.params.playerId, {
        $inc: { 'moderation.warningCount': 1 },
        $push: {
          'moderation.warnings': {
            reason,
            issuedBy: req.admin._id,
            issuedAt: new Date()
          }
        }
      });
      
      res.json({ success: true, data: { message: 'Warning issued' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Ban player
router.post('/:playerId/ban',
  roleCheck('players:ban_short'),
  auditLogger('PLAYER_BAN', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { duration: req.body.duration, reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { duration, reason, permanent = false } = req.body;
      
      // Check permissions for long/permanent bans
      if (duration > 7 && req.admin.role === 'moderator') {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Cannot ban for more than 7 days' }
        });
      }
      
      if (permanent && req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'INSUFFICIENT_PERMISSIONS', message: 'Only Super Admin can permanently ban' }
        });
      }
      
      const banUntil = permanent ? null : new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
      
      await User.findByIdAndUpdate(req.params.playerId, {
        $set: {
          'moderation.isBanned': true,
          'moderation.banUntil': banUntil,
          'moderation.banReason': reason,
          'moderation.bannedBy': req.admin._id,
          'moderation.bannedAt': new Date(),
          'moderation.isPermanentBan': permanent
        }
      });
      
      res.json({ 
        success: true, 
        data: { 
          message: permanent ? 'Player permanently banned' : `Player banned for ${duration} days`,
          banUntil
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Kick from season
router.post('/:playerId/kick',
  roleCheck('players:kick'),
  auditLogger('PLAYER_KICK', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: { reason: req.body.reason }
  })),
  async (req, res) => {
    try {
      const { reason } = req.body;
      
      // Remove from current season, keep account active
      await User.findByIdAndUpdate(req.params.playerId, {
        $set: {
          'currentSeason.isActive': false,
          'currentSeason.kickedAt': new Date(),
          'currentSeason.kickReason': reason
        }
      });
      
      res.json({ success: true, data: { message: 'Player kicked from season' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Compensate player (Super Admin only)
router.post('/:playerId/compensate',
  roleCheck('players:compensate'),
  auditLogger('PLAYER_COMPENSATE', (req) => ({
    type: 'player',
    id: req.params.playerId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const { gold = 0, units = {}, reason } = req.body;
      
      if (!reason) {
        return res.status(400).json({
          success: false,
          error: { code: 'REASON_REQUIRED', message: 'Compensation reason is required' }
        });
      }
      
      const update = {};
      if (gold > 0) update.$inc = { gold };
      
      // Add units if specified
      if (Object.keys(units).length > 0) {
        for (const [unitType, count] of Object.entries(units)) {
          update.$inc = update.$inc || {};
          update.$inc[`army.${unitType}`] = count;
        }
      }
      
      await User.findByIdAndUpdate(req.params.playerId, update);
      
      res.json({ 
        success: true, 
        data: { 
          message: 'Compensation applied',
          gold,
          units,
          reason
        } 
      });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Get player battles
router.get('/:playerId/battles', roleCheck('players:read'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const battles = await Battle.find({
      $or: [
        { attackerId: req.params.playerId },
        { defenderId: req.params.playerId }
      ]
    })
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .populate('territoryId', 'name tier');
    
    res.json({ success: true, data: battles });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
```

### 3.4 Seasons Routes

**server/routes/admin/seasons.js:**
```javascript
const express = require('express');
const router = express.Router();
const Season = require('../../models/Season');
const User = require('../../models/User');
const Tribe = require('../../models/Tribe');
const Battle = require('../../models/Battle');
const { roleCheck, requireRole } = require('../../middleware/roleCheck');
const auditLogger = require('../../middleware/auditLogger');

// List all seasons
router.get('/', roleCheck('seasons:create'), async (req, res) => {
  try {
    const seasons = await Season.find()
      .sort({ seasonNumber: -1 });
    
    res.json({ success: true, data: seasons });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Get season details
router.get('/:seasonId', roleCheck('seasons:create'), async (req, res) => {
  try {
    const season = await Season.findById(req.params.seasonId);
    
    if (!season) {
      return res.status(404).json({
        success: false,
        error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
      });
    }
    
    // Get stats
    const playerCount = await User.countDocuments({ seasonId: season._id });
    const tribeCount = await Tribe.countDocuments({ seasonId: season._id });
    const battleCount = await Battle.countDocuments({ seasonId: season._id });
    
    res.json({
      success: true,
      data: {
        season,
        stats: { playerCount, tribeCount, battleCount }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Create new season
router.post('/create',
  roleCheck('seasons:create'),
  auditLogger('SEASON_CREATE', (req, data) => ({
    type: 'season',
    id: data.data?.season?._id,
    name: req.body.name
  })),
  async (req, res) => {
    try {
      const {
        name,
        registrationStart,
        registrationEnd,
        seasonStart,
        seasonEnd,
        entryFee = 25,
        ringConfig
      } = req.body;
      
      // Get next season number
      const lastSeason = await Season.findOne().sort({ seasonNumber: -1 });
      const seasonNumber = (lastSeason?.seasonNumber || 0) + 1;
      
      const season = await Season.create({
        name,
        seasonNumber,
        status: 'upcoming',
        timeline: {
          registrationStart: new Date(registrationStart),
          registrationEnd: new Date(registrationEnd),
          seasonStart: new Date(seasonStart),
          seasonEnd: new Date(seasonEnd)
        },
        entryFee,
        ringConfig: ringConfig || {
          preset: 'competitive',
          ringCount: 4,
          centerTerritories: 5,
          innerRingBase: 15,
          outerRingBase: 30
        },
        createdBy: req.admin._id
      });
      
      res.json({ success: true, data: { season } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Update season
router.put('/:seasonId',
  roleCheck('seasons:update'),
  auditLogger('SEASON_UPDATE', (req) => ({
    type: 'season',
    id: req.params.seasonId,
    changes: req.body
  })),
  async (req, res) => {
    try {
      const season = await Season.findById(req.params.seasonId);
      
      if (!season) {
        return res.status(404).json({
          success: false,
          error: { code: 'SEASON_NOT_FOUND', message: 'Season not found' }
        });
      }
      
      // Cannot edit active season (except Super Admin for emergencies)
      if (season.status === 'active' && req.admin.role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: { code: 'SEASON_ACTIVE', message: 'Cannot edit active season' }
        });
      }
      
      Object.assign(season, req.body);
      await season.save();
      
      res.json({ success: true, data: { season } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Start season (Super Admin only)
router.post('/:seasonId/start',
  requireRole('super_admin'),
  auditLogger('SEASON_START', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findByIdAndUpdate(
        req.params.seasonId,
        { 
          status: 'active',
          'timeline.actualStart': new Date()
        },
        { new: true }
      );
      
      res.json({ success: true, data: { season, message: 'Season started!' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// End season (Super Admin only)
router.post('/:seasonId/end',
  requireRole('super_admin'),
  auditLogger('SEASON_END', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findByIdAndUpdate(
        req.params.seasonId,
        { 
          status: 'completed',
          'timeline.actualEnd': new Date()
        },
        { new: true }
      );
      
      // TODO: Trigger prize distribution
      
      res.json({ success: true, data: { season, message: 'Season ended!' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Delete season (Super Admin only, only if upcoming)
router.delete('/:seasonId',
  requireRole('super_admin'),
  auditLogger('SEASON_DELETE', (req) => ({
    type: 'season',
    id: req.params.seasonId
  })),
  async (req, res) => {
    try {
      const season = await Season.findById(req.params.seasonId);
      
      if (season.status !== 'upcoming') {
        return res.status(400).json({
          success: false,
          error: { code: 'CANNOT_DELETE', message: 'Can only delete upcoming seasons' }
        });
      }
      
      await season.deleteOne();
      
      res.json({ success: true, data: { message: 'Season deleted' } });
    } catch (error) {
      res.status(500).json({ success: false, error: { message: error.message } });
    }
});

// Get season analytics
router.get('/:seasonId/analytics', roleCheck('analytics:read'), async (req, res) => {
  try {
    const seasonId = req.params.seasonId;
    
    const [playerStats, tribeStats, battleStats, economyStats] = await Promise.all([
      // Player stats
      User.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        { $group: {
          _id: null,
          totalPlayers: { $sum: 1 },
          totalGold: { $sum: '$gold' },
          totalVP: { $sum: '$victoryPoints' },
          avgGold: { $avg: '$gold' }
        }}
      ]),
      
      // Tribe stats
      Tribe.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        { $group: {
          _id: null,
          totalTribes: { $sum: 1 },
          avgMembers: { $avg: { $size: '$members' } }
        }}
      ]),
      
      // Battle stats
      Battle.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        { $group: {
          _id: null,
          totalBattles: { $sum: 1 },
          attackerWins: { $sum: { $cond: ['$attackerWon', 1, 0] } }
        }}
      ]),
      
      // Economy per day
      User.aggregate([
        { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
        { $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          newPlayers: { $sum: 1 },
          goldGenerated: { $sum: '$totalGoldEarned' }
        }},
        { $sort: { _id: 1 } }
      ])
    ]);
    
    res.json({
      success: true,
      data: {
        players: playerStats[0] || {},
        tribes: tribeStats[0] || {},
        battles: battleStats[0] || {},
        daily: economyStats
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
```

### 3.5 Analytics Routes

**server/routes/admin/analytics.js:**
```javascript
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../../models/User');
const Tribe = require('../../models/Tribe');
const Battle = require('../../models/Battle');
const Season = require('../../models/Season');
const { roleCheck } = require('../../middleware/roleCheck');

// Dashboard overview
router.get('/dashboard', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;
    
    // Current/active season
    const currentSeason = seasonId 
      ? await Season.findById(seasonId)
      : await Season.findOne({ status: 'active' });
    
    if (!currentSeason) {
      return res.json({ 
        success: true, 
        data: { noActiveSeason: true } 
      });
    }
    
    const sId = currentSeason._id;
    
    const [
      playerCount,
      tribeCount,
      battleCountToday,
      battleCountTotal,
      topTribes,
      recentBattles,
      alerts
    ] = await Promise.all([
      User.countDocuments({ seasonId: sId }),
      Tribe.countDocuments({ seasonId: sId }),
      Battle.countDocuments({ 
        seasonId: sId,
        timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      }),
      Battle.countDocuments({ seasonId: sId }),
      Tribe.find({ seasonId: sId })
        .sort({ victoryPoints: -1 })
        .limit(5)
        .select('name tag victoryPoints memberCount'),
      Battle.find({ seasonId: sId })
        .sort({ timestamp: -1 })
        .limit(10)
        .populate('attackerId', 'username')
        .populate('defenderId', 'username'),
      generateAlerts(sId)
    ]);
    
    // Calculate season progress
    const now = new Date();
    const start = currentSeason.timeline.seasonStart;
    const end = currentSeason.timeline.seasonEnd;
    const totalDays = (end - start) / (24 * 60 * 60 * 1000);
    const elapsedDays = Math.max(0, (now - start) / (24 * 60 * 60 * 1000));
    const dayNumber = Math.min(Math.ceil(elapsedDays), totalDays);
    
    res.json({
      success: true,
      data: {
        season: {
          id: currentSeason._id,
          name: currentSeason.name,
          status: currentSeason.status,
          dayNumber,
          totalDays,
          prizePool: currentSeason.prizePool
        },
        stats: {
          playerCount,
          tribeCount,
          battleCountToday,
          battleCountTotal
        },
        topTribes,
        recentBattles,
        alerts
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Generate alerts
async function generateAlerts(seasonId) {
  const alerts = [];
  
  // Check for flagged players
  const flaggedPlayers = await User.countDocuments({
    seasonId,
    'flags.isUnderReview': true
  });
  if (flaggedPlayers > 0) {
    alerts.push({
      type: 'warning',
      message: `${flaggedPlayers} players flagged for review`,
      action: '/admin/players?filter=flagged'
    });
  }
  
  // Check for pending reports
  const Report = mongoose.model('Report');
  const pendingReports = await Report.countDocuments({ status: 'pending' });
  if (pendingReports > 0) {
    alerts.push({
      type: 'info',
      message: `${pendingReports} reports pending moderation`,
      action: '/admin/moderation/reports'
    });
  }
  
  // Check for snowball (top tribe too far ahead)
  const topTribes = await Tribe.find({ seasonId })
    .sort({ victoryPoints: -1 })
    .limit(2)
    .select('victoryPoints');
  
  if (topTribes.length >= 2) {
    const vpGap = topTribes[0].victoryPoints / (topTribes[1].victoryPoints || 1);
    if (vpGap > 1.5) {
      alerts.push({
        type: 'warning',
        message: `Top tribe ${Math.round((vpGap - 1) * 100)}% ahead (snowball risk)`,
        action: '/admin/analytics/balance'
      });
    }
  }
  
  return alerts;
}

// Economy analytics
router.get('/economy', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;
    
    const economyData = await User.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $group: {
          _id: null,
          totalGoldInCirculation: { $sum: '$gold' },
          averageGold: { $avg: '$gold' },
          medianGold: { $avg: '$gold' }, // Simplified
          totalUnits: { 
            $sum: { 
              $add: [
                '$army.militia', 
                '$army.spearman', 
                '$army.archer', 
                '$army.cavalry'
              ] 
            } 
          },
          avgUnitsPerPlayer: {
            $avg: { 
              $add: [
                '$army.militia', 
                '$army.spearman', 
                '$army.archer', 
                '$army.cavalry'
              ] 
            }
          }
        }
      }
    ]);
    
    // Gold distribution (buckets)
    const goldDistribution = await User.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $bucket: {
          groupBy: '$gold',
          boundaries: [0, 500, 1000, 2500, 5000, 10000, 50000],
          default: '50000+',
          output: { count: { $sum: 1 } }
        }
      }
    ]);
    
    res.json({
      success: true,
      data: {
        overview: economyData[0] || {},
        goldDistribution
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

// Balance analytics (for snowball detection)
router.get('/balance', roleCheck('analytics:read'), async (req, res) => {
  try {
    const { seasonId } = req.query;
    
    // VP distribution by tribe
    const vpByTribe = await Tribe.find({ seasonId })
      .sort({ victoryPoints: -1 })
      .select('name tag victoryPoints memberCount territoriesControlled');
    
    // Territory control
    const Territory = mongoose.model('Territory');
    const territoryControl = await Territory.aggregate([
      { $match: { seasonId: new mongoose.Types.ObjectId(seasonId) } },
      {
        $group: {
          _id: '$ownerId',
          count: { $sum: 1 },
          tiers: { $push: '$tier' }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    res.json({
      success: true,
      data: {
        vpByTribe,
        territoryControl
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
});

module.exports = router;
```

---

## 🎨 PHASE 4: ADMIN FRONTEND

### 4.1 Setup Admin React App

**admin/package.json:**
```json
{
  "name": "cryptotribes-admin",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-admin": "^4.16.0",
    "ra-data-simple-rest": "^4.16.0",
    "@mui/material": "^5.14.0",
    "@mui/icons-material": "^5.14.0",
    "@emotion/react": "^11.11.0",
    "@emotion/styled": "^11.11.0",
    "recharts": "^2.10.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0"
  }
}
```

**admin/vite.config.js:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

### 4.2 Main App

**admin/src/App.jsx:**
```jsx
import { Admin, Resource, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { theme } from './theme';

// Resources
import { SeasonList, SeasonCreate, SeasonEdit, SeasonShow } from './resources/seasons';
import { PlayerList, PlayerShow } from './resources/players';
import { TribeList, TribeShow } from './resources/tribes';
import { BattleList, BattleShow } from './resources/battles';
import { ReportList } from './resources/moderation/ReportList';
import { AppealList } from './resources/moderation/AppealList';
import { AuditLogList } from './resources/config/AuditLogs';
import { AdminList } from './resources/config/AdminList';
import Dashboard from './resources/analytics/Dashboard';

// Icons
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import MapIcon from '@mui/icons-material/Map';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import ReportIcon from '@mui/icons-material/Report';
import GavelIcon from '@mui/icons-material/Gavel';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import EventIcon from '@mui/icons-material/Event';

const App = () => (
  <Admin
    authProvider={authProvider}
    dataProvider={dataProvider}
    dashboard={Dashboard}
    theme={theme}
    title="CryptoTribes Admin"
  >
    {permissions => (
      <>
        <Resource
          name="seasons"
          list={SeasonList}
          create={['super_admin', 'game_master'].includes(permissions) ? SeasonCreate : null}
          edit={['super_admin', 'game_master'].includes(permissions) ? SeasonEdit : null}
          show={SeasonShow}
          icon={EventIcon}
        />
        
        <Resource
          name="players"
          list={PlayerList}
          show={PlayerShow}
          icon={PeopleIcon}
        />
        
        <Resource
          name="tribes"
          list={TribeList}
          show={TribeShow}
          icon={GroupsIcon}
        />
        
        <Resource
          name="battles"
          list={['super_admin', 'game_master'].includes(permissions) ? BattleList : null}
          show={['super_admin', 'game_master'].includes(permissions) ? BattleShow : null}
          icon={SportsKabaddiIcon}
        />
        
        <Resource
          name="reports"
          list={ReportList}
          icon={ReportIcon}
          options={{ label: 'Reports' }}
        />
        
        <Resource
          name="appeals"
          list={['super_admin', 'game_master'].includes(permissions) ? AppealList : null}
          icon={GavelIcon}
        />
        
        {permissions === 'super_admin' && (
          <>
            <Resource
              name="admins"
              list={AdminList}
              icon={SettingsIcon}
              options={{ label: 'Admin Users' }}
            />
            <Resource
              name="audit-logs"
              list={AuditLogList}
              icon={HistoryIcon}
              options={{ label: 'Audit Logs' }}
            />
          </>
        )}
      </>
    )}
  </Admin>
);

export default App;
```

### 4.3 Auth Provider

**admin/src/authProvider.js:**
```javascript
const API_URL = '/api/admin';

export const authProvider = {
  login: async ({ username, password, walletAddress, signature }) => {
    // Super Admin login
    if (username && password) {
      const response = await fetch(`${API_URL}/auth/login/super`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: username, password })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      localStorage.setItem('adminToken', data.data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
      localStorage.setItem('adminRole', data.data.admin.role);
      return;
    }
    
    // Wallet login
    if (walletAddress && signature) {
      const response = await fetch(`${API_URL}/auth/login/wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, message: 'Admin Login' })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      localStorage.setItem('adminToken', data.data.token);
      localStorage.setItem('adminUser', JSON.stringify(data.data.admin));
      localStorage.setItem('adminRole', data.data.admin.role);
      return;
    }
    
    throw new Error('Invalid login credentials');
  },
  
  logout: () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminRole');
    return Promise.resolve();
  },
  
  checkAuth: () => {
    return localStorage.getItem('adminToken')
      ? Promise.resolve()
      : Promise.reject();
  },
  
  checkError: (error) => {
    if (error.status === 401 || error.status === 403) {
      localStorage.removeItem('adminToken');
      return Promise.reject();
    }
    return Promise.resolve();
  },
  
  getIdentity: () => {
    const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
    return Promise.resolve({
      id: user.id,
      fullName: user.username,
      avatar: undefined
    });
  },
  
  getPermissions: () => {
    const role = localStorage.getItem('adminRole');
    return Promise.resolve(role);
  }
};
```

### 4.4 Data Provider

**admin/src/dataProvider.js:**
```javascript
import { fetchUtils } from 'react-admin';

const API_URL = '/api/admin';

const httpClient = (url, options = {}) => {
  const token = localStorage.getItem('adminToken');
  options.headers = new Headers({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  });
  return fetchUtils.fetchJson(url, options);
};

export const dataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination;
    const { field, order } = params.sort;
    const query = params.filter;
    
    const url = `${API_URL}/${resource}?page=${page}&limit=${perPage}&sort=${field}&order=${order}&${new URLSearchParams(query)}`;
    
    const { json } = await httpClient(url);
    
    return {
      data: json.data.map(item => ({ ...item, id: item._id || item.id })),
      total: json.meta?.total || json.data.length
    };
  },
  
  getOne: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`);
    return { 
      data: { ...json.data, id: json.data._id || json.data.id } 
    };
  },
  
  getMany: async (resource, params) => {
    const query = params.ids.map(id => `id=${id}`).join('&');
    const { json } = await httpClient(`${API_URL}/${resource}?${query}`);
    return { 
      data: json.data.map(item => ({ ...item, id: item._id || item.id })) 
    };
  },
  
  create: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}`, {
      method: 'POST',
      body: JSON.stringify(params.data)
    });
    return { 
      data: { ...json.data, id: json.data._id || json.data.id } 
    };
  },
  
  update: async (resource, params) => {
    const { json } = await httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'PUT',
      body: JSON.stringify(params.data)
    });
    return { 
      data: { ...json.data, id: json.data._id || json.data.id } 
    };
  },
  
  delete: async (resource, params) => {
    await httpClient(`${API_URL}/${resource}/${params.id}`, {
      method: 'DELETE'
    });
    return { data: { id: params.id } };
  },
  
  // Custom actions
  ban: async (playerId, data) => {
    const { json } = await httpClient(`${API_URL}/players/${playerId}/ban`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return json;
  },
  
  warn: async (playerId, data) => {
    const { json } = await httpClient(`${API_URL}/players/${playerId}/warn`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return json;
  },
  
  compensate: async (playerId, data) => {
    const { json } = await httpClient(`${API_URL}/players/${playerId}/compensate`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return json;
  }
};
```

### 4.5 Dashboard

**admin/src/resources/analytics/Dashboard.jsx:**
```jsx
import { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Grid, Box, Alert, Chip } from '@mui/material';
import { useDataProvider } from 'react-admin';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import GroupsIcon from '@mui/icons-material/Groups';
import SportsKabaddiIcon from '@mui/icons-material/SportsKabaddi';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00C49F'];

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Box>
          <Typography color="textSecondary" gutterBottom variant="overline">
            {title}
          </Typography>
          <Typography variant="h4">{value}</Typography>
        </Box>
        <Icon sx={{ fontSize: 48, color, opacity: 0.3 }} />
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const dataProvider = useDataProvider();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/admin/analytics/dashboard', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('adminToken')}`
      }
    })
      .then(res => res.json())
      .then(result => {
        setData(result.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);
  
  if (loading) return <Typography>Loading...</Typography>;
  if (!data) return <Typography>No data</Typography>;
  if (data.noActiveSeason) {
    return (
      <Box p={3}>
        <Alert severity="info">
          No active season. Create a new season to see dashboard data.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box p={3}>
      {/* Season Header */}
      <Card sx={{ mb: 3, bgcolor: '#1a1a2e' }}>
        <CardContent>
          <Typography variant="h5" color="primary">
            {data.season.name}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Day {data.season.dayNumber} of {data.season.totalDays} • 
            Status: <Chip label={data.season.status} size="small" color="success" /> •
            Prize Pool: ${data.season.prizePool?.toLocaleString()}
          </Typography>
        </CardContent>
      </Card>
      
      {/* Alerts */}
      {data.alerts?.length > 0 && (
        <Box mb={3}>
          {data.alerts.map((alert, i) => (
            <Alert key={i} severity={alert.type} sx={{ mb: 1 }}>
              {alert.message}
            </Alert>
          ))}
        </Box>
      )}
      
      {/* Stats Grid */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Players"
            value={data.stats.playerCount}
            icon={PeopleIcon}
            color="#8884d8"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Tribes"
            value={data.stats.tribeCount}
            icon={GroupsIcon}
            color="#82ca9d"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Battles Today"
            value={data.stats.battleCountToday}
            icon={SportsKabaddiIcon}
            color="#ffc658"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Battles"
            value={data.stats.battleCountTotal}
            icon={AttachMoneyIcon}
            color="#ff7300"
          />
        </Grid>
      </Grid>
      
      {/* Top Tribes */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Top Tribes</Typography>
              {data.topTribes?.map((tribe, i) => (
                <Box key={tribe._id} display="flex" justifyContent="space-between" py={1}>
                  <Typography>
                    #{i + 1} [{tribe.tag}] {tribe.name}
                  </Typography>
                  <Typography color="primary">
                    {tribe.victoryPoints?.toLocaleString()} VP
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>Recent Battles</Typography>
              {data.recentBattles?.slice(0, 5).map((battle) => (
                <Box key={battle._id} py={1} borderBottom="1px solid #333">
                  <Typography variant="body2">
                    {battle.attackerId?.username || 'Unknown'} → {battle.defenderId?.username || 'NPC'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {battle.attackerWon ? '⚔️ Attacker Won' : '🛡️ Defender Won'}
                  </Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
```

---

## 🚨 CRITICAL RULES

```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   ❌ NEVER ask questions - USER IS SLEEPING                ║
║   ❌ NEVER offer options A/B/C                             ║
║   ❌ NEVER stop until admin panel is functional            ║
║   ❌ NEVER skip files - create ALL files completely        ║
║                                                            ║
║   ✅ CREATE all backend routes from ADMIN_SYSTEM.md        ║
║   ✅ CREATE all frontend pages with React-Admin            ║
║   ✅ TEST each route after creation                        ║
║   ✅ UPDATE ADMIN_TRACKER.json after each file             ║
║   ✅ GIT COMMIT after each module                          ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## ✅ SUCCESS CRITERIA

Admin panel is COMPLETE when:

```json
{
  "backend": {
    "models": { "Admin": true, "Report": true, "Appeal": true },
    "middleware": { "adminAuth": true, "roleCheck": true, "auditLogger": true },
    "routes": {
      "auth": "5 endpoints",
      "seasons": "8 endpoints",
      "players": "8 endpoints",
      "tribes": "7 endpoints",
      "battles": "5 endpoints",
      "moderation": "6 endpoints",
      "analytics": "5 endpoints",
      "config": "5 endpoints",
      "auditLogs": "2 endpoints"
    }
  },
  "frontend": {
    "setup": true,
    "dashboard": true,
    "allResources": true,
    "roleBasedAccess": true
  },
  "tests": {
    "authWorks": true,
    "rolePermissions": true,
    "auditLogging": true
  },
  "admin_ready": true
}
```

**Final verification:**
```bash
# Start admin panel
cd admin && npm run dev

# Open http://localhost:5174
# Login with Super Admin credentials
# See dashboard with all features
```

---

## 🎬 START EXECUTION

```bash
# 1. Create ADMIN_TRACKER.json
# 2. Create all backend models
# 3. Create all middleware
# 4. Create all routes
# 5. Setup admin React app
# 6. Create all frontend components
# 7. Test everything

cat > ADMIN_TRACKER.json << 'EOF'
{"meta":{"started":"","phase":"init"},"admin_ready":false}
EOF

# Begin creating files...
```

**DO NOT STOP UNTIL ADMIN PANEL IS FULLY FUNCTIONAL.**
