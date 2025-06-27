const Stripe = require('stripe');
const axios = require('axios');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { logger } = require('./logger');

const stripe = process.env.STRIPE_SECRET_KEY ?
  new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 10000 }) : null;
const NOW_URL = 'https://api.nowpayments.io/v1';

const CRYSTAL_PACKAGES = {
  starter: { id: 'starter', name: 'Starter Pack', crystals: 100, price: 4.99 },
  popular: { id: 'popular', name: 'Popular Choice', crystals: 500, price: 19.99 },
  best: { id: 'best', name: 'Best Deal', crystals: 1200, price: 39.99 }
};

async function requestWithRetry(config, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await axios({ ...config, timeout: 10000 });
      return res.data;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function createStripePayment(userId, packageId, email) {
  if (!stripe) throw new Error('Stripe disabled');
  const pkg = CRYSTAL_PACKAGES[packageId];
  if (!pkg) throw new Error('Invalid package');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: pkg.name },
        unit_amount: Math.round(pkg.price * 100)
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: `${process.env.APP_URL}/payment/success`,
    cancel_url: `${process.env.APP_URL}/payment/cancel`,
    customer_email: email
  });

  await Payment.create({
    user_id: userId,
    transaction_id: session.id,
    amount: pkg.price,
    currency: 'usd',
    crystals: pkg.crystals,
    payment_method: 'stripe',
    package_id: packageId
  });

  return { sessionId: session.id, checkoutUrl: session.url };
}

async function createCryptoPayment(userId, packageId, currency = 'USDT') {
  const pkg = CRYSTAL_PACKAGES[packageId];
  if (!pkg) throw new Error('Invalid package');
  const data = await requestWithRetry({
    method: 'post',
    url: `${NOW_URL}/invoice`,
    headers: {
      'x-api-key': process.env.NOWPAYMENTS_API_KEY,
      'Content-Type': 'application/json'
    },
    data: {
      price_amount: pkg.price,
      price_currency: 'usd',
      pay_currency: currency.toLowerCase(),
      order_id: `${userId}_${Date.now()}`,
      ipn_callback_url: `${process.env.APP_URL}/api/payments/crypto/webhook`
    }
  });

  await Payment.create({
    user_id: userId,
    transaction_id: data.id,
    amount: pkg.price,
    currency: currency,
    crystals: pkg.crystals,
    payment_method: 'crypto',
    package_id: packageId,
    payment_address: data.pay_address
  });

  return { invoiceId: data.id, paymentUrl: data.invoice_url };
}

async function handleStripeWebhook(req, res) {
  if (!stripe) return res.status(400).end();
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const pay = await Payment.findOne({ transaction_id: session.id });
    if (pay && pay.status !== 'completed') {
      pay.status = 'completed';
      pay.completed_at = new Date();
      await pay.save();
      await User.updateOne({ _id: pay.user_id }, { $inc: { crystals: pay.crystals } });
    }
  }
  res.json({ received: true });
}

async function handleCryptoWebhook(req, res) {
  const payload = req.body;
  const pay = await Payment.findOne({ transaction_id: payload.payment_id });
  if (!pay) return res.status(404).end();
  if (payload.payment_status === 'finished' && pay.status !== 'completed') {
    pay.status = 'completed';
    pay.completed_at = new Date();
    await pay.save();
    await User.updateOne({ _id: pay.user_id }, { $inc: { crystals: pay.crystals } });
  }
  res.json({ received: true });
}

async function getUserPaymentHistory(userId) {
  return Payment.find({ user_id: userId }).sort({ created_at: -1 }).lean();
}

async function checkPaymentLimits(userId) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await Payment.aggregate([
    { $match: { user_id: userId, created_at: { $gte: oneDayAgo } } },
    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
  ]);
  const info = recent[0] || { total: 0, count: 0 };
  if (info.count >= 10) throw new Error('Daily transaction limit');
  if (info.total >= 500) throw new Error('Daily amount limit');
}

async function applyPromoCode() {
  // not implemented
  return { success: false };
}

module.exports = {
  createStripePayment,
  createCryptoPayment,
  handleStripeWebhook,
  handleCryptoWebhook,
  getUserPaymentHistory,
  checkPaymentLimits,
  applyPromoCode,
  CRYSTAL_PACKAGES
};
