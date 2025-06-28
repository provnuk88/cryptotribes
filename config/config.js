/**
 * Конфигурация приложения CryptoTribes
 * Централизованное управление всеми настройками
 */

require('dotenv').config();

const config = {
    // Основные настройки приложения
    app: {
        name: 'CryptoTribes',
        version: '1.0.0',
        port: process.env.PORT || 3000,
        environment: process.env.NODE_ENV || 'development',
        host: process.env.HOST || 'localhost',
        baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
        apiPrefix: '/api'
    },

    // База данных
    database: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferMaxEntries: 0,
            bufferCommands: false
        },
        test: {
            uri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptotribes_test'
        }
    },

    // Сессии
    session: {
        secret: process.env.SESSION_SECRET || 'cryptotribes-secret-key-change-in-production',
        name: 'cryptotribes.sid',
        resave: false,
        saveUninitialized: false,
        cookie: {
            maxAge: 24 * 60 * 60 * 1000, // 24 часа
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            domain: process.env.COOKIE_DOMAIN || undefined
        },
        store: {
            mongoUrl: process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes',
            ttl: 24 * 60 * 60, // 24 часа в секундах
            autoRemove: 'native'
        }
    },

    // Безопасность
    security: {
        bcryptRounds: 12,
        jwtSecret: process.env.JWT_SECRET || 'jwt-secret-change-in-production',
        csrfEnabled: true,
        rateLimits: {
            general: {
                windowMs: 15 * 60 * 1000, // 15 минут
                max: 100 // максимум 100 запросов
            },
            auth: {
                windowMs: 15 * 60 * 1000, // 15 минут
                max: 5 // максимум 5 попыток входа
            },
            game: {
                windowMs: 1 * 60 * 1000, // 1 минута
                max: 30 // максимум 30 действий
            },
            create: {
                windowMs: 60 * 60 * 1000, // 1 час
                max: 10 // максимум 10 созданий
            }
        },
        bruteForce: {
            maxAttempts: 5,
            lockTime: 2 * 60 * 60 * 1000, // 2 часа
            resetTime: 30 * 60 * 1000 // 30 минут
        }
    },

    // Логирование
    logging: {
        level: process.env.LOG_LEVEL || 'info',
        directory: './logs',
        maxSize: '10m',
        maxFiles: 10,
        rotation: {
            daily: true,
            weekly: true,
            monthly: true
        },
        categories: {
            error: { filename: 'error.log', level: 'error' },
            combined: { filename: 'combined.log', level: 'info' },
            game: { filename: 'game.log', level: 'info' },
            payments: { filename: 'payments.log', level: 'info' },
            performance: { filename: 'performance.log', level: 'info' }
        }
    },

    // Платежи
    payments: {
        stripe: {
            secretKey: process.env.STRIPE_SECRET_KEY,
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
            currency: 'usd'
        },
        crypto: {
            apiKey: process.env.CRYPTO_API_KEY,
            apiUrl: process.env.CRYPTO_API_URL || 'https://api.crypto.com',
            supportedCurrencies: ['USDT', 'BTC', 'ETH']
        },
        limits: {
            daily: 1000, // $1000 в день
            monthly: 10000, // $10000 в месяц
            single: 500 // $500 за раз
        }
    },

    // Игровые настройки
    game: {
        // Ресурсы
        resources: {
            initial: {
                wood: 1000,
                clay: 1000,
                iron: 1000,
                food: 1000
            },
            maxUpdateTime: 12 * 60 * 60 * 1000, // 12 часов
            productionMultiplier: 1.2
        },

        // Здания
        buildings: {
            maxLevel: 20,
            baseCostMultiplier: 1.5,
            timeMultiplier: 1.1
        },

        // Войска
        troops: {
            maxTrainingQueue: 100,
            maxTroopsPerType: 10000
        },

        // Карта мира
        world: {
            size: 1000, // 1000x1000
            barbarianDensity: 0.3, // 30% варварских деревень
            minDistance: 3 // минимальное расстояние между деревнями
        },

        // Игровой цикл
        cycle: {
            resourceUpdate: 60 * 1000, // 1 минута
            constructionQueue: 60 * 1000, // 1 минута
            trainingQueue: 60 * 1000, // 1 минута
            attackProcessing: 60 * 1000 // 1 минута
        }
    },

    // Мониторинг и метрики
    monitoring: {
        enabled: true,
        metricsEndpoint: '/api/metrics',
        slowQueryThreshold: 1000, // 1 секунда
        healthCheck: {
            enabled: true,
            endpoint: '/health',
            interval: 30 * 1000 // 30 секунд
        }
    },

    // CORS
    cors: {
        origin: process.env.CORS_ORIGIN || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    },

    // Кэширование
    cache: {
        enabled: process.env.CACHE_ENABLED === 'true',
        ttl: 5 * 60, // 5 минут
        checkPeriod: 60 // 1 минута
    }
};

// Валидация конфигурации
function validateConfig() {
    const required = [
        'database.uri',
        'session.secret',
        'security.bcryptRounds'
    ];

    const missing = required.filter(key => {
        const value = key.split('.').reduce((obj, k) => obj && obj[k], config);
        return value === undefined || value === null || value === '';
    });

    if (missing.length > 0) {
        throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }

    // Проверка окружения
    if (config.app.environment === 'production') {
        if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'cryptotribes-secret-key-change-in-production') {
            throw new Error('SESSION_SECRET must be set in production');
        }
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI must be set in production');
        }
    }
}

// Экспорт конфигурации
module.exports = {
    ...config,
    validate: validateConfig,
    isProduction: config.app.environment === 'production',
    isDevelopment: config.app.environment === 'development',
    isTest: config.app.environment === 'test'
}; 