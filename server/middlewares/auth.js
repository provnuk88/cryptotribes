/**
 * Middleware для аутентификации и авторизации
 * Расширенная функциональность с проверками безопасности
 */

const mongoose = require('mongoose');
const User = require('../../models/User');
const { logger } = require('../logger');
// const config = require('../../config/config'); // TODO: раскомментировать когда создадим config

/**
 * Middleware для проверки аутентификации
 * Проверяет наличие сессии и валидность пользователя
 */
function requireAuth(req, res, next) {
    try {
        // Проверяем наличие сессии
        if (!req.session || !req.session.userId) {
            logger.warn('Unauthorized access attempt', {
                ip: req.ip,
                path: req.path,
                userAgent: req.get('user-agent')
            });
            return res.status(401).json({ 
                error: 'Требуется авторизация',
                code: 'AUTH_REQUIRED'
            });
        }

        // Валидируем ObjectId
        if (!mongoose.Types.ObjectId.isValid(req.session.userId)) {
            logger.warn('Invalid session userId', {
                userId: req.session.userId,
                ip: req.ip
            });
            req.session.destroy();
            return res.status(401).json({ 
                error: 'Недействительная сессия',
                code: 'INVALID_SESSION'
            });
        }

        // Создаем ObjectId для дальнейшего использования
        req.userIdObject = new mongoose.Types.ObjectId(req.session.userId);
        req.userId = req.session.userId;
        req.username = req.session.username;

        next();
    } catch (error) {
        logger.error('Auth middleware error', { error: error.message });
        res.status(500).json({ 
            error: 'Ошибка аутентификации',
            code: 'AUTH_ERROR'
        });
    }
}

/**
 * Middleware для проверки роли пользователя
 * @param {string|string[]} roles - Разрешенные роли
 */
function requireRole(roles) {
    return async (req, res, next) => {
        try {
            // Сначала проверяем аутентификацию
            if (!req.userIdObject) {
                return res.status(401).json({ 
                    error: 'Требуется авторизация',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Получаем пользователя с ролью
            const user = await User.findById(req.userIdObject)
                .select('role is_active')
                .lean();

            if (!user) {
                logger.warn('User not found in requireRole', { userId: req.userId });
                return res.status(401).json({ 
                    error: 'Пользователь не найден',
                    code: 'USER_NOT_FOUND'
                });
            }

            // Проверяем активность аккаунта
            if (!user.is_active) {
                logger.warn('Inactive user access attempt', { 
                    userId: req.userId,
                    role: user.role 
                });
                return res.status(403).json({ 
                    error: 'Аккаунт заблокирован',
                    code: 'ACCOUNT_DISABLED'
                });
            }

            // Проверяем роль
            const allowedRoles = Array.isArray(roles) ? roles : [roles];
            if (!allowedRoles.includes(user.role)) {
                logger.warn('Insufficient permissions', {
                    userId: req.userId,
                    userRole: user.role,
                    requiredRoles: allowedRoles,
                    path: req.path
                });
                return res.status(403).json({ 
                    error: 'Недостаточно прав',
                    code: 'INSUFFICIENT_PERMISSIONS'
                });
            }

            // Добавляем информацию о пользователе в запрос
            req.userRole = user.role;
            req.user = user;

            next();
        } catch (error) {
            logger.error('Role middleware error', { error: error.message });
            res.status(500).json({ 
                error: 'Ошибка проверки прав',
                code: 'ROLE_CHECK_ERROR'
            });
        }
    };
}

/**
 * Middleware для проверки владения ресурсом
 * @param {string} resourceModel - Модель ресурса
 * @param {string} resourceIdParam - Параметр с ID ресурса
 * @param {string} userIdField - Поле с ID пользователя в ресурсе
 */
function requireOwnership(resourceModel, resourceIdParam = 'id', userIdField = 'user_id') {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[resourceIdParam];
            
            if (!resourceId || !mongoose.Types.ObjectId.isValid(resourceId)) {
                return res.status(400).json({ 
                    error: 'Некорректный ID ресурса',
                    code: 'INVALID_RESOURCE_ID'
                });
            }

            // Получаем ресурс
            const Resource = require(`../../models/${resourceModel}`);
            const resource = await Resource.findById(resourceId).lean();

            if (!resource) {
                return res.status(404).json({ 
                    error: 'Ресурс не найден',
                    code: 'RESOURCE_NOT_FOUND'
                });
            }

            // Проверяем владение
            if (resource[userIdField].toString() !== req.userId) {
                logger.warn('Unauthorized resource access', {
                    userId: req.userId,
                    resourceId: resourceId,
                    resourceOwner: resource[userIdField],
                    path: req.path
                });
                return res.status(403).json({ 
                    error: 'Нет доступа к ресурсу',
                    code: 'RESOURCE_ACCESS_DENIED'
                });
            }

            // Добавляем ресурс в запрос
            req.resource = resource;
            next();
        } catch (error) {
            logger.error('Ownership middleware error', { error: error.message });
            res.status(500).json({ 
                error: 'Ошибка проверки владения',
                code: 'OWNERSHIP_CHECK_ERROR'
            });
        }
    };
}

/**
 * Middleware для проверки CSRF токена
 */
function requireCSRF(req, res, next) {
    // Пропускаем GET запросы
    if (req.method === 'GET') {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;
    const sessionToken = req.session.csrfToken;

    if (!token || !sessionToken || token !== sessionToken) {
        logger.warn('CSRF token mismatch', {
            ip: req.ip,
            path: req.path,
            providedToken: token ? 'present' : 'missing',
            sessionToken: sessionToken ? 'present' : 'missing'
        });
        return res.status(403).json({ 
            error: 'Недействительный CSRF токен',
            code: 'CSRF_ERROR'
        });
    }

    next();
}

/**
 * Middleware для проверки активности пользователя
 */
async function checkUserActivity(req, res, next) {
    try {
        if (!req.userIdObject) {
            return next();
        }

        // Обновляем время последнего входа
        await User.findByIdAndUpdate(req.userIdObject, {
            last_login: new Date()
        });

        next();
    } catch (error) {
        logger.error('User activity check error', { error: error.message });
        next(); // Не блокируем запрос при ошибке
    }
}

/**
 * Middleware для логирования действий пользователя
 */
function logUserAction(action) {
    return (req, res, next) => {
        if (req.userId) {
            logger.info('User action', {
                userId: req.userId,
                username: req.username,
                action: action,
                path: req.path,
                method: req.method,
                ip: req.ip
            });
        }
        next();
    };
}

/**
 * Middleware для проверки лимитов запросов пользователя
 */
function checkUserLimits(limitType) {
    return async (req, res, next) => {
        try {
            if (!req.userIdObject) {
                return next();
            }

            // Здесь можно добавить проверку лимитов пользователя
            // Например, количество деревень, войск и т.д.
            
            next();
        } catch (error) {
            logger.error('User limits check error', { error: error.message });
            next();
        }
    };
}

module.exports = {
    requireAuth,
    requireRole,
    requireOwnership,
    requireCSRF,
    checkUserActivity,
    logUserAction,
    checkUserLimits,
    
    // Сокращения для часто используемых ролей
    requireAdmin: requireRole('admin'),
    requireModerator: requireRole(['admin', 'moderator']),
    requireUser: requireRole('user')
}; 