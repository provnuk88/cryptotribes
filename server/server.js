require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const { initDatabase, db } = require('./database');
const gameLogic = require('./gameLogic');
const { logger, httpLogger, gameLogger, performance } = require('./logger');
const { 
    securityMiddleware, 
    generalLimiter,
    authLimiter, 
    gameLimiter,
    createLimiter,
    bruteForceProtection,
    incrementLoginAttempts,
    resetLoginAttempts,
    validators 
} = require('./securityMiddlewares');
const { 
    createStripePayment, 
    createCryptoPayment,
    handleStripeWebhook,
    handleCryptoWebhook,
    getUserPaymentHistory,
    checkPaymentLimits,
    applyPromoCode,
    CRYSTAL_PACKAGES 
} = require('./payments');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Безопасность
app.use(securityMiddleware);
app.use(httpLogger);

// Rate limiting
app.use('/api/', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/build', gameLimiter);
app.use('/api/train', gameLimiter);
app.use('/api/attack', gameLimiter);
app.use('/api/tribe/create', createLimiter);

// Сессии
app.use(session({
    secret: process.env.SESSION_SECRET || 'cryptotribes-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production' // HTTPS в production
    }
}));

// Инициализация базы данных
initDatabase();

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    next();
}

// === АВТОРИЗАЦИЯ ===

// Регистрация
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    // Валидация
    const usernameError = validators.username(username);
    const passwordError = validators.password(password);
    
    if (usernameError) {
        return res.status(400).json({ error: usernameError });
    }
    
    if (passwordError) {
        return res.status(400).json({ error: passwordError });
    }
    
    try {
        // Проверка существующего пользователя
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }
        
        // Хеширование пароля
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Создание пользователя
        const userId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (username, password) VALUES (?, ?)',
                [username, hashedPassword],
                function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                }
            );
        });
        
        // Создание первой деревни
        await gameLogic.createVillage(userId, username + "'s Village");
        
        req.session.userId = userId;
        req.session.username = username;
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        
        gameLogger.userRegistered(username, userId);
        
        res.json({ success: true, username, csrfToken: req.session.csrfToken });
    } catch (error) {
        logger.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/api/login', bruteForceProtection, async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!user) {
            incrementLoginAttempts(req.bruteForceKey, req.bruteForceAttempts);
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            incrementLoginAttempts(req.bruteForceKey, req.bruteForceAttempts);
            return res.status(400).json({ error: 'Неверный логин или пароль' });
        }
        
        resetLoginAttempts(req.bruteForceKey);
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');
        
        gameLogger.userLogin(user.username, user.id);
        
        res.json({ success: true, username: user.username, csrfToken: req.session.csrfToken });
    } catch (error) {
        logger.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Выход
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Текущий пользователь
app.get('/api/user', requireAuth, async (req, res) => {
    try {
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT id, username, crystals, tribe_id FROM users WHERE id = ?', 
                [req.session.userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        res.json({ 
            userId: user.id,
            username: user.username,
            crystals: user.crystals,
            tribeId: user.tribe_id,
            csrfToken: req.session.csrfToken
        });
    } catch (error) {
        logger.error('Ошибка получения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === ИГРОВЫЕ ДАННЫЕ ===

// Получить данные деревни
app.get('/api/village/:id?', requireAuth, async (req, res) => {
    try {
        const villageId = req.params.id;
        const village = await gameLogic.getVillage(req.session.userId, villageId);
        
        if (!village) {
            return res.status(404).json({ error: 'Деревня не найдена' });
        }
        
        // Обновляем ресурсы перед отправкой
        const updatedVillage = await gameLogic.updateVillageResources(village);
        
        res.json(updatedVillage);
    } catch (error) {
        console.error('Ошибка получения деревни:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить список зданий
app.get('/api/buildings/:villageId', requireAuth, async (req, res) => {
    try {
        const buildings = await gameLogic.getBuildings(req.params.villageId);
        res.json(buildings);
    } catch (error) {
        console.error('Ошибка получения зданий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Построить/улучшить здание
app.post('/api/build', requireAuth, async (req, res) => {
    const { villageId, buildingType } = req.body;
    
    try {
        const result = await gameLogic.upgradeBuilding(req.session.userId, villageId, buildingType);
        res.json(result);
    } catch (error) {
        console.error('Ошибка строительства:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить список войск
app.get('/api/troops/:villageId', requireAuth, async (req, res) => {
    try {
        const troops = await gameLogic.getTroops(req.params.villageId);
        res.json(troops);
    } catch (error) {
        console.error('Ошибка получения войск:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обучить войска
app.post('/api/train', requireAuth, async (req, res) => {
    const { villageId, troopType, amount } = req.body;
    
    try {
        const result = await gameLogic.trainTroops(req.session.userId, villageId, troopType, amount);
        res.json(result);
    } catch (error) {
        console.error('Ошибка обучения войск:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить карту мира
app.get('/api/map', requireAuth, async (req, res) => {
    try {
        const map = await gameLogic.getWorldMap();
        res.json(map);
    } catch (error) {
        console.error('Ошибка получения карты:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Атаковать деревню
app.post('/api/attack', requireAuth, async (req, res) => {
    const { fromVillageId, toVillageId, troops } = req.body;
    
    try {
        const result = await gameLogic.attackVillage(req.session.userId, fromVillageId, toVillageId, troops);
        res.json(result);
    } catch (error) {
        console.error('Ошибка атаки:', error);
        res.status(400).json({ error: error.message });
    }
});

// === ПЛЕМЕНА ===

// Создать племя
app.post('/api/tribe/create', requireAuth, async (req, res) => {
    const { name, tag } = req.body;
    
    try {
        const result = await gameLogic.createTribe(req.session.userId, name, tag);
        res.json(result);
    } catch (error) {
        console.error('Ошибка создания племени:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить список племен
app.get('/api/tribes', requireAuth, async (req, res) => {
    try {
        const tribes = await gameLogic.getTribes();
        res.json(tribes);
    } catch (error) {
        console.error('Ошибка получения племен:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Присоединиться к племени
app.post('/api/tribe/join', requireAuth, async (req, res) => {
    const { tribeId } = req.body;
    
    try {
        const result = await gameLogic.joinTribe(req.session.userId, tribeId);
        res.json(result);
    } catch (error) {
        console.error('Ошибка присоединения к племени:', error);
        res.status(400).json({ error: error.message });
    }
});

// === МАГАЗИН ===

// === МАГАЗИН И ПЛАТЕЖИ ===

// Получить пакеты кристаллов
app.get('/api/shop/packages', (req, res) => {
    res.json(CRYSTAL_PACKAGES);
});

// Создать платеж
app.post('/api/shop/create-payment', requireAuth, async (req, res) => {
    const { packageId, method, currency } = req.body;
    
    try {
        // Проверяем лимиты
        await checkPaymentLimits(req.session.userId);
        
        let result;
        if (method === 'card') {
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT email FROM users WHERE id = ?', [req.session.userId], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            result = await createStripePayment(req.session.userId, packageId, user?.email);
        } else if (method === 'crypto') {
            result = await createCryptoPayment(req.session.userId, packageId, currency || 'USDT');
        } else {
            return res.status(400).json({ error: 'Неверный метод оплаты' });
        }
        
        res.json(result);
    } catch (error) {
        logger.error('Payment creation error', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// Webhooks для платежей (без авторизации, но с специальным middleware для raw body)
app.post('/api/payments/stripe/webhook', 
    express.raw({type: 'application/json'}), 
    handleStripeWebhook
);
app.post('/api/payments/crypto/webhook', handleCryptoWebhook);

// История платежей
app.get('/api/shop/history', requireAuth, async (req, res) => {
    try {
        const history = await getUserPaymentHistory(req.session.userId);
        res.json(history);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения истории' });
    }
});

// Применить промокод
app.post('/api/shop/promo', requireAuth, async (req, res) => {
    const { code } = req.body;
    
    if (!code) {
        return res.status(400).json({ error: 'Укажите промокод' });
    }
    
    try {
        const result = await applyPromoCode(req.session.userId, code);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Купить кристаллы (заглушка)
app.post('/api/shop/buy-crystals', requireAuth, async (req, res) => {
    const { amount } = req.body;
    
    // В реальной игре здесь была бы интеграция с платежной системой
    res.json({ 
        success: false, 
        message: 'Используйте /api/shop/create-payment для создания платежа',
        amount: amount
    });
});

// Ускорить действие за кристаллы
app.post('/api/speed-up', requireAuth, async (req, res) => {
    const { actionId, type } = req.body;
    
    try {
        const result = await gameLogic.speedUpAction(req.session.userId, actionId, type);
        res.json(result);
    } catch (error) {
        console.error('Ошибка ускорения:', error);
        res.status(400).json({ error: error.message });
    }
});

// === ИГРОВОЙ ЦИКЛ ===

// Обновление ресурсов каждую минуту
setInterval(async () => {
    try {
        performance.start('resource-update');
        await gameLogic.updateAllVillagesResources();
        const duration = performance.end('resource-update');
        gameLogger.resourcesUpdated('all', duration);
        
        performance.start('construction-queue');
        await gameLogic.processConstructionQueue();
        performance.end('construction-queue');
        
        performance.start('training-queue');
        await gameLogic.processTrainingQueue();
        performance.end('training-queue');
        
        performance.start('process-attacks');
        await gameLogic.processAttacks();
        performance.end('process-attacks');
        
    } catch (error) {
        logger.error('Ошибка игрового цикла:', error);
    }
}, 60000); // Каждую минуту

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: '1.0.0'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint не найден' });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error', { 
        error: err.message, 
        stack: err.stack,
        url: req.url,
        method: req.method
    });
    
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' 
            ? 'Внутренняя ошибка сервера' 
            : err.message 
    });
});

// Запуск сервера
const server = app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════╗
    ║       CryptoTribes запущен!           ║
    ║                                       ║
    ║   🌐 Локальный адрес:                 ║
    ║   http://localhost:${PORT}              ║
    ║                                       ║
    ║   📊 Окружение: ${process.env.NODE_ENV || 'development'}           ║
    ║   🔒 Безопасность: активна            ║
    ║   📝 Логи: ./logs/                    ║
    ║                                       ║
    ║   💎 Платежи:                         ║
    ║   - Stripe: ${process.env.STRIPE_ENABLED === 'true' ? '✅' : '❌'}                     ║
    ║   - Crypto: ${process.env.NOWPAYMENTS_ENABLED === 'true' ? '✅' : '❌'}                     ║
    ╚═══════════════════════════════════════╝
    `);
    
    logger.info('Server started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        nodeVersion: process.version
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Server closed');
        db.close(() => {
            logger.info('Database connection closed');
            process.exit(0);
        });
    });
});

module.exports = app; // Для тестов