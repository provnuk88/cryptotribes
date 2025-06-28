const mongoose = require('mongoose');
const { logger } = require('../logger');

/**
 * Проверяет и конвертирует ID в ObjectId
 * @param {string|ObjectId} id - ID для проверки
 * @param {string} fieldName - Название поля для ошибки
 * @returns {ObjectId} Валидный ObjectId
 * @throws {Error} Если ID невалидный
 */
function validateAndConvertId(id, fieldName = 'ID') {
    if (!id) {
        throw new Error(`${fieldName} обязателен`);
    }
    
    // Если уже ObjectId, возвращаем как есть
    if (id instanceof mongoose.Types.ObjectId) {
        return id;
    }
    
    // Проверяем формат строки
    if (typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id)) {
        logger.warn('Invalid ObjectId attempt', {
            fieldName,
            value: id,
            type: typeof id
        });
        throw new Error(`Некорректный ${fieldName}`);
    }
    
    try {
        return new mongoose.Types.ObjectId(id);
    } catch (error) {
        throw new Error(`Некорректный ${fieldName}`);
    }
}

/**
 * Middleware для валидации ID в параметрах
 */
function validateParamId(paramName = 'id') {
    return (req, res, next) => {
        try {
            const id = req.params[paramName];
            req.validatedParams = req.validatedParams || {};
            req.validatedParams[paramName] = validateAndConvertId(id, paramName);
            next();
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}

/**
 * Middleware для валидации ID в body
 */
function validateBodyIds(...fieldNames) {
    return (req, res, next) => {
        try {
            req.validatedBody = req.validatedBody || {};
            
            for (const fieldName of fieldNames) {
                if (req.body[fieldName]) {
                    req.validatedBody[fieldName] = validateAndConvertId(
                        req.body[fieldName], 
                        fieldName
                    );
                }
            }
            
            next();
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    };
}

/**
 * Проверяет, является ли пользователь владельцем ресурса
 */
async function validateOwnership(userId, resourceId, Model, resourceName = 'ресурс') {
    const resource = await Model.findById(resourceId).lean();
    
    if (!resource) {
        throw new Error(`${resourceName} не найден`);
    }
    
    const ownerId = resource.user_id || resource.owner_id;
    if (!ownerId || ownerId.toString() !== userId.toString()) {
        logger.warn('Unauthorized access attempt', {
            userId: userId.toString(),
            resourceId: resourceId.toString(),
            resourceType: resourceName
        });
        throw new Error('Доступ запрещен');
    }
    
    return resource;
}

module.exports = {
    validateAndConvertId,
    validateParamId,
    validateBodyIds,
    validateOwnership
}; 