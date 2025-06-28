require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
require('../db');
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
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
            res.json(newVillage);
        } else {
            const updated = await gameLogic.updateVillageResources(village);
            res.json(updated);
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
app.get('/api/buildings/:villageId', requireAuth, async (req, res) => {
    try {
        const { villageId } = req.params;
        const buildings = await gameLogic.getBuildings(villageId);
        res.status(200).json(buildings);
    } catch (error) {
        logger.error('Ошибка получения зданий:', error);
        if (error.message && error.message.includes('villageId')) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Построить/улучшить здание
app.post('/api/build', requireAuth, async (req, res) => {
    const { villageId, buildingType } = req.body;
    
    try {
         const result = await gameLogic.upgradeBuilding(req.userIdObject, villageId, buildingType);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка строительства:', error);
        res.status(400).json({ error: error.message });
    }
});

// Получить список войск
app.get('/api/troops/:villageId', requireAuth, async (req, res) => {
    try {
        const { villageId } = req.params;
        const troops = await gameLogic.getTroops(villageId);
        res.status(200).json(troops);
    } catch (error) {
        logger.error('Ошибка получения войск:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// Обучить войска
app.post('/api/train', requireAuth, async (req, res) => {
    const { villageId, troopType, amount } = req.body;
    
    try {
        const result = await gameLogic.trainTroops(req.userIdObject, villageId, troopType, amount);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка обучения войск:', error);
        res.status(400).json({ error: error.message });
    }
});

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
app.post('/api/attack', requireAuth, async (req, res) => {
    const { fromVillageId, toVillageId, troops } = req.body;
    
    try {
        const result = await gameLogic.attackVillage(req.userIdObject, fromVillageId, toVillageId, troops);
        res.json(result);
    } catch (error) {
        logger.error('Ошибка атаки:', error);
        res.status(400).json({ error: error.message });
    }
});

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

// Административный эндпоинт для обновления ресурсов всех деревень
app.post('/api/admin/update-all-resources', requireAuth, async (req, res) => {
    try {
        // Проверяем, является ли пользователь администратором (можно добавить проверку роли)
        const user = await User.findById(req.userIdObject).lean();
        if (!user || user.username !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        
        const result = await gameLogic.updateAllVillagesResources();
        res.json({
            success: true,
            message: 'Ресурсы всех деревень обновлены',
            result
        });
    } catch (error) {
        logger.error('Ошибка обновления ресурсов всех деревень:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
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
        const result = await gameLogic.speedUpAction(req.userIdObject, actionId, type);
        res.status(200).json(result);
    } catch (error) {
        logger.error('Ошибка ускорения:', error);
        res.status(400).json({ error: error.message });
    }
});

// Административный эндпоинт для генерации варварских деревень
app.post('/api/admin/generate-barbarians', requireAuth, async (req, res) => {
    try {
        // Проверяем, является ли пользователь админом (можно доработать по ролям)
        const user = await User.findById(req.userIdObject).lean();
        if (!user || user.username !== 'admin') {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        const count = Number(req.body.count) || 10;
        const result = await gameLogic.generateBarbarianVillages(count);
        res.json({ success: true, created: result.length });
    } catch (error) {
        logger.error('Ошибка генерации варварских деревень:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

// === ИГРОВОЙ ЦИКЛ ===

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

let server; // for graceful shutdown and tests
let resourceInterval;

function startServer(port = PORT) {
    resourceInterval = setInterval(async () => {
        try {
            console.log('🔄 Запуск игрового цикла...');
            
            // Обновление ресурсов
            console.log('📦 Обновление ресурсов...');
            const resourceResult = await gameLogic.updateAllVillagesResources();
            console.log(`✅ Ресурсы обновлены: ${resourceResult.updatedCount} деревень`);
            
            // Обработка строительства
            console.log('🏗️ Обработка очереди строительства...');
            await gameLogic.processConstructionQueue();
            console.log('✅ Строительство обработано');
            
            // Обработка обучения войск
            console.log('⚔️ Обработка очереди обучения войск...');
            await gameLogic.processTrainingQueue();
            console.log('✅ Обучение войск обработано');
            
            // Обработка атак
            console.log('⚔️ Обработка атак...');
            await gameLogic.processAttacks();
            console.log('✅ Атаки обработаны');
            
            console.log('🎮 Игровой цикл завершен');
            
        } catch (error) {
            console.error('❌ Ошибка игрового цикла:', error);
            logger.error('Ошибка игрового цикла:', error);
        }
    }, 60000); // Каждую минуту

    server = app.listen(port, () => {
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
    ║   - Stripe: ${process.env.STRIPE_ENABLED === 'true' ? '✅' : '❌'}                     ║
    ║   - Crypto: ${process.env.NOWPAYMENTS_ENABLED === 'true' ? '✅' : '❌'}                     ║
    ╚═══════════════════════════════════════╝
    `);

        logger.info('Server started', {
            port,
            environment: process.env.NODE_ENV || 'development',
            nodeVersion: process.version
        });
    });
    return server;
}

// Graceful shutdown
process.on('SIGTERM', () => {
    if (!server) return;
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(async () => {
        logger.info('Server closed');
        await mongoose.connection.close();
        logger.info('Database connection closed');
        if (resourceInterval) clearInterval(resourceInterval);
        process.exit(0);
    });
});

module.exports = { app, startServer, resourceInterval };

// Only start server if this file is run directly
if (require.main === module) {
    startServer();
}

app.use('/api/users', userRoutes);
