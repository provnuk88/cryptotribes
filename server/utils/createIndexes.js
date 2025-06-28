const mongoose = require('mongoose');
const { logger } = require('../logger');

async function createIndexes() {
    try {
        logger.info('Creating database indexes...');
        
        // User indexes
        const User = require('../../models/User');
        await createIndexIfNotExists(User.collection, 'username_1', { username: 1 }, { unique: true });
        await createIndexIfNotExists(User.collection, 'tribe_id_1', { tribe_id: 1 }, { sparse: true });
        await createIndexIfNotExists(User.collection, 'created_at_-1', { created_at: -1 });
        
        // Village indexes
        const Village = require('../../models/Village');
        await createIndexIfNotExists(Village.collection, 'user_id_1', { user_id: 1 });
        await createIndexIfNotExists(Village.collection, 'x_1_y_1', { x: 1, y: 1 }, { unique: true });
        await createIndexIfNotExists(Village.collection, 'points_-1', { points: -1 });
        await createIndexIfNotExists(Village.collection, 'last_update_1', { last_update: 1 });
        
        // Building indexes
        const Building = require('../../models/Building');
        await createIndexIfNotExists(Building.collection, 'village_id_1_building_type_1', { village_id: 1, building_type: 1 }, { unique: true });
        await createIndexIfNotExists(Building.collection, 'is_upgrading_1_upgrade_finish_time_1', { is_upgrading: 1, upgrade_finish_time: 1 }, { sparse: true });
        
        // Troop indexes
        const Troop = require('../../models/Troop');
        await createIndexIfNotExists(Troop.collection, 'village_id_1_troop_type_1', { village_id: 1, troop_type: 1 }, { unique: true });
        
        // TrainingQueue indexes
        const TrainingQueue = require('../../models/TrainingQueue');
        await createIndexIfNotExists(TrainingQueue.collection, 'village_id_1', { village_id: 1 });
        await createIndexIfNotExists(TrainingQueue.collection, 'finish_time_1', { finish_time: 1 });
        
        // Payment indexes
        const Payment = require('../../models/Payment');
        await createIndexIfNotExists(Payment.collection, 'user_id_1_created_at_-1', { user_id: 1, created_at: -1 });
        await createIndexIfNotExists(Payment.collection, 'transaction_id_1', { transaction_id: 1 }, { unique: true });
        await createIndexIfNotExists(Payment.collection, 'status_1', { status: 1 });
        
        // PromoCode indexes
        const PromoCode = require('../../models/PromoCode');
        await createIndexIfNotExists(PromoCode.collection, 'code_1', { code: 1 }, { unique: true });
        await createIndexIfNotExists(PromoCode.collection, 'active_1_expires_at_1', { active: 1, expires_at: 1 });
        
        // PromoUse indexes
        const PromoUse = require('../../models/PromoUse');
        await createIndexIfNotExists(PromoUse.collection, 'user_id_1_promo_id_1', { user_id: 1, promo_id: 1 }, { unique: true });
        
        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.error('Error creating indexes:', error);
        // Не выбрасываем ошибку, чтобы сервер мог продолжить работу
        logger.error('Failed to create indexes:', error.message);
    }
}

async function createIndexIfNotExists(collection, indexName, keys, options = {}) {
    try {
        const existingIndexes = await collection.indexes();
        const indexExists = existingIndexes.some(index => index.name === indexName);
        
        if (!indexExists) {
            await collection.createIndex(keys, { ...options, name: indexName });
        }
    } catch (error) {
        // Игнорируем ошибки создания индексов
        logger.warn(`Index ${indexName} already exists or could not be created:`, error.message);
    }
}

module.exports = { createIndexes }; 