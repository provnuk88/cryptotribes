const User = require('../../models/User');
const { logger } = require('../logger');

// Список админов (лучше хранить в БД или .env)
const ADMIN_USERNAMES = process.env.ADMIN_USERS ? 
    process.env.ADMIN_USERS.split(',') : 
    ['admin'];

// Middleware для проверки админских прав
async function requireAdmin(req, res, next) {
    try {
        // Проверяем авторизацию
        if (!req.session || !req.session.userId) {
            logger.warn('Unauthorized admin access attempt', {
                ip: req.ip,
                path: req.path
            });
            return res.status(401).json({ error: 'Требуется авторизация' });
        }
        
        // Получаем пользователя
        const user = await User.findById(req.session.userId).lean();
        
        if (!user) {
            logger.warn('Admin access attempt with invalid user', {
                userId: req.session.userId,
                ip: req.ip
            });
            return res.status(401).json({ error: 'Пользователь не найден' });
        }
        
        // Проверяем админские права
        const isAdmin = ADMIN_USERNAMES.includes(user.username) || 
                       user.role === 'admin'; // если добавите поле role в модель User
        
        if (!isAdmin) {
            logger.warn('Unauthorized admin access attempt', {
                userId: user._id,
                username: user.username,
                ip: req.ip,
                path: req.path
            });
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        
        // Логируем админское действие
        logger.info('Admin action', {
            userId: user._id,
            username: user.username,
            action: req.method + ' ' + req.path,
            ip: req.ip
        });
        
        // Добавляем информацию об админе в запрос
        req.admin = {
            userId: user._id,
            username: user.username
        };
        
        next();
    } catch (error) {
        logger.error('Error in admin middleware', {
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({ error: 'Ошибка сервера' });
    }
}

// Опциональный middleware для "мягкой" проверки (не блокирует, но логирует)
function checkAdmin(req, res, next) {
    if (req.session && req.session.userId) {
        User.findById(req.session.userId)
            .lean()
            .then(user => {
                if (user && ADMIN_USERNAMES.includes(user.username)) {
                    req.isAdmin = true;
                    req.admin = {
                        userId: user._id,
                        username: user.username
                    };
                } else {
                    req.isAdmin = false;
                }
                next();
            })
            .catch(err => {
                logger.error('Error checking admin status', { error: err.message });
                req.isAdmin = false;
                next();
            });
    } else {
        req.isAdmin = false;
        next();
    }
}

module.exports = {
    requireAdmin,
    checkAdmin,
    ADMIN_USERNAMES
}; 