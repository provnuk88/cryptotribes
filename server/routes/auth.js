/**
 * AUTHENTICATION ROUTES
 * Wallet-based authentication with Web3 signature verification
 */

const express = require('express');
const crypto = require('crypto');
const { ethers } = require('ethers');
const router = express.Router();

const User = require('../models/User');
const logger = require('../utils/logger');
const {
  authenticate,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimit');
const { asyncHandler, ValidationError, AppError } = require('../middleware/errorHandler');
const { validate, authSchemas } = require('../middleware/validator');
const { actionTracker } = require('../middleware/requestLogger');

// Apply rate limiter to all auth routes
router.use(authRateLimiter);

/**
 * @route   GET /api/v1/auth/nonce/:walletAddress
 * @desc    Get nonce for wallet signature
 * @access  Public
 */
router.get('/nonce/:walletAddress', asyncHandler(async (req, res) => {
  const { walletAddress } = req.params;

  // Validate wallet address format
  if (!ethers.isAddress(walletAddress)) {
    throw new ValidationError('Invalid wallet address format');
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Find or create user
  let user = await User.findOne({ walletAddress: normalizedAddress });

  if (!user) {
    // Generate nonce for new user
    const nonce = crypto.randomBytes(32).toString('hex');

    return res.json({
      success: true,
      data: {
        nonce,
        message: `Sign this message to authenticate with CryptoTribes:\n\nNonce: ${nonce}`,
        isNewUser: true,
      },
    });
  }

  // Generate new nonce for existing user
  user.auth.nonce = crypto.randomBytes(32).toString('hex');
  user.auth.nonceExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save();

  res.json({
    success: true,
    data: {
      nonce: user.auth.nonce,
      message: `Sign this message to authenticate with CryptoTribes:\n\nNonce: ${user.auth.nonce}`,
      isNewUser: false,
    },
  });
}));

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register new user with wallet signature
 * @access  Public
 */
router.post('/register',
  validate(authSchemas.register),
  asyncHandler(async (req, res) => {
    const { walletAddress, signature, displayName, referralCode } = req.body;

    const normalizedAddress = walletAddress.toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ walletAddress: normalizedAddress });
    if (existingUser) {
      throw new AppError('Wallet already registered. Please login.', 409, 'USER_EXISTS');
    }

    // Generate nonce and verify signature
    const nonce = req.body.nonce || crypto.randomBytes(32).toString('hex');
    const message = `Sign this message to authenticate with CryptoTribes:\n\nNonce: ${nonce}`;

    // Verify signature
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw new ValidationError('Invalid signature');
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      throw new ValidationError('Signature does not match wallet address');
    }

    // Check displayName uniqueness if provided
    if (displayName) {
      const nameExists = await User.findOne({ 'profile.displayName': displayName });
      if (nameExists) {
        throw new AppError('Display name already taken', 409, 'NAME_TAKEN');
      }
    }

    // Handle referral
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode });
      if (!referrer) {
        logger.warn('Invalid referral code used', { code: referralCode, wallet: normalizedAddress });
      }
    }

    // Create user
    const user = await User.create({
      walletAddress: normalizedAddress,
      profile: {
        displayName: displayName || `Player_${normalizedAddress.slice(-8)}`,
      },
      referredBy: referrer?._id,
      auth: {
        nonce: crypto.randomBytes(32).toString('hex'),
        nonceExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token hash
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    user.auth.refreshTokens.push({
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      device: req.get('User-Agent'),
      ip: req.ip,
    });
    await user.save();

    // Update referrer if valid
    if (referrer) {
      await User.updateOne(
        { _id: referrer._id },
        { $push: { referrals: user._id } }
      );
    }

    logger.info('New user registered', {
      userId: user._id,
      walletAddress: normalizedAddress,
      referrer: referrer?._id,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          displayName: user.profile.displayName,
          role: user.role,
        },
        accessToken,
        refreshToken,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/login
 * @desc    Login with wallet signature
 * @access  Public
 */
router.post('/login',
  validate(authSchemas.login),
  actionTracker('login'),
  asyncHandler(async (req, res) => {
    const { walletAddress, signature } = req.body;

    const normalizedAddress = walletAddress.toLowerCase();

    // Find user
    const user = await User.findOne({ walletAddress: normalizedAddress })
      .select('+auth.nonce +auth.nonceExpiresAt +auth.refreshTokens');

    if (!user) {
      throw new AppError('Wallet not registered. Please register first.', 404, 'USER_NOT_FOUND');
    }

    // Check if user is banned
    if (user.status === 'banned') {
      throw new AppError('Account is banned', 403, 'ACCOUNT_BANNED');
    }

    // Check if nonce is valid
    if (!user.auth.nonce) {
      throw new AppError('Please request a nonce first', 400, 'NONCE_REQUIRED');
    }

    if (user.auth.nonceExpiresAt < new Date()) {
      throw new AppError('Nonce expired. Please request a new one.', 400, 'NONCE_EXPIRED');
    }

    // Verify signature
    const message = `Sign this message to authenticate with CryptoTribes:\n\nNonce: ${user.auth.nonce}`;
    let recoveredAddress;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch (error) {
      throw new ValidationError('Invalid signature');
    }

    if (recoveredAddress.toLowerCase() !== normalizedAddress) {
      throw new ValidationError('Signature does not match wallet address');
    }

    // Generate new tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token and invalidate old ones (keep last 5)
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Remove expired tokens and keep only last 5
    user.auth.refreshTokens = user.auth.refreshTokens
      .filter(t => t.expiresAt > new Date())
      .slice(-4);

    user.auth.refreshTokens.push({
      tokenHash: refreshTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      device: req.get('User-Agent'),
      ip: req.ip,
    });

    // Regenerate nonce for next login
    user.auth.nonce = crypto.randomBytes(32).toString('hex');
    user.auth.nonceExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Update last login
    user.activity.lastLogin = new Date();
    user.activity.loginCount = (user.activity.loginCount || 0) + 1;
    user.activity.loginHistory.push({
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
    });

    await user.save();

    logger.info('User logged in', { userId: user._id, walletAddress: normalizedAddress });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          walletAddress: user.walletAddress,
          displayName: user.profile.displayName,
          role: user.role,
          tribeId: user.currentSeason?.tribeId,
          seasonId: user.currentSeason?.seasonId,
        },
        accessToken,
        refreshToken,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh access token
 * @access  Public (with refresh token)
 */
router.post('/refresh',
  validate(authSchemas.refreshToken),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    // Verify and get user
    const user = await verifyRefreshToken(refreshToken);

    // Generate new access token
    const accessToken = generateAccessToken(user);

    res.json({
      success: true,
      data: {
        accessToken,
      },
    });
  })
);

/**
 * @route   POST /api/v1/auth/logout
 * @desc    Logout user (invalidate refresh token)
 * @access  Private
 */
router.post('/logout',
  authenticate,
  asyncHandler(async (req, res) => {
    const refreshToken = req.body.refreshToken;

    if (refreshToken) {
      const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      await User.updateOne(
        { _id: req.user.id },
        { $pull: { 'auth.refreshTokens': { tokenHash: refreshTokenHash } } }
      );
    }

    logger.info('User logged out', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  })
);

/**
 * @route   POST /api/v1/auth/logout-all
 * @desc    Logout from all devices (invalidate all refresh tokens)
 * @access  Private
 */
router.post('/logout-all',
  authenticate,
  asyncHandler(async (req, res) => {
    // Increment session version to invalidate all tokens
    await User.updateOne(
      { _id: req.user.id },
      {
        $inc: { sessionVersion: 1 },
        $set: { 'auth.refreshTokens': [] },
      }
    );

    logger.info('User logged out from all devices', { userId: req.user.id });

    res.json({
      success: true,
      message: 'Logged out from all devices',
    });
  })
);

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .populate('currentSeason.tribeId', 'name tag')
      .lean();

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: {
        id: user._id,
        walletAddress: user.walletAddress,
        displayName: user.profile.displayName,
        avatar: user.profile.avatar,
        bio: user.profile.bio,
        role: user.role,
        status: user.status,
        gold: user.gold,
        premiumCurrency: user.premiumCurrency,
        army: user.army,
        buildings: user.buildings,
        tribe: user.currentSeason?.tribeId,
        statistics: user.statistics,
        settings: user.settings,
        createdAt: user.createdAt,
      },
    });
  })
);

/**
 * @route   GET /api/v1/auth/sessions
 * @desc    Get active sessions
 * @access  Private
 */
router.get('/sessions',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('auth.refreshTokens')
      .lean();

    const sessions = user.auth.refreshTokens
      .filter(t => t.expiresAt > new Date())
      .map(t => ({
        id: t._id,
        device: t.device,
        ip: t.ip,
        createdAt: t.createdAt,
        expiresAt: t.expiresAt,
      }));

    res.json({
      success: true,
      data: sessions,
    });
  })
);

/**
 * @route   DELETE /api/v1/auth/sessions/:sessionId
 * @desc    Revoke specific session
 * @access  Private
 */
router.delete('/sessions/:sessionId',
  authenticate,
  asyncHandler(async (req, res) => {
    await User.updateOne(
      { _id: req.user.id },
      { $pull: { 'auth.refreshTokens': { _id: req.params.sessionId } } }
    );

    res.json({
      success: true,
      message: 'Session revoked',
    });
  })
);

module.exports = router;
