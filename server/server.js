require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const { connectToMongoDB } = require('./utils/dbConnection');
const User = require('../models/User');
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
const { requireAdmin } = require('./middlewares/adminAuth');
const { validateParamId, validateBodyIds } = require('./utils/validation');
const { createIndexes } = require('./utils/createIndexes');
const { performanceMonitor, setupMetricsEndpoint } = require('./utils/monitoring');
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
const userRoutes = require('./routes/userRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Подключаемся к MongoDB только если не в тестовом режиме
if (process.env.NODE_ENV !== 'test') {
    connectToMongoDB().then(() => {
        logger.info('MongoDB connected');
        
        // Создаем индексы при запуске
        createIndexes().catch(error => {
            logger.error('Failed to create indexes:', error);
        });
    }).catch(error => {
        logger.error('Failed to connect to MongoDB:', error);
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, '../public')));

// Безопасность
app.use(securityMiddleware);
app.use(httpLogger);

// Мониторинг производительности
app.use(performanceMonitor.middleware());

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
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/cryptotribes' }),
    secret: process.env.SESSION_SECRET || 'cryptotribes-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 часа
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Middleware для проверки авторизации
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Требуется авторизация' });
    }
    req.userIdObject = mongoose.Types.ObjectId(req.session.userId);
    next();
}

// Middleware для добавления поля id к объектам MongoDB
function addIdField(obj) {
    if (obj && obj._id) {
        obj.id = obj._id.toString();
    }
    return obj;
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
        const existingUser = await User.findOne({ username }).exec();
        if (existingUser) {
            return res.status(400).json({ error: 'Пользователь уже существует' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({ username, password: hashedPassword });

        await gameLogic.createVillage(user._id, `${username}'s Village`);

        req.session.userId = user._id.toString();
        req.session.username = username;
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');

        gameLogger.userRegistered(username, user._id.toString());

        res.json({ success: true, userId: user._id.toString(), username, csrfToken: req.session.csrfToken });
    } catch (error) {
        logger.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Вход
app.post('/api/login', bruteForceProtection, async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username }).exec();
        
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

        req.session.userId = user._id.toString();
        req.session.username = user.username;
        req.session.csrfToken = require('crypto').randomBytes(32).toString('hex');

        user.last_login = new Date();
        await user.save();

        gameLogger.userLogin(user.username, user._id.toString());

        res.json({ success: true, userId: user._id.toString(), username: user.username, csrfToken: req.session.csrfToken });
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
        const user = await User.findById(req.userIdObject).lean();
        res.json({
            userId: user._id.toString(),
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

// Получить деревню пользователя
app.get('/api/village', requireAuth, async (req, res) => {
    try {
        const village = await gameLogic.getVillage(req.userIdObject);
        if (!village) {
            const villageId = await gameLogic.createVillage(req.userIdObject, 'Моя деревня');
            const newVillage = await gameLogic.getVillage(req.userIdObject, villageId);
            res.json(addIdField(newVillage));
        } else {
            const updated = await gameLogic.updateVillageResources(village);
            res.json(addIdField(updated));
        }
    } catch (error) {
        logger.error('Ошибка получения деревни:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Принудительно обновить ресурсы пользователя
app.post('/api/village/update-resources', requireAuth, async (req, res) => {
    try {
        const village = await gameLogic.getVillage(req.userIdObject);
        if (!village) {
            return res.status(404).json({ error: 'Деревня не найдена' });
        }
        
        const updated = await gameLogic.updateVillageResources(village);
        res.json({
            success: true,
            message: 'Ресурсы обновлены',
            village: updated
        });
    } catch (error) {
        logger.error('Ошибка обновления ресурсов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить деревню по ID
app.get('/api/village/:id', requireAuth, async (req, res) => {
    try {
        const villageId = req.params.id;
        const village = await gameLogic.getVillage(req.userIdObject, villageId);
        
        if (!village) {
            return res.status(404).json({ error: 'Деревня не найдена' });
        }
        
        // Обновляем ресурсы перед отправкой
        const updatedVillage = await gameLogic.updateVillageResources(village);

        res.json({ ...updatedVillage, id: updatedVillage._id.toString() });
    } catch (error) {
        logger.error('Ошибка получения деревни:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Получить список зданий
app.get('/api/buildings/:villageId', 
    requireAuth, 
    validateParamId('villageId'), 
    async (req, res) => {
    try {
            const villageId = req.validatedParams.villageId;
        const buildings = await gameLogic.getBuildings(villageId);
        res.status(200).json(buildings);
    } catch (error) {
        logger.error('Ошибка получения зданий:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
    }
);

// Построить/улучшить здание
app.post('/api/build', 
    requireAuth, 
    validateBodyIds('villageId'), 
    async (req, res) => {
        const { buildingType } = req.body;
        const villageId = req.validatedBody.villageId;
        
        try {
            const result = await gameLogic.upgradeBuilding(
                req.userIdObject, 
                villageId, 
                buildingType
            );
            res.json(result);
        } catch (error) {
            logger.error('Ошибка строительства:', error);
            res.status(400).json({ error: error.message });
        }
    }
);

// Ускорить строительство/обучение
app.post('/api/speed-up', requireAuth, async (req, res) => {
    const { actionId, type } = req.body;

    try {
        const result = await gameLogic.speedUpAction(req.userIdObject, actionId, type);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка ускорения:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить список войск
app.get('/api/troops/:villageId', 
    requireAuth, 
    validateParamId('villageId'), 
    async (req, res) => {
    try {
            const villageId = req.validatedParams.villageId;
        const troops = await gameLogic.getTroops(villageId);
        res.status(200).json(troops);
    } catch (error) {
        logger.error('Ошибка получения войск:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
    }
);

// Обучить войска
app.post('/api/train', 
    requireAuth, 
    validateBodyIds('villageId'), 
    async (req, res) => {
        const { troopType, amount } = req.body;
        const villageId = req.validatedBody.villageId;
        
        try {
            const result = await gameLogic.trainTroops(
                req.userIdObject, 
                villageId, 
                troopType, 
                amount
            );
        res.json(result);
    } catch (error) {
        logger.error('Ошибка обучения войск:', error);
        res.status(400).json({ error: error.message });
    }
    }
);

// Получить очередь обучения
app.get('/api/training-queue/:villageId', 
    requireAuth, 
    validateParamId('villageId'), 
    async (req, res) => {
        try {
            const villageId = req.validatedParams.villageId;
            const queue = await gameLogic.getTrainingQueue(villageId);
            res.status(200).json(queue);
        } catch (error) {
            logger.error('Ошибка получения очереди обучения:', error);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
);

// Получить карту мира
app.get('/api/map', requireAuth, async (req, res) => {
    try {
        const map = await gameLogic.getWorldMap();
        res.status(200).json(map);
    } catch (error) {
        logger.error('Ошибка получения карты:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Атаковать деревню
app.post('/api/attack', 
    requireAuth, 
    validateBodyIds('fromVillageId', 'toVillageId'), 
    async (req, res) => {
        const { troops } = req.body;
        const fromVillageId = req.validatedBody.fromVillageId;
        const toVillageId = req.validatedBody.toVillageId;
        
        try {
            const result = await gameLogic.attackVillage(
                req.userIdObject, 
                fromVillageId, 
                toVillageId, 
                troops
            );
        res.json(result);
    } catch (error) {
        logger.error('Ошибка атаки:', error);
        res.status(400).json({ error: error.message });
    }
    }
);

// === ПЛЕМЕНА ===

// Создать племя
app.post('/api/tribe/create', requireAuth, async (req, res) => {
    const { name, tag } = req.body;
    try {
        const result = await gameLogic.createTribe(req.userIdObject, name, tag);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка создания племени:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить список племен
app.get('/api/tribes', requireAuth, async (req, res) => {
    try {
        const tribes = await gameLogic.getTribes();
        res.status(200).json(tribes);
    } catch (error) {
        logger.error('Ошибка получения племен:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Присоединиться к племени
app.post('/api/tribe/join', requireAuth, async (req, res) => {
    const { tribeId } = req.body;
    try {
        const result = await gameLogic.joinTribe(req.userIdObject, tribeId);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка присоединения к племени:', error);
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
        await checkPaymentLimits(req.userIdObject);
        let result;
        if (method === 'card') {
            const user = await User.findById(req.userIdObject).lean();
            result = await createStripePayment(req.userIdObject, packageId, user?.email);
        } else if (method === 'crypto') {
            result = await createCryptoPayment(req.userIdObject, packageId, currency || 'USDT');
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
        const history = await getUserPaymentHistory(req.userIdObject);
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
        const result = await applyPromoCode(req.userIdObject, code);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Административный эндпоинт для генерации варварских деревень
app.post('/api/admin/generate-barbarians', requireAuth, requireAdmin, async (req, res) => {
    try {
        const count = Number(req.body.count) || 10;
        
        if (count < 1 || count > 100) {
            return res.status(400).json({ error: 'Количество должно быть от 1 до 100' });
        }
        
        const result = await gameLogic.generateBarbarianVillages(count);
        
        logger.info('Barbarian villages generated', {
            admin: req.admin.username,
            count: result.length
        });
        
        res.json({ 
            success: true, 
            created: result.length,
            message: `Создано ${result.length} варварских деревень`
        });
    } catch (error) {
        logger.error('Ошибка генерации варварских деревень:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === ИГРОВОЙ ЦИКЛ ===

// Обновление ресурсов каждую минуту
if (process.env.NODE_ENV !== 'test') {
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
}

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

// Настройка эндпоинта метрик
setupMetricsEndpoint(app);

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

let server; // for graceful shutdown and tests
let resourceInterval;

function startServer(port = PORT) {
    const server = app.listen(port, () => {
        console.log(`
    ╔═══════════════════════════════════════╗
    ║       CryptoTribes запущен!           ║
    ║                                       ║
    ║   🌐 Локальный адрес:                 ║
    ║   http://localhost:${port}              ║
    ║                                       ║
    ║   📊 Окружение: ${process.env.NODE_ENV || 'development'}           ║
    ║   🔒 Безопасность: активна            ║
    ║   📝 Логи: ./logs/                    ║
    ║                                       ║
    ║   💎 Платежи:                         ║
        ║   - Stripe: ${process.env.STRIPE_SECRET_KEY ? '✅' : '❌'}                     ║
        ║   - Crypto: ${process.env.CRYPTO_API_KEY ? '✅' : '❌'}                     ║
    ╚═══════════════════════════════════════╝
    `);

        logger.info('Server started');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        server.close(() => {
            logger.info('Process terminated');
            process.exit(0);
        });
    });

    return server;
}

// Подключаем роуты пользователей
app.use('/api/users', userRoutes);

// Запускаем сервер только если не в тестовом режиме
if (process.env.NODE_ENV !== 'test') {
    startServer();
}

module.exports = { app, startServer };
