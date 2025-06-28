const mongoose = require('mongoose');
const { logger } = require('../logger');

async function createIndexes() {
    try {
        logger.info('Creating database indexes...');
        
        // User indexes
        const User = require('../../models/User');
        await User.collection.createIndexes([
            { key: { username: 1 }, unique: true },
            { key: { tribe_id: 1 }, sparse: true },
            { key: { created_at: -1 } }
        ]);
        
        // Village indexes
        const Village = require('../../models/Village');
        await Village.collection.createIndexes([
            { key: { user_id: 1 } },
            { key: { x: 1, y: 1 }, unique: true },
            { key: { points: -1 } }, // для рейтинга
            { key: { last_update: 1 } } // для обновления ресурсов
        ]);
        
        // Building indexes
        const Building = require('../../models/Building');
        await Building.collection.createIndexes([
            { key: { village_id: 1, building_type: 1 }, unique: true },
            { key: { is_upgrading: 1, upgrade_finish_time: 1 }, sparse: true }
        ]);
        
        // Troop indexes
        const Troop = require('../../models/Troop');
        await Troop.collection.createIndexes([
            { key: { village_id: 1, troop_type: 1 }, unique: true }
        ]);
        
        // TrainingQueue indexes
        const TrainingQueue = require('../../models/TrainingQueue');
        await TrainingQueue.collection.createIndexes([
            { key: { village_id: 1 } },
            { key: { finish_time: 1 } }
        ]);
        
        // Payment indexes
        const Payment = require('../../models/Payment');
        await Payment.collection.createIndexes([
            { key: { user_id: 1, created_at: -1 } },
            { key: { transaction_id: 1 }, unique: true },
            { key: { status: 1 } }
        ]);
        
        // PromoCode indexes
        const PromoCode = require('../../models/PromoCode');
        await PromoCode.collection.createIndexes([
            { key: { code: 1 }, unique: true },
            { key: { active: 1, expires_at: 1 } }
        ]);
        
        // PromoUse indexes
        const PromoUse = require('../../models/PromoUse');
        await PromoUse.collection.createIndexes([
            { key: { user_id: 1, promo_id: 1 }, unique: true }
        ]);
        
        logger.info('Database indexes created successfully');
    } catch (error) {
        logger.error('Error creating indexes:', error);
        throw error;
    }
}

module.exports = { createIndexes }; 