// server/securityMiddlewares.js

// Пример простого middleware (замени на свои реальные реализации)
function securityMiddleware(req, res, next) {
    // ... твоя логика безопасности ...
    next();
}

// Пример лимитера (замени на свои реальные реализации)
function generalLimiter(req, res, next) {
    // ... логика лимита ...
    next();
}

function authLimiter(req, res, next) {
    next();
}
function gameLimiter(req, res, next) {
    next();
}
function createLimiter(req, res, next) {
    next();
}
function bruteForceProtection(req, res, next) {
    next();
}
function incrementLoginAttempts() {}
function resetLoginAttempts() {}
const validators = {
    username: (u) => u && u.length >= 3 ? null : 'Логин минимум 3 символа',
    password: (p) => p && p.length >= 6 ? null : 'Пароль минимум 6 символов'
};

module.exports = {
    securityMiddleware,
    generalLimiter,
    authLimiter,
    gameLimiter,
    createLimiter,
    bruteForceProtection,
    incrementLoginAttempts,
    resetLoginAttempts,
    validators
};
