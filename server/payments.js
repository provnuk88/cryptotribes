const crypto = require('crypto');
const { logger, paymentLogger } = require('./logger');
// Legacy payment code expected SQLite helper functions from "database.js".
// That module has been removed, so provide no-op placeholders to keep the
// payment module functional without requiring the old file.
async function runAsync() {}
async function getAsync() { return null; }
async function allAsync() { return []; }

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
        
        // Сохраняем информацию о платеже
        await runAsync(
            `INSERT INTO payments (user_id, transaction_id, amount, currency, crystals, status, payment_method, package_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, session.id, pkg.price, PAYMENT_CONFIG.stripe.currency, 
             pkg.crystals + pkg.bonus, 'pending', 'stripe', packageId]
        );
        
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
        await runAsync(
            `INSERT INTO payments (user_id, transaction_id, amount, currency, crystals, status, payment_method, package_id, payment_address) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, invoice.id, pkg.price, paymentCurrency, 
             pkg.crystals + pkg.bonus, 'pending', 'crypto', packageId, invoice.pay_address]
        );
        
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
        const payment = await getAsync(
            'SELECT * FROM payments WHERE transaction_id = ?',
            [payload.payment_id]
        );
        
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
        const payment = await getAsync(
            'SELECT * FROM payments WHERE transaction_id = ? AND status = ?',
            [transactionId, 'completed']
        );
        
        if (payment) {
            logger.warn('Payment already processed', { transactionId });
            return;
        }
        
        // Начинаем транзакцию
        await runAsync('BEGIN TRANSACTION');
        
        try {
            // Обновляем статус платежа
            await runAsync(
                'UPDATE payments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
                ['completed', transactionId]
            );
            
            // Добавляем кристаллы пользователю
            await runAsync(
                'UPDATE users SET crystals = crystals + ? WHERE id = ?',
                [crystals, userId]
            );
            
            // Создаем запись в истории
            await runAsync(
                `INSERT INTO crystal_history (user_id, amount, type, description) 
                 VALUES (?, ?, ?, ?)`,
                [userId, crystals, 'purchase', `Покупка кристаллов (${method})`]
            );
            
            // Коммитим транзакцию
            await runAsync('COMMIT');
            
            // Логируем успешный платеж
            paymentLogger.paymentCompleted(userId, transactionId, crystals, method);
            
            // Отправляем уведомление пользователю (TODO: реализовать)
            // await sendNotification(userId, 'payment_success', { crystals });
            
        } catch (error) {
            await runAsync('ROLLBACK');
            throw error;
        }
        
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
    await runAsync(
        'UPDATE payments SET status = ?, completed_at = CURRENT_TIMESTAMP WHERE transaction_id = ?',
        ['cancelled', transactionId]
    );
    
    logger.info('Payment cancelled', { transactionId });
}

// Получение истории платежей пользователя
async function getUserPaymentHistory(userId) {
    const payments = await allAsync(
        `SELECT * FROM payments 
         WHERE user_id = ? 
         ORDER BY created_at DESC 
         LIMIT 20`,
        [userId]
    );
    
    return payments;
}

// Проверка лимитов платежей
async function checkPaymentLimits(userId) {
    // Проверяем количество платежей за последние 24 часа
    const recentPayments = await getAsync(
        `SELECT COUNT(*) as count, SUM(amount) as total 
         FROM payments 
         WHERE user_id = ? 
         AND status = 'completed'
         AND created_at > datetime('now', '-24 hours')`,
        [userId]
    );
    
    const limits = {
        daily_transactions: 10,
        daily_amount: 500
    };
    
    if (recentPayments.count >= limits.daily_transactions) {
        throw new Error('Превышен дневной лимит транзакций');
    }
    
    if (recentPayments.total >= limits.daily_amount) {
        throw new Error('Превышен дневной лимит платежей');
    }
    
    return true;
}

// === СПЕЦИАЛЬНЫЕ ПРЕДЛОЖЕНИЯ ===

// Проверка и применение промокода
async function applyPromoCode(userId, code) {
    const promo = await getAsync(
        `SELECT * FROM promo_codes 
         WHERE code = ? 
         AND active = 1 
         AND (uses_left > 0 OR uses_left IS NULL)
         AND (expires_at > CURRENT_TIMESTAMP OR expires_at IS NULL)`,
        [code.toUpperCase()]
    );
    
    if (!promo) {
        throw new Error('Недействительный промокод');
    }
    
    // Проверяем, не использовал ли пользователь этот код
    const used = await getAsync(
        'SELECT * FROM promo_uses WHERE user_id = ? AND promo_id = ?',
        [userId, promo.id]
    );
    
    if (used) {
        throw new Error('Вы уже использовали этот промокод');
    }
    
    // Применяем промокод
    await runAsync('BEGIN TRANSACTION');
    
    try {
        // Даем кристаллы
        await runAsync(
            'UPDATE users SET crystals = crystals + ? WHERE id = ?',
            [promo.crystals, userId]
        );
        
        // Записываем использование
        await runAsync(
            'INSERT INTO promo_uses (user_id, promo_id) VALUES (?, ?)',
            [userId, promo.id]
        );
        
        // Уменьшаем количество использований
        if (promo.uses_left !== null) {
            await runAsync(
                'UPDATE promo_codes SET uses_left = uses_left - 1 WHERE id = ?',
                [promo.id]
            );
        }
        
        await runAsync('COMMIT');
        
        logger.info('Promo code applied', { userId, code, crystals: promo.crystals });
        
        return {
            success: true,
            crystals: promo.crystals,
            message: promo.description || 'Промокод успешно применен!'
        };
        
    } catch (error) {
        await runAsync('ROLLBACK');
        throw error;
    }
}

// === ТАБЛИЦЫ ДЛЯ ПЛАТЕЖЕЙ (добавить в database.js) ===
const paymentTables = `
-- Таблица платежей
CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    transaction_id TEXT UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT NOT NULL,
    crystals INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    package_id TEXT,
    payment_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- История кристаллов
CREATE TABLE IF NOT EXISTS crystal_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Промокоды
CREATE TABLE IF NOT EXISTS promo_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    crystals INTEGER NOT NULL,
    description TEXT,
    uses_left INTEGER,
    expires_at DATETIME,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Использование промокодов
CREATE TABLE IF NOT EXISTS promo_uses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    promo_id INTEGER NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (promo_id) REFERENCES promo_codes(id),
    UNIQUE(user_id, promo_id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_crystal_history_user ON crystal_history(user_id);
`;

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
    applyPromoCode,
    paymentTables
};