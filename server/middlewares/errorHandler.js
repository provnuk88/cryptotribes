/**
 * Централизованный обработчик ошибок
 * Обеспечивает единообразную обработку всех ошибок приложения
 */

const { logger } = require('../logger');
// const config = require('../../config/config'); // TODO: раскомментировать когда создадим config

// Временные переменные пока нет config
const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Класс для пользовательских ошибок приложения
 */
class AppError extends Error {
    constructor(message, statusCode, code = null, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Обработчик ошибок MongoDB
 */
function handleMongoError(error) {
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return {
            statusCode: 400,
            message: 'Ошибка валидации данных',
            code: 'VALIDATION_ERROR',
            details: messages
        };
    }

    if (error.name === 'CastError') {
        return {
            statusCode: 400,
            message: 'Некорректный формат данных',
            code: 'CAST_ERROR',
            details: `Поле ${error.path} имеет неверный формат`
        };
    }

    if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return {
            statusCode: 409,
            message: 'Данные уже существуют',
            code: 'DUPLICATE_ERROR',
            details: `Поле ${field} уже используется`
        };
    }

    if (error.name === 'MongoNetworkError') {
        return {
            statusCode: 503,
            message: 'Ошибка подключения к базе данных',
            code: 'DATABASE_ERROR'
        };
    }

    return null;
}

/**
 * Обработчик ошибок валидации
 */
function handleValidationError(error) {
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        return {
            statusCode: 400,
            message: 'Ошибка валидации',
            code: 'VALIDATION_ERROR',
            details: messages
        };
    }
    return null;
}

/**
 * Обработчик ошибок JWT
 */
function handleJWTError(error) {
    if (error.name === 'JsonWebTokenError') {
        return {
            statusCode: 401,
            message: 'Недействительный токен',
            code: 'JWT_ERROR'
        };
    }

    if (error.name === 'TokenExpiredError') {
        return {
            statusCode: 401,
            message: 'Токен истек',
            code: 'JWT_EXPIRED'
        };
    }

    return null;
}

/**
 * Основной middleware для обработки ошибок
 */
function errorHandler(error, req, res, next) {
    let errorResponse = {
        statusCode: 500,
        message: 'Внутренняя ошибка сервера',
        code: 'INTERNAL_ERROR'
    };

    // Логируем ошибку
    const logData = {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
        userId: req.userId || 'anonymous'
    };

    // Обрабатываем различные типы ошибок
    if (error instanceof AppError) {
        errorResponse = {
            statusCode: error.statusCode,
            message: error.message,
            code: error.code,
            details: error.details
        };
        
        if (error.statusCode >= 500) {
            logger.error('Operational error', logData);
        } else {
            logger.warn('Client error', logData);
        }
    } else if (error.name === 'MongoError' || error.name === 'MongoNetworkError') {
        const mongoError = handleMongoError(error);
        if (mongoError) {
            errorResponse = mongoError;
            logger.warn('MongoDB error', logData);
        } else {
            logger.error('Unhandled MongoDB error', logData);
        }
    } else if (error.name === 'ValidationError') {
        const validationError = handleValidationError(error);
        if (validationError) {
            errorResponse = validationError;
            logger.warn('Validation error', logData);
        }
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        const jwtError = handleJWTError(error);
        if (jwtError) {
            errorResponse = jwtError;
            logger.warn('JWT error', logData);
        }
    } else if (error.code === 'ECONNREFUSED') {
        errorResponse = {
            statusCode: 503,
            message: 'Сервис временно недоступен',
            code: 'SERVICE_UNAVAILABLE'
        };
        logger.error('Connection refused', logData);
    } else if (error.code === 'ENOTFOUND') {
        errorResponse = {
            statusCode: 503,
            message: 'Сервис недоступен',
            code: 'SERVICE_NOT_FOUND'
        };
        logger.error('Service not found', logData);
    } else {
        // Неизвестная ошибка
        logger.error('Unhandled error', logData);
    }

    // В продакшене не показываем детали ошибок
    if (isProduction && errorResponse.statusCode >= 500) {
        errorResponse.message = 'Внутренняя ошибка сервера';
        errorResponse.details = null;
    }

    // Отправляем ответ
    res.status(errorResponse.statusCode).json({
        error: errorResponse.message,
        code: errorResponse.code,
        ...(errorResponse.details && { details: errorResponse.details }),
        ...(isDevelopment && { stack: error.stack })
    });
}

/**
 * Middleware для обработки 404 ошибок
 */
function notFoundHandler(req, res, next) {
    const error = new AppError(
        `Endpoint ${req.method} ${req.originalUrl} не найден`,
        404,
        'ENDPOINT_NOT_FOUND'
    );
    next(error);
}

/**
 * Middleware для обработки необработанных промисов
 */
function handleUnhandledRejection(reason, promise) {
    logger.error('Unhandled Rejection', {
        reason: reason,
        promise: promise
    });
    
    // В продакшене завершаем процесс
    if (isProduction) {
        process.exit(1);
    }
}

/**
 * Middleware для обработки необработанных исключений
 */
function handleUncaughtException(error) {
    logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
    });
    
    // В продакшене завершаем процесс
    if (isProduction) {
        process.exit(1);
    }
}

/**
 * Middleware для обработки ошибок валидации express-validator
 */
function handleValidationErrors(req, res, next) {
    const errors = req.validationErrors();
    if (errors) {
        const error = new AppError(
            'Ошибка валидации данных',
            400,
            'VALIDATION_ERROR',
            errors.map(err => err.msg)
        );
        return next(error);
    }
    next();
}

/**
 * Middleware для обработки ошибок асинхронных функций
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

/**
 * Middleware для обработки ошибок с кастомным контекстом
 */
function errorHandlerWithContext(context) {
    return (error, req, res, next) => {
        // Добавляем контекст к логу
        const logData = {
            context,
            error: error.message,
            stack: error.stack,
            url: req.url,
            method: req.method,
            ip: req.ip,
            userId: req.userId || 'anonymous'
        };
        
        logger.error(`Error in ${context}`, logData);
        
        // Вызываем основной обработчик
        errorHandler(error, req, res, next);
    };
}

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    handleUnhandledRejection,
    handleUncaughtException,
    handleValidationErrors,
    asyncHandler,
    errorHandlerWithContext
}; 