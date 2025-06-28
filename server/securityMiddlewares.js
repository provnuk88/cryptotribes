// server/securityMiddlewares.js

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const { logger } = require('./logger');

// Общий лимитер для всех запросов
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов с одного IP
    message: 'Слишком много запросов с вашего IP, попробуйте позже',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.session?.userId
        });
        res.status(429).json({ error: 'Слишком много запросов' });
    }
});

// Строгий лимитер для авторизации
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 5, // максимум 5 попыток входа
    skipSuccessfulRequests: true, // не считать успешные попытки
    message: 'Слишком много попыток входа, попробуйте через 15 минут',
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            username: req.body.username
        });
        res.status(429).json({ error: 'Слишком много попыток входа' });
    }
});

// Лимитер для игровых действий
const gameLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 30, // максимум 30 действий в минуту
    message: 'Слишком много игровых действий, подождите минуту',
    handler: (req, res) => {
        logger.warn('Game rate limit exceeded', {
            ip: req.ip,
            userId: req.session?.userId,
            action: req.path
        });
        res.status(429).json({ error: 'Слишком частые действия' });
    }
});

// Лимитер для создания контента
const createLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10, // максимум 10 создания в час
    message: 'Превышен лимит создания объектов',
    handler: (req, res) => {
        logger.warn('Create rate limit exceeded', {
            ip: req.ip,
            userId: req.session?.userId,
            type: req.path
        });
        res.status(429).json({ error: 'Превышен лимит создания' });
    }
});

// Настройка Helmet для безопасности заголовков
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
});

// Функция для экранирования HTML
function escapeHtml(text) {
    if (typeof text !== 'string') return text;
    
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Middleware для санитизации входных данных
function sanitizeInput(req, res, next) {
    // Санитизация body
    if (req.body) {
        sanitizeObject(req.body);
    }
    
    // Санитизация query
    if (req.query) {
        sanitizeObject(req.query);
    }
    
    // Санитизация params
    if (req.params) {
        sanitizeObject(req.params);
    }
    
    next();
}

function sanitizeObject(obj) {
    for (const key in obj) {
        if (typeof obj[key] === 'string') {
            // Удаляем опасные символы
            obj[key] = obj[key].trim();
            
            // Базовая защита от NoSQL инъекций
            if (obj[key].includes('$') || obj[key].includes('{')) {
                logger.warn('Potential NoSQL injection attempt', {
                    key,
                    value: obj[key]
                });
                obj[key] = obj[key].replace(/[${}]/g, '');
            }
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
            sanitizeObject(obj[key]);
        }
    }
}

// Хранилище попыток входа
const loginAttempts = new Map();

// Очистка старых попыток каждые 30 минут
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of loginAttempts.entries()) {
        if (now - data.lastAttempt > 30 * 60 * 1000) {
            loginAttempts.delete(key);
        }
    }
}, 30 * 60 * 1000);

// Middleware для защиты от brute force
function bruteForceProtection(req, res, next) {
    const key = `${req.ip}:${req.body.username || 'unknown'}`;
    const attempts = loginAttempts.get(key) || { count: 0, lastAttempt: 0 };
    
    // Сброс счетчика если прошло больше 30 минут
    if (Date.now() - attempts.lastAttempt > 30 * 60 * 1000) {
        attempts.count = 0;
    }
    
    // Блокировка после 10 попыток
    if (attempts.count >= 10) {
        logger.warn('Brute force protection triggered', {
            ip: req.ip,
            username: req.body.username,
            attempts: attempts.count
        });
        return res.status(429).json({ 
            error: 'Слишком много неудачных попыток. Попробуйте через 30 минут.' 
        });
    }
    
    // Сохраняем информацию о попытке
    req.bruteForceKey = key;
    req.bruteForceAttempts = attempts;
    
    next();
}

// Функция для увеличения счетчика попыток
function incrementLoginAttempts(key, attempts) {
    if (!key || !attempts) return;
    attempts.count++;
    attempts.lastAttempt = Date.now();
    loginAttempts.set(key, attempts);
}

// Функция для сброса счетчика при успешном входе
function resetLoginAttempts(key) {
    if (!key) return;
    loginAttempts.delete(key);
}

// Валидаторы данных
const validators = {
    // Валидация имени пользователя
    username: (username) => {
        if (!username || typeof username !== 'string') {
            return 'Имя пользователя обязательно';
        }
        if (username.length < 3 || username.length > 20) {
            return 'Имя пользователя должно быть от 3 до 20 символов';
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return 'Имя пользователя может содержать только буквы, цифры и _';
        }
        return null;
    },
    
    // Валидация пароля
    password: (password) => {
        if (!password || typeof password !== 'string') {
            return 'Пароль обязателен';
        }
        if (password.length < 6) {
            return 'Пароль должен быть минимум 6 символов';
        }
        if (password.length > 100) {
            return 'Пароль слишком длинный';
        }
        return null;
    },
    
    // Валидация названия деревни
    villageName: (name) => {
        if (!name || typeof name !== 'string') {
            return 'Название деревни обязательно';
        }
        if (name.length < 3 || name.length > 30) {
            return 'Название деревни должно быть от 3 до 30 символов';
        }
        // Удаляем потенциально опасные символы
        if (/<|>|script|javascript/i.test(name)) {
            return 'Недопустимые символы в названии';
        }
        return null;
    },
    
    // Валидация количества
    amount: (amount, max = 9999) => {
        const num = parseInt(amount);
        if (isNaN(num) || num < 1) {
            return 'Количество должно быть положительным числом';
        }
        if (num > max) {
            return `Максимальное количество: ${max}`;
        }
        return null;
    },
    
    // Валидация ObjectId
    objectId: (id) => {
        if (!id || typeof id !== 'string') {
            return 'ID обязателен';
        }
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return 'Неверный формат ID';
        }
        return null;
    }
};

// Комбинированный middleware безопасности
const securityMiddleware = [
    helmetConfig,
    mongoSanitize(),
    xss(),
    hpp(),
    sanitizeInput
];

module.exports = {
    securityMiddleware,
    generalLimiter,
    authLimiter,
    gameLimiter,
    createLimiter,
    bruteForceProtection,
    incrementLoginAttempts,
    resetLoginAttempts,
    validators,
    escapeHtml
};
