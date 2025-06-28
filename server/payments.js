const crypto = require('crypto');
const { logger, paymentLogger } = require('./logger');
const Payment = require('../models/Payment');
const CrystalHistory = require('../models/CrystalHistory');
const PromoCode = require('../models/PromoCode');
const PromoUse = require('../models/PromoUse');
const User = require('../models/User');

// Конфигурация платежных систем
const PAYMENT_CONFIG = {
    // Stripe (для карт)
    stripe: {
        enabled: process.env.STRIPE_ENABLED === 'true',
        secretKey: process.env.STRIPE_SECRET_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
        currency: 'usd'
    },
    
    // NOWPayments (для крипты)
    nowpayments: {
        enabled: process.env.NOWPAYMENTS_ENABLED === 'true',
        apiKey: process.env.NOWPAYMENTS_API_KEY,
        ipnSecret: process.env.NOWPAYMENTS_IPN_SECRET,
        apiUrl: 'https://api.nowpayments.io/v1'
    },
    
    // YooMoney (для РФ)
    yoomoney: {
        enabled: process.env.YOOMONEY_ENABLED === 'true',
        shopId: process.env.YOOMONEY_SHOP_ID,
        secretKey: process.env.YOOMONEY_SECRET_KEY
    }
};

// Пакеты с кристаллами
const CRYSTAL_PACKAGES = {
    starter: {
        id: 'starter',
        name: 'Стартовый набор',
        crystals: 100,
        price: 4.99,
        bonus: 0
    },
    popular: {
        id: 'popular',
        name: 'Популярный выбор',
        crystals: 500,
        price: 19.99,
        bonus: 50 // +10% бонус
    },
    best: {
        id: 'best',
        name: 'Лучшее предложение',
        crystals: 1200,
        price: 39.99,
        bonus: 300 // +25% бонус
    },
    vip: {
        id: 'vip',
        name: 'VIP пакет',
        crystals: 3000,
        price: 89.99,
        bonus: 1000 // +33% бонус
    }
};

// === STRIPE ИНТЕГРАЦИЯ ===

let stripe = null;
if (PAYMENT_CONFIG.stripe.enabled) {
    stripe = require('stripe')(PAYMENT_CONFIG.stripe.secretKey);
}

async function createStripePayment(userId, packageId, customerEmail) {
    if (!stripe) {
        throw new Error('Stripe не настроен');
    }
    
    const pkg = CRYSTAL_PACKAGES[packageId];
    if (!pkg) {
        throw new Error('Неверный пакет');
    }
    
    try {
        // Создаем платежную сессию
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: PAYMENT_CONFIG.stripe.currency,
                    product_data: {
                        name: pkg.name,
                        description: `${pkg.crystals + pkg.bonus} кристаллов для CryptoTribes`
                    },
                    unit_amount: Math.round(pkg.price * 100) // в центах
                },
                quantity: 1
            }],
            mode: 'payment',
            success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.APP_URL}/payment/cancel`,
            customer_email: customerEmail,
            metadata: {
                userId: userId.toString(),
                packageId: packageId,
                crystals: (pkg.crystals + pkg.bonus).toString()
            }
        });
        
        // Сохраняем информацию о платеже в MongoDB
        await Payment.create({
            user_id: userId,
            transaction_id: session.id,
            amount: pkg.price,
            currency: PAYMENT_CONFIG.stripe.currency,
            crystals: pkg.crystals + pkg.bonus,
            status: 'pending',
            payment_method: 'stripe',
            package_id: packageId
        });
        
        paymentLogger.paymentInitiated(userId, pkg.price, PAYMENT_CONFIG.stripe.currency, 'stripe');
        
        return {
            sessionId: session.id,
            checkoutUrl: session.url
        };
        
    } catch (error) {
        logger.error('Stripe payment error', { error: error.message, userId, packageId });
        throw error;
    }
}

// Обработка webhook от Stripe
async function handleStripeWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;
    
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            PAYMENT_CONFIG.stripe.webhookSecret
        );
    } catch (err) {
        logger.error('Stripe webhook signature verification failed', { error: err.message });
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Обрабатываем событие
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object;
            await completePayment(
                session.id,
                session.metadata.userId,
                session.metadata.crystals,
                'stripe'
            );
            break;
            
        case 'checkout.session.expired':
            await cancelPayment(event.data.object.id);
            break;
    }
    
    res.json({ received: true });
}

// === NOWPAYMENTS ИНТЕГРАЦИЯ (КРИПТА) ===

const axios = require('axios');

async function createCryptoPayment(userId, packageId, paymentCurrency = 'USDT') {
    if (!PAYMENT_CONFIG.nowpayments.enabled) {
        throw new Error('Криптоплатежи не настроены');
    }
    
    const pkg = CRYSTAL_PACKAGES[packageId];
    if (!pkg) {
        throw new Error('Неверный пакет');
    }
    
    try {
        // Создаем счет на оплату
        const response = await axios.post(
            `${PAYMENT_CONFIG.nowpayments.apiUrl}/invoice`,
            {
                price_amount: pkg.price,
                price_currency: 'usd',
                pay_currency: paymentCurrency.toLowerCase(),
                order_id: `${userId}_${Date.now()}`,
                order_description: `${pkg.crystals + pkg.bonus} crystals for CryptoTribes`,
                ipn_callback_url: `${process.env.APP_URL}/api/payments/crypto/webhook`,
                success_url: `${process.env.APP_URL}/payment/success`,
                cancel_url: `${process.env.APP_URL}/payment/cancel`
            },
            {
                headers: {
                    'x-api-key': PAYMENT_CONFIG.nowpayments.apiKey,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        const invoice = response.data;
        
        // Сохраняем информацию о платеже
        await Payment.create({
            user_id: userId,
            transaction_id: invoice.id,
            amount: pkg.price,
            currency: paymentCurrency,
            crystals: pkg.crystals + pkg.bonus,
            status: 'pending',
            payment_method: 'crypto',
            package_id: packageId,
            payment_address: invoice.pay_address
        });
        
        paymentLogger.paymentInitiated(userId, pkg.price, paymentCurrency, 'crypto');
        
        return {
            invoiceId: invoice.id,
            paymentUrl: invoice.invoice_url,
            address: invoice.pay_address,
            amount: invoice.pay_amount,
            currency: invoice.pay_currency
        };
        
    } catch (error) {
        logger.error('Crypto payment error', { error: error.message, userId, packageId });
        throw error;
    }
}

// Обработка webhook от NOWPayments
async function handleCryptoWebhook(req, res) {
    const signature = req.headers['x-nowpayments-sig'];
    const payload = req.body;
    
    // Проверяем подпись
    const hmac = crypto.createHmac('sha512', PAYMENT_CONFIG.nowpayments.ipnSecret);
    hmac.update(JSON.stringify(payload, Object.keys(payload).sort()));
    const calculatedSignature = hmac.digest('hex');
    
    if (signature !== calculatedSignature) {
        logger.error('Invalid crypto webhook signature');
        return res.status(400).json({ error: 'Invalid signature' });
    }
    
    // Обрабатываем статус платежа
    if (payload.payment_status === 'finished') {
        const payment = await Payment.findOne({ transaction_id: payload.payment_id });

        if (payment) {
            await completePayment(
                payment.transaction_id,
                payment.user_id,
                payment.crystals,
                'crypto'
            );
        }
    } else if (payload.payment_status === 'failed' || payload.payment_status === 'expired') {
        await cancelPayment(payload.payment_id);
    }
    
    res.json({ received: true });
}

// === ОБЩИЕ ФУНКЦИИ ===

// Завершение платежа
async function completePayment(transactionId, userId, crystals, method) {
    try {
        // Проверяем, не был ли платеж уже обработан
        const already = await Payment.findOne({ transaction_id: transactionId, status: 'completed' });

        if (already) {
            logger.warn('Payment already processed', { transactionId });
            return;
        }

        // Обновляем статус платежа
        await Payment.updateOne({ transaction_id: transactionId }, { status: 'completed', completed_at: new Date() });

        // Добавляем кристаллы пользователю
        await User.updateOne({ _id: userId }, { $inc: { crystals: crystals } });

        // Создаем запись в истории
        await CrystalHistory.create({
            user_id: userId,
            amount: crystals,
            type: 'purchase',
            description: `Покупка кристаллов (${method})`
        });

        paymentLogger.paymentCompleted(userId.toString(), transactionId, crystals, method);

    } catch (error) {
        logger.error('Payment completion error', {
            error: error.message,
            transactionId,
            userId
        });
        throw error;
    }
}

// Отмена платежа
async function cancelPayment(transactionId) {
    await Payment.updateOne(
        { transaction_id: transactionId },
        { status: 'cancelled', completed_at: new Date() }
    );

    logger.info('Payment cancelled', { transactionId });
}

// Получение истории платежей пользователя
async function getUserPaymentHistory(userId) {
    return Payment.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(20)
        .lean();
}

// Проверка лимитов платежей
async function checkPaymentLimits(userId) {
    // Проверяем количество платежей за последние 24 часа
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [count, totalResult] = await Promise.all([
        Payment.countDocuments({ user_id: userId, status: 'completed', created_at: { $gt: since } }),
        Payment.aggregate([
            { $match: { user_id: userId, status: 'completed', created_at: { $gt: since } } },
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ])
    ]);

    const total = totalResult[0] ? totalResult[0].total : 0;

    const limits = {
        daily_transactions: 10,
        daily_amount: 500
    };

    if (count >= limits.daily_transactions) {
        throw new Error('Превышен дневной лимит транзакций');
    }

    if (total >= limits.daily_amount) {
        throw new Error('Превышен дневной лимит платежей');
    }

    return true;
}

// === СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ ===

// Проверка и применение промокода
async function applyPromoCode(userId, code) {
    const now = new Date();
    const promo = await PromoCode.findOne({
        code: code.toUpperCase(),
        active: true,
        $and: [
            { $or: [{ uses_left: { $gt: 0 } }, { uses_left: null }] },
            { $or: [{ expires_at: { $gt: now } }, { expires_at: null }] }
        ]
    }).lean();
    
    if (!promo) {
        throw new Error('Недействительный промокод');
    }
    
    // Проверяем, не использовал ли пользователь этот код
    const used = await PromoUse.findOne({ user_id: userId, promo_id: promo._id });
    
    if (used) {
        throw new Error('Вы уже использовали этот промокод');
    }
    
    try {
        await User.updateOne({ _id: userId }, { $inc: { crystals: promo.crystals } });
        await PromoUse.create({ user_id: userId, promo_id: promo._id });
        if (promo.uses_left !== null) {
            await PromoCode.updateOne({ _id: promo._id }, { $inc: { uses_left: -1 } });
        }
        
        logger.info('Promo code applied', { userId, code, crystals: promo.crystals });
        
        return {
            success: true,
            crystals: promo.crystals,
            message: promo.description || 'Промокод успешно применен!'
        };
        
    } catch (error) {
        throw error;
    }
}


module.exports = {
    PAYMENT_CONFIG,
    CRYSTAL_PACKAGES,
    createStripePayment,
    handleStripeWebhook,
    createCryptoPayment,
    handleCryptoWebhook,
    completePayment,
    cancelPayment,
    getUserPaymentHistory,
    checkPaymentLimits,
    applyPromoCode
};