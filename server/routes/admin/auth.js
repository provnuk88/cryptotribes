/**
 * ADMIN AUTH ROUTES
 * Login, logout, session management for admin panel
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Admin = require('../../models/Admin');
const adminAuth = require('../../middleware/adminAuth');
const auditLogger = require('../../middleware/auditLogger');
const { ethers } = require('ethers');

/**
 * Super Admin email/password login
 * POST /api/admin/auth/login/super
 */
router.post('/login/super', async (req, res) => {
  try {
    const { email, password, twoFactorCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Email and password required' }
      });
    }

    const admin = await Admin.findOne({ email: email.toLowerCase(), role: 'super_admin' });

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
    admin.lockedUntil = null;
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

/**
 * Wallet-based login for Game Master / Moderator
 * POST /api/admin/auth/login/wallet
 */
router.post('/login/wallet', async (req, res) => {
  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Wallet address and signature required' }
      });
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(message || 'Admin Login', signature);
      if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' }
        });
      }
    } catch (e) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_SIGNATURE', message: 'Invalid signature format' }
      });
    }

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

/**
 * Get nonce for wallet login
 * GET /api/admin/auth/nonce/:walletAddress
 */
router.get('/nonce/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const nonce = Math.random().toString(36).substring(2, 15);
    const message = `CryptoTribes Admin Login\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

    res.json({
      success: true,
      data: { nonce, message }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'NONCE_ERROR', message: error.message }
    });
  }
});

/**
 * Get current admin info
 * GET /api/admin/auth/me
 */
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

/**
 * Logout (invalidate token - client side)
 * POST /api/admin/auth/logout
 */
router.post('/logout', adminAuth, auditLogger('ADMIN_LOGOUT'), (req, res) => {
  res.json({ success: true, data: { message: 'Logged out' } });
});

/**
 * Change password (Super Admin only)
 * POST /api/admin/auth/change-password
 */
router.post('/change-password', adminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'NOT_SUPER_ADMIN', message: 'Only Super Admin can change password' }
      });
    }

    const admin = await Admin.findById(req.admin._id);
    const valid = await admin.comparePassword(currentPassword);

    if (!valid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    admin.passwordHash = newPassword; // Will be hashed by pre-save hook
    await admin.save();

    res.json({ success: true, data: { message: 'Password changed successfully' } });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { code: 'PASSWORD_ERROR', message: error.message }
    });
  }
});

module.exports = router;
