/**
 * PAYMENT ROUTES
 * Stripe and crypto payment processing
 */

const express = require('express');
const router = express.Router();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const Payment = require('../models/Payment');
const Season = require('../models/Season');
const User = require('../models/User');
const logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');
const { paymentRateLimiter, webhookRateLimiter } = require('../middleware/rateLimit');
const {
  asyncHandler,
  NotFoundError,
  AppError,
  ConflictError,
} = require('../middleware/errorHandler');
const { validate, paymentSchemas } = require('../middleware/validator');

/**
 * @route   GET /api/v1/payments/history
 * @desc    Get user's payment history
 * @access  Private
 */
router.get('/history',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, status } = req.query;

    const query = { odooPartnerId: req.user.odooPartnerId };
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      Payment.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Payment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/payments/:id
 * @desc    Get payment details
 * @access  Private
 */
router.get('/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id).lean();

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    // Verify ownership
    if (!payment.odooPartnerId.equals(req.user.odooPartnerId)) {
      throw new AppError('Not authorized to view this payment', 403, 'FORBIDDEN');
    }

    res.json({
      success: true,
      data: payment,
    });
  })
);

/**
 * @route   POST /api/v1/payments/season/:seasonId
 * @desc    Create season entry payment
 * @access  Private
 */
router.post('/season/:seasonId',
  authenticate,
  paymentRateLimiter,
  asyncHandler(async (req, res) => {
    const { paymentMethod = 'stripe' } = req.body;

    const season = await Season.findById(req.params.seasonId);
    if (!season) {
      throw new NotFoundError('Season');
    }

    if (season.status !== 'scheduled' && season.status !== 'active') {
      throw new AppError('Cannot pay for this season', 400, 'INVALID_SEASON');
    }

    // Check for existing completed payment
    const existingPayment = await Payment.findOne({
      odooPartnerId: req.user.odooPartnerId,
      seasonId: season._id,
      type: 'season_entry',
      status: 'completed',
    });

    if (existingPayment) {
      throw new ConflictError('Already paid for this season');
    }

    // Check for pending payment
    const pendingPayment = await Payment.findOne({
      odooPartnerId: req.user.odooPartnerId,
      seasonId: season._id,
      type: 'season_entry',
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });

    if (pendingPayment) {
      return res.json({
        success: true,
        message: 'Payment already initiated',
        data: {
          paymentId: pendingPayment._id,
          status: pendingPayment.status,
          paymentUrl: pendingPayment.metadata?.paymentUrl,
          expiresAt: pendingPayment.expiresAt,
        },
      });
    }

    let payment;

    if (paymentMethod === 'stripe') {
      // Create Stripe checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${season.name} - Season Entry`,
              description: 'Entry fee for CryptoTribes season',
            },
            unit_amount: season.entryFee * 100, // Stripe uses cents
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: req.user.id.toString(),
          seasonId: season._id.toString(),
          type: 'season_entry',
        },
      });

      payment = await Payment.create({
        odooPartnerId: req.user.odooPartnerId,
        odooUserId: req.user.odooUserId,
        seasonId: season._id,
        type: 'season_entry',
        amount: {
          value: season.entryFee,
          currency: 'USD',
        },
        paymentMethod: 'stripe',
        status: 'pending',
        stripe: {
          sessionId: session.id,
          paymentIntentId: session.payment_intent,
        },
        metadata: {
          paymentUrl: session.url,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      logger.info('Stripe payment initiated', {
        paymentId: payment._id,
        userId: req.user.id,
        seasonId: season._id,
        amount: season.entryFee,
      });

      res.json({
        success: true,
        data: {
          paymentId: payment._id,
          paymentUrl: session.url,
          sessionId: session.id,
          expiresAt: payment.expiresAt,
        },
      });

    } else if (paymentMethod === 'crypto') {
      // Create crypto payment
      const cryptoAddress = process.env.CRYPTO_DEPOSIT_ADDRESS;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      payment = await Payment.create({
        odooPartnerId: req.user.odooPartnerId,
        odooUserId: req.user.odooUserId,
        seasonId: season._id,
        type: 'season_entry',
        amount: {
          value: season.entryFee,
          currency: 'USD',
        },
        paymentMethod: 'crypto',
        status: 'awaiting_payment',
        crypto: {
          currency: 'USDT',
          network: 'ethereum',
          depositAddress: cryptoAddress,
          expectedAmount: season.entryFee,
        },
        expiresAt,
      });

      logger.info('Crypto payment initiated', {
        paymentId: payment._id,
        userId: req.user.id,
        seasonId: season._id,
      });

      res.json({
        success: true,
        data: {
          paymentId: payment._id,
          depositAddress: cryptoAddress,
          expectedAmount: season.entryFee,
          currency: 'USDT',
          network: 'ethereum',
          expiresAt,
          instructions: 'Send exact amount to the deposit address. Payment will be verified automatically.',
        },
      });
    } else {
      throw new AppError('Invalid payment method', 400, 'INVALID_METHOD');
    }
  })
);

/**
 * @route   POST /api/v1/payments/:id/verify
 * @desc    Verify crypto payment (manual verification)
 * @access  Private
 */
router.post('/:id/verify',
  authenticate,
  validate(paymentSchemas.verifyPayment),
  asyncHandler(async (req, res) => {
    const { transactionHash } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      throw new NotFoundError('Payment');
    }

    if (!payment.odooPartnerId.equals(req.user.odooPartnerId)) {
      throw new AppError('Not authorized', 403, 'FORBIDDEN');
    }

    if (payment.status === 'completed') {
      return res.json({
        success: true,
        message: 'Payment already completed',
        data: { status: 'completed' },
      });
    }

    if (payment.paymentMethod !== 'crypto') {
      throw new AppError('Verification only for crypto payments', 400, 'INVALID_METHOD');
    }

    // Update with transaction hash for admin verification
    payment.crypto.transactionHash = transactionHash;
    payment.status = 'processing';
    await payment.save();

    logger.info('Crypto payment verification submitted', {
      paymentId: payment._id,
      transactionHash,
    });

    res.json({
      success: true,
      message: 'Payment verification submitted. Will be processed within 24 hours.',
      data: {
        status: 'processing',
        transactionHash,
      },
    });
  })
);

/**
 * @route   POST /api/v1/payments/webhook/stripe
 * @desc    Stripe webhook handler
 * @access  Public (with signature verification)
 */
router.post('/webhook/stripe',
  webhookRateLimiter,
  express.raw({ type: 'application/json' }),
  asyncHandler(async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody || req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error('Stripe webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Webhook signature verification failed' });
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;

        const payment = await Payment.findOne({
          'stripe.sessionId': session.id,
        });

        if (payment) {
          payment.status = 'completed';
          payment.stripe.paymentIntentId = session.payment_intent;
          payment.completedAt = new Date();
          await payment.save();

          // Add to season prize pool
          const season = await Season.findById(payment.seasonId);
          if (season) {
            await season.addToprizePool(payment.amount.value);
          }

          logger.info('Stripe payment completed', {
            paymentId: payment._id,
            sessionId: session.id,
          });
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;

        await Payment.updateOne(
          { 'stripe.paymentIntentId': paymentIntent.id },
          {
            status: 'failed',
            'error.message': paymentIntent.last_payment_error?.message,
            'error.code': paymentIntent.last_payment_error?.code,
          }
        );

        logger.warn('Stripe payment failed', {
          paymentIntentId: paymentIntent.id,
          error: paymentIntent.last_payment_error?.message,
        });
        break;
      }
    }

    res.json({ received: true });
  })
);

/**
 * @route   GET /api/v1/payments/products
 * @desc    Get available products for purchase
 * @access  Private
 */
router.get('/products',
  authenticate,
  asyncHandler(async (req, res) => {
    const products = [
      {
        id: 'gold_pack_small',
        name: 'Small Gold Pack',
        description: '500 Gold',
        amount: 500,
        price: 4.99,
        currency: 'USD',
        type: 'gold_pack',
      },
      {
        id: 'gold_pack_medium',
        name: 'Medium Gold Pack',
        description: '1200 Gold (+200 bonus)',
        amount: 1200,
        price: 9.99,
        currency: 'USD',
        type: 'gold_pack',
        bonus: 200,
      },
      {
        id: 'gold_pack_large',
        name: 'Large Gold Pack',
        description: '3000 Gold (+600 bonus)',
        amount: 3000,
        price: 19.99,
        currency: 'USD',
        type: 'gold_pack',
        bonus: 600,
      },
      {
        id: 'gems_small',
        name: 'Gem Pouch',
        description: '50 Gems',
        amount: 50,
        price: 4.99,
        currency: 'USD',
        type: 'premium_currency',
      },
      {
        id: 'gems_large',
        name: 'Gem Chest',
        description: '150 Gems (+30 bonus)',
        amount: 150,
        price: 9.99,
        currency: 'USD',
        type: 'premium_currency',
        bonus: 30,
      },
    ];

    res.json({
      success: true,
      data: products,
    });
  })
);

/**
 * @route   POST /api/v1/payments/purchase
 * @desc    Purchase a product
 * @access  Private
 */
router.post('/purchase',
  authenticate,
  paymentRateLimiter,
  validate(paymentSchemas.createPayment),
  asyncHandler(async (req, res) => {
    const { type, paymentMethod, productId, cryptoCurrency } = req.body;

    // Get product details (in a real app, these would be in a database)
    const products = {
      gold_pack_small: { price: 4.99, gold: 500 },
      gold_pack_medium: { price: 9.99, gold: 1200 },
      gold_pack_large: { price: 19.99, gold: 3000 },
      gems_small: { price: 4.99, gems: 50 },
      gems_large: { price: 9.99, gems: 150 },
    };

    const product = products[productId];
    if (!product) {
      throw new NotFoundError('Product');
    }

    if (paymentMethod === 'stripe') {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: productId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            },
            unit_amount: product.price * 100,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
        metadata: {
          userId: req.user.id.toString(),
          type,
          productId,
        },
      });

      const payment = await Payment.create({
        odooPartnerId: req.user.odooPartnerId,
        odooUserId: req.user.odooUserId,
        type,
        amount: {
          value: product.price,
          currency: 'USD',
        },
        paymentMethod: 'stripe',
        status: 'pending',
        stripe: {
          sessionId: session.id,
        },
        metadata: {
          productId,
          deliverables: product,
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });

      res.json({
        success: true,
        data: {
          paymentId: payment._id,
          paymentUrl: session.url,
        },
      });
    } else {
      throw new AppError('Payment method not supported for this product', 400);
    }
  })
);

module.exports = router;
