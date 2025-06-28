const { logger, performance } = require('../logger');

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            requests: new Map(),
            database: new Map(),
            gameLoop: new Map()
        };
        
        // Очищаем старые метрики каждый час
        setInterval(() => this.cleanup(), 60 * 60 * 1000);
    }
    
    // Записать метрику запроса
    recordRequest(method, path, duration, statusCode) {
        const key = `${method} ${path}`;
        const metric = this.metrics.requests.get(key) || {
            count: 0,
            totalDuration: 0,
            avgDuration: 0,
            maxDuration: 0,
            errors: 0
        };
        
        metric.count++;
        metric.totalDuration += duration;
        metric.avgDuration = metric.totalDuration / metric.count;
        metric.maxDuration = Math.max(metric.maxDuration, duration);
        
        if (statusCode >= 400) {
            metric.errors++;
        }
        
        this.metrics.requests.set(key, metric);
    }
    
    // Записать метрику БД
    recordDatabase(operation, collection, duration) {
        const key = `${operation}:${collection}`;
        const metric = this.metrics.database.get(key) || {
            count: 0,
            totalDuration: 0,
            avgDuration: 0,
            maxDuration: 0
        };
        
        metric.count++;
        metric.totalDuration += duration;
        metric.avgDuration = metric.totalDuration / metric.count;
        metric.maxDuration = Math.max(metric.maxDuration, duration);
        
        this.metrics.database.set(key, metric);
    }
    
    // Получить отчет
    getReport() {
        const report = {
            timestamp: new Date(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            requests: {},
            database: {},
            gameLoop: {}
        };
        
        // Конвертируем Map в объекты
        for (const [key, value] of this.metrics.requests) {
            report.requests[key] = value;
        }
        
        for (const [key, value] of this.metrics.database) {
            report.database[key] = value;
        }
        
        for (const [key, value] of this.metrics.gameLoop) {
            report.gameLoop[key] = value;
        }
        
        return report;
    }
    
    // Очистка старых метрик
    cleanup() {
        // Сохраняем текущие метрики в лог
        const report = this.getReport();
        logger.info('Performance metrics snapshot', report);
        
        // Очищаем для следующего периода
        this.metrics.requests.clear();
        this.metrics.database.clear();
        this.metrics.gameLoop.clear();
    }
    
    // Middleware для Express
    middleware() {
        return (req, res, next) => {
            const start = Date.now();
            
            // Перехватываем окончание запроса
            const originalEnd = res.end;
            res.end = (...args) => {
                const duration = Date.now() - start;
                this.recordRequest(req.method, req.route?.path || req.path, duration, res.statusCode);
                
                // Предупреждение о медленных запросах
                if (duration > 1000) {
                    logger.warn('Slow request detected', {
                        method: req.method,
                        path: req.path,
                        duration,
                        userId: req.session?.userId
                    });
                }
                
                originalEnd.apply(res, args);
            };
            
            next();
        };
    }
}

// Создаем глобальный экземпляр
const performanceMonitor = new PerformanceMonitor();

// Monkey-patch mongoose для мониторинга запросов
const mongoose = require('mongoose');
const originalExec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.exec = function(...args) {
    const start = Date.now();
    const collection = this.mongooseCollection?.name || 'unknown';
    const operation = this.op || 'unknown';
    
    const result = originalExec.apply(this, args);
    
    // Обрабатываем и промисы и коллбеки
    if (result && result.then) {
        return result.then(
            (value) => {
                const duration = Date.now() - start;
                performanceMonitor.recordDatabase(operation, collection, duration);
                
                if (duration > 500) {
                    logger.warn('Slow database query', {
                        operation,
                        collection,
                        duration,
                        query: this.getQuery()
                    });
                }
                
                return value;
            },
            (error) => {
                const duration = Date.now() - start;
                performanceMonitor.recordDatabase(operation, collection, duration);
                throw error;
            }
        );
    }
    
    return result;
};

// Эндпоинт для получения метрик
function setupMetricsEndpoint(app) {
    app.get('/api/metrics', (req, res) => {
        // Проверяем права (только для админов или с специальным токеном)
        const metricsToken = req.headers['x-metrics-token'];
        
        if (metricsToken !== process.env.METRICS_TOKEN && !req.isAdmin) {
            return res.status(403).json({ error: 'Access denied' });
        }
        
        const report = performanceMonitor.getReport();
        res.json(report);
    });
}

module.exports = {
    performanceMonitor,
    setupMetricsEndpoint
}; 