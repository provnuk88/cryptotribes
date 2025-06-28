const mongoose = require('mongoose');
const { logger } = require('../logger');

/**
 * Выполняет операцию в транзакции MongoDB
 * @param {Function} callback - Асинхронная функция с операциями
 * @returns {Promise} Результат операции
 */
async function withTransaction(callback) {
    const session = await mongoose.startSession();
    
    try {
        let result;
        
        await session.withTransaction(async () => {
            result = await callback(session);
        });
        
        return result;
    } catch (error) {
        logger.error('Transaction failed', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    } finally {
        await session.endSession();
    }
}

module.exports = {
    withTransaction
}; 