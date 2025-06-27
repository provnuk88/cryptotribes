const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Создаем директорию для логов
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Форматирование логов
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level.toUpperCase()}]: ${message}`;
        
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        
        return msg;
    })
);

// Создаем логгер
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Логи ошибок
        new winston.transports.File({
            filename: path.join(logsDir, 'error.log'),
            level: 'error',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true
        }),
        
        // Все логи
        new winston.transports.File({
            filename: path.join(logsDir, 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),
        
        // Игровые события
        new winston.transports.File({
            filename: path.join(logsDir, 'game.log'),
            level: 'info',
            maxsize: 10485760, // 10MB
            maxFiles: 5,
            tailable: true,
            format: winston.format.combine(
                winston.format((info) => {
                    return info.category === 'game' ? info : false;
                })(),
                logFormat
            )
        }),
        
        // Платежи (важно!)
        new winston.transports.File({
            filename: path.join(logsDir, 'payments.log'),
            level: 'info',
            maxsize: 10485760, // 10MB
            maxFiles: 20, // Храним больше файлов для платежей
            tailable: true,
            format: winston.format.combine(
                winston.format((info) => {
                    return info.category === 'payment' ? info : false;
                })(),
                logFormat
            )
        })
    ]
});

// Консольный вывод для разработки
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, ...metadata }) => {
                let msg = `${timestamp} [${level}]: ${message}`;
                
                // Красивый вывод для определенных событий
                if (metadata.category === 'performance') {
                    msg = `⚡ ${message} (${metadata.duration}ms)`;
                } else if (metadata.category === 'game') {
                    msg = `🎮 ${message}`;
                } else if (metadata.category === 'payment') {
                    msg = `💰 ${message}`;
                }
                
                return msg;
            })
        )
    }));
}

// Middleware для логирования HTTP запросов
function httpLogger(req, res, next) {
    const start = Date.now();
    
    // Логируем после завершения запроса
    res.on('finish', () => {
        const duration = Date.now() - start;
        
        const logData = {
            method: req.method,
            url: req.url,
            status: res.statusCode,
            duration: duration,
            ip: req.ip || req.connection.remoteAddress,
            userAgent: req.get('user-agent'),
            category: 'http'
        };
        
        // Добавляем userId если есть
        if (req.session && req.session.userId) {
            logData.userId = req.session.userId;
        }
        
        // Определяем уровень лога по статусу
        if (res.statusCode >= 500) {
            logger.error('Server Error', logData);
        } else if (res.statusCode >= 400) {
            logger.warn('Client Error', logData);
        } else if (duration > 1000) {
            logger.warn('Slow Request', logData);
        } else {
            logger.info('Request', logData);
        }
    });
    
    next();
}

// Логирование игровых событий
const gameLogger = {
    // Регистрация и вход
    userRegistered: (username, userId) => {
        logger.info('New user registered', {
            category: 'game',
            event: 'user_registered',
            username,
            userId
        });
    },
    
    userLogin: (username, userId) => {
        logger.info('User logged in', {
            category: 'game',
            event: 'user_login',
            username,
            userId
        });
    },
    
    // Деревни и здания
    villageCreated: (userId, villageId, name) => {
        logger.info('Village created', {
            category: 'game',
            event: 'village_created',
            userId,
            villageId,
            villageName: name
        });
    },
    
    buildingUpgraded: (userId, villageId, buildingType, level) => {
        logger.info('Building upgraded', {
            category: 'game',
            event: 'building_upgraded',
            userId,
            villageId,
            buildingType,
            level
        });
    },
    
    // Войска и бои
    troopsTrained: (userId, villageId, troopType, amount) => {
        logger.info('Troops trained', {
            category: 'game',
            event: 'troops_trained',
            userId,
            villageId,
            troopType,
            amount
        });
    },
    
    attackSent: (attackerId, defenderId, fromVillage, toVillage) => {
        logger.info('Attack sent', {
            category: 'game',
            event: 'attack_sent',
            attackerId,
            defenderId,
            fromVillage,
            toVillage
        });
    },
    
    battleResult: (attackerId, defenderId, winner, loot) => {
        logger.info('Battle completed', {
            category: 'game',
            event: 'battle_result',
            attackerId,
            defenderId,
            winner,
            loot
        });
    },
    
    // Племена
    tribeCreated: (userId, tribeId, name) => {
        logger.info('Tribe created', {
            category: 'game',
            event: 'tribe_created',
            userId,
            tribeId,
            tribeName: name
        });
    },
    
    // Ресурсы
    resourcesUpdated: (villageCount, duration) => {
        logger.info('Resources updated for all villages', {
            category: 'game',
            event: 'resources_updated',
            villageCount,
            duration
        });
    }
};

// Логирование платежей
const paymentLogger = {
    paymentInitiated: (userId, amount, currency, method) => {
        logger.info('Payment initiated', {
            category: 'payment',
            event: 'payment_initiated',
            userId,
            amount,
            currency,
            method
        });
    },
    
    paymentCompleted: (userId, transactionId, amount, currency) => {
        logger.info('Payment completed', {
            category: 'payment',
            event: 'payment_completed',
            userId,
            transactionId,
            amount,
            currency
        });
    },
    
    paymentFailed: (userId, reason, amount, currency) => {
        logger.error('Payment failed', {
            category: 'payment',
            event: 'payment_failed',
            userId,
            reason,
            amount,
            currency
        });
    },
    
    crystalsPurchased: (userId, crystals, amount, currency) => {
        logger.info('Crystals purchased', {
            category: 'payment',
            event: 'crystals_purchased',
            userId,
            crystals,
            amount,
            currency
        });
    }
};

// Измерение производительности
class PerformanceTracker {
    constructor() {
        this.timers = new Map();
    }
    
    start(label) {
        this.timers.set(label, Date.now());
    }
    
    end(label, metadata = {}) {
        const start = this.timers.get(label);
        if (!start) {
            logger.warn(`Performance timer '${label}' was not started`);
            return;
        }
        
        const duration = Date.now() - start;
        this.timers.delete(label);
        
        logger.info(`${label} completed`, {
            category: 'performance',
            duration,
            ...metadata
        });
        
        // Предупреждение о медленных операциях
        if (duration > 1000) {
            logger.warn(`Slow operation: ${label}`, {
                category: 'performance',
                duration,
                ...metadata
            });
        }
        
        return duration;
    }
}

const performance = new PerformanceTracker();

// Статистика
async function logServerStats() {
    const usage = process.memoryUsage();
    const stats = {
        category: 'system',
        event: 'server_stats',
        memory: {
            rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
            external: Math.round(usage.external / 1024 / 1024) + 'MB'
        },
        uptime: Math.round(process.uptime() / 60) + ' minutes',
        nodeVersion: process.version,
        platform: process.platform
    };
    
    logger.info('Server statistics', stats);
}

// Логируем статистику каждые 10 минут
if (process.env.NODE_ENV === 'production') {
    setInterval(logServerStats, 10 * 60 * 1000);
}

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    // Даем время записать лог перед выходом
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
});

module.exports = {
    logger,
    httpLogger,
    gameLogger,
    paymentLogger,
    performance
};