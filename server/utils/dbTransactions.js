const mongoose = require('mongoose');
const { logger } = require('../logger');

/**
 * Проверяет, поддерживает ли MongoDB транзакции
 * @returns {Promise<boolean>}
 */
async function supportsTransactions() {
    try {
        const adminDb = mongoose.connection.db.admin();
        const serverStatus = await adminDb.serverStatus();
        
        // Транзакции поддерживаются только в replica set или mongos
        return serverStatus.repl && (
            serverStatus.repl.setName || 
            serverStatus.repl.ismaster || 
            serverStatus.repl.primary
        );
    } catch (error) {
        logger.warn('Could not determine transaction support:', error.message);
        return false;
    }
}

/**
 * Выполняет операцию в транзакции MongoDB (если поддерживается)
 * @param {Function} callback - Асинхронная функция с операциями
 * @returns {Promise} Результат операции
 */
async function withTransaction(callback) {
    const hasTransactions = await supportsTransactions();
    
    if (!hasTransactions) {
        // Если транзакции не поддерживаются, выполняем без них
        logger.debug('Transactions not supported, executing without transaction');
        return await callback(null);
    }
    
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
    withTransaction,
    supportsTransactions
}; 