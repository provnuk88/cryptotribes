const mongoose = require('mongoose');
const Village = require('../models/Village');
const Building = require('../models/Building');
const Troop = require('../models/Troop');
const TrainingQueue = require('../models/TrainingQueue');
const User = require('../models/User');
const { withTransaction } = require('./utils/dbTransactions');
const { logger, gameLogger } = require('./logger');

// Game constants
const BUILDING_TYPES = {
    tribal_hall: { name: 'Tribal Hall', baseCost: { wood: 90, clay: 80, iron: 70, food: 0 }, baseTime: 1 },
    farm: { name: 'Farm', baseCost: { wood: 45, clay: 40, iron: 30, food: 0 }, baseTime: 2, production: 'food', baseProduction: 30 },
    lumbercamp: { name: 'Lumbercamp', baseCost: { wood: 50, clay: 60, iron: 40, food: 0 }, baseTime: 2, production: 'wood', baseProduction: 30 },
    clay_pit: { name: 'Clay Pit', baseCost: { wood: 65, clay: 50, iron: 40, food: 0 }, baseTime: 2, production: 'clay', baseProduction: 30 },
    iron_mine: { name: 'Iron Mine', baseCost: { wood: 75, clay: 65, iron: 70, food: 0 }, baseTime: 3, production: 'iron', baseProduction: 30 },
    warehouse: { name: 'Warehouse', baseCost: { wood: 60, clay: 50, iron: 40, food: 0 }, baseTime: 2, baseCapacity: 1000 },
    barracks: { name: 'Barracks', baseCost: { wood: 200, clay: 170, iron: 90, food: 0 }, baseTime: 4 },
    wall: { name: 'Wall', baseCost: { wood: 50, clay: 100, iron: 20, food: 0 }, baseTime: 3, defenseBonus: 5 }
};

const TROOP_TYPES = {
    spearman: { name: 'Spearman', cost: { wood: 50, clay: 30, iron: 10, food: 0 }, upkeep: 1, attack: 10, defense: 15, trainTime: 2 },
    swordsman: { name: 'Swordsman', cost: { wood: 30, clay: 30, iron: 70, food: 0 }, upkeep: 1, attack: 25, defense: 30, trainTime: 3 },
    archer: { name: 'Archer', cost: { wood: 60, clay: 30, iron: 40, food: 0 }, upkeep: 1, attack: 15, defense: 10, trainTime: 3 },
    light_cavalry: { name: 'Light Cavalry', cost: { wood: 125, clay: 100, iron: 250, food: 0 }, upkeep: 4, attack: 130, defense: 30, trainTime: 5 }
};

function calculateBuildingCost(type, currentLevel) {
    const b = BUILDING_TYPES[type];
    const mult = Math.pow(currentLevel + 1, 1.5);
    return {
        wood: Math.floor(b.baseCost.wood * mult),
        clay: Math.floor(b.baseCost.clay * mult),
        iron: Math.floor(b.baseCost.iron * mult),
        food: Math.floor(b.baseCost.food * mult)
    };
}

function calculateBuildTime(type, level) {
    const b = BUILDING_TYPES[type];
    return Math.floor(b.baseTime * Math.pow(level, 1.1));
}

function calculateProduction(type, level) {
    const b = BUILDING_TYPES[type];
    if (!b.production) return 0;
    return Math.floor(b.baseProduction * level * Math.pow(1.2, level - 1));
}

function calculateWarehouseCapacity(level) {
    return Math.floor(1000 * Math.pow(level, 1.2));
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

async function findFreePosition() {
    const maxAttempts = 100;
    const mapSize = 20;
    for (let i = 0; i < maxAttempts; i++) {
        const x = Math.floor(Math.random() * mapSize);
        const y = Math.floor(Math.random() * mapSize);
        const existing = await Village.findOne({ x, y }).lean();
        if (!existing) return { x, y };
    }
    throw new Error('Не удалось найти свободную позицию');
}

/** Create initial village for new user */
async function createVillage(userId, name) {
    const { x, y } = await findFreePosition();
    const village = await Village.create({ user_id: userId, name, x, y });

    const buildings = Object.keys(BUILDING_TYPES).map((t) => ({
        village_id: village._id,
        building_type: t,
        level: t === 'tribal_hall' ? 1 : 0
    }));
    await Building.insertMany(buildings);

    const troops = Object.keys(TROOP_TYPES).map(t => ({ village_id: village._id, troop_type: t, amount: 0 }));
    await Troop.insertMany(troops);

    return village._id;
}

async function getVillage(userId, villageId = null) {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    if (villageId) {
        const vid = new mongoose.Types.ObjectId(villageId);
        return Village.findOne({ _id: vid, user_id: userObjectId }).lean();
    }
    return Village.findOne({ user_id: userObjectId }).lean();
}

async function updateVillageResources(village) {
    const now = new Date();
    const last = new Date(village.last_update);
    const diff = Math.floor((now - last) / 60000); // разница в минутах
    
    // Если прошло меньше минуты, возвращаем текущие ресурсы
    if (diff < 1) {
        return {
            ...village,
            production: { wood: 0, clay: 0, iron: 0, food: 0 },
            capacity: 1000,
            last_update: village.last_update
        };
    }

    try {
        const buildings = await Building.find({ village_id: village._id }).lean();
        let production = { wood: 0, clay: 0, iron: 0, food: 0 };
        let warehouse = 0;
        
        // Рассчитываем производство от зданий
        for (const b of buildings) {
            const info = BUILDING_TYPES[b.building_type];
            if (info.production && b.level > 0) {
                const buildingProduction = calculateProduction(b.building_type, b.level);
                production[info.production] += buildingProduction;
            }
            if (b.building_type === 'warehouse') {
                warehouse = b.level;
            }
        }
        
        // Рассчитываем потребление войск
        const troops = await Troop.find({ village_id: village._id }).lean();
        let upkeep = 0;
        for (const t of troops) {
            upkeep += TROOP_TYPES[t.troop_type].upkeep * t.amount;
        }
        production.food -= upkeep;

        // Ограничиваем максимальное время обновления (12 часов)
        const maxMinutes = Math.min(diff, 720);
        const capacity = calculateWarehouseCapacity(warehouse);
        
        // Рассчитываем новые ресурсы
        const newResources = {
            wood: Math.min(village.wood + (production.wood * maxMinutes / 60), capacity),
            clay: Math.min(village.clay + (production.clay * maxMinutes / 60), capacity),
            iron: Math.min(village.iron + (production.iron * maxMinutes / 60), capacity),
            food: Math.max(0, Math.min(village.food + (production.food * maxMinutes / 60), capacity))
        };

        // Сохраняем обновленные ресурсы в базу данных
        const updateResult = await Village.updateOne(
            { _id: village._id }, 
            { 
                ...newResources, 
                last_update: now 
            }
        );

        if (updateResult.modifiedCount === 0) {
            console.error(`Не удалось обновить ресурсы для деревни ${village._id}`);
        }

        return { 
            ...village, 
            ...newResources, 
            production, 
            capacity, 
            last_update: now.toISOString() 
        };
    } catch (error) {
        console.error(`Ошибка обновления ресурсов для деревни ${village._id}:`, error);
        // Возвращаем исходные данные в случае ошибки
        return {
            ...village,
            production: { wood: 0, clay: 0, iron: 0, food: 0 },
            capacity: 1000,
            last_update: village.last_update
        };
    }
}

async function getBuildings(villageId) {
    if (!isValidObjectId(villageId)) throw new Error('Некорректный villageId');
    const id = new mongoose.Types.ObjectId(villageId);
    const buildings = await Building.find({ village_id: id }).lean();
    return buildings.map(b => ({
        ...b,
        id: b._id.toString(),
        name: BUILDING_TYPES[b.building_type].name,
        nextLevelCost: calculateBuildingCost(b.building_type, b.level),
        buildTime: calculateBuildTime(b.building_type, b.level + 1),
        production: BUILDING_TYPES[b.building_type].production ? calculateProduction(b.building_type, b.level) : null
    }));
}

function isValidObjectId(id) {
    return mongoose.Types.ObjectId.isValid(id);
}

async function upgradeBuilding(userId, villageId, buildingType) {
    return withTransaction(async (session) => {
        if (!isValidObjectId(villageId)) throw new Error('Некорректный villageId');
        const vid = new mongoose.Types.ObjectId(villageId);
        
        // Все операции с { session }
        const village = await Village.findOne({ _id: vid, user_id: userId }).session(session);
        if (!village) throw new Error('Деревня не найдена');
        
        const updated = await updateVillageResources(village);
        const building = await Building.findOne({ 
            village_id: vid, 
            building_type: buildingType 
        }).session(session);
        
        if (!building) throw new Error('Здание не найдено');
        if (building.is_upgrading) throw new Error('Здание уже улучшается');
        if (building.level >= 20) throw new Error('Достигнут максимальный уровень здания');
        
        if (buildingType !== 'tribal_hall') {
            const tribalHall = await Building.findOne({ 
                village_id: vid, 
                building_type: 'tribal_hall' 
            }).session(session);
            
            if (building.level >= tribalHall.level) {
                throw new Error('Сначала улучшите Tribal Hall');
            }
        }
        
        const cost = calculateBuildingCost(buildingType, building.level);
        if (updated.wood < cost.wood || updated.clay < cost.clay || 
            updated.iron < cost.iron || updated.food < cost.food) {
            throw new Error('Недостаточно ресурсов');
        }
        
        // Обновляем ресурсы
        await Village.updateOne(
            { _id: vid },
            {
                $inc: { 
                    wood: -cost.wood, 
                    clay: -cost.clay, 
                    iron: -cost.iron, 
                    food: -cost.food 
                }
            },
            { session }
        );
        
        const buildTime = calculateBuildTime(buildingType, building.level + 1);
        const finishTime = new Date(Date.now() + buildTime * 60000);
        
        // Начинаем улучшение
        await Building.updateOne(
            { _id: building._id }, 
            { 
                is_upgrading: true, 
                upgrade_finish_time: finishTime 
            },
            { session }
        );
        
        return { 
            success: true, 
            finishTime: finishTime.toISOString(), 
            buildTime 
        };
    });
}

async function getTroops(villageId) {
    const id = new mongoose.Types.ObjectId(villageId);
    const troops = await Troop.find({ village_id: id }).lean();
    return troops.map(t => ({
        ...t,
        id: t._id.toString(),
        name: TROOP_TYPES[t.troop_type].name,
        stats: {
            attack: TROOP_TYPES[t.troop_type].attack,
            defense: TROOP_TYPES[t.troop_type].defense,
            upkeep: TROOP_TYPES[t.troop_type].upkeep
        }
    }));
}

async function trainTroops(userId, villageId, troopType, amount) {
    if (!TROOP_TYPES[troopType]) throw new Error('Неверный тип войск');
    if (amount < 1) throw new Error('Количество должно быть больше 0');
    if (!isValidObjectId(villageId)) throw new Error('Некорректный villageId');
    const vid = new mongoose.Types.ObjectId(villageId);
    const village = await getVillage(userId, vid);
    if (!village) throw new Error('Деревня не найдена');
    const barracks = await Building.findOne({ village_id: vid, building_type: 'barracks' });
    if (!barracks || barracks.level < 1) throw new Error('Постройте казармы');
    const updated = await updateVillageResources(village);
    // Проверка лимита фермы
    const farm = await Building.findOne({ village_id: vid, building_type: 'farm' });
    const maxPopulation = farm ? farm.level * 50 : 0;
    const troops = await Troop.find({ village_id: vid }).lean();
    let currentPop = 0;
    for (const t of troops) {
        currentPop += (TROOP_TYPES[t.troop_type]?.upkeep || 0) * t.amount;
    }
    const newPop = (TROOP_TYPES[troopType].upkeep || 0) * amount;
    if (currentPop + newPop > maxPopulation) throw new Error('Недостаточно населения (ферма)');
    const info = TROOP_TYPES[troopType];
    const totalCost = {
        wood: info.cost.wood * amount,
        clay: info.cost.clay * amount,
        iron: info.cost.iron * amount,
        food: info.cost.food * amount
    };
    if (updated.wood < totalCost.wood || updated.clay < totalCost.clay || updated.iron < totalCost.iron || updated.food < totalCost.food) {
        throw new Error('Недостаточно ресурсов');
    }
    await Village.updateOne({ _id: vid }, {
        $inc: { wood: -totalCost.wood, clay: -totalCost.clay, iron: -totalCost.iron, food: -totalCost.food }
    });
    const trainTime = info.trainTime * amount;
    const finishTime = new Date(Date.now() + trainTime * 60000);
    await TrainingQueue.create({ village_id: vid, troop_type: troopType, amount, finish_time: finishTime });
    return { success: true, finishTime: finishTime.toISOString(), trainTime };
}

async function getWorldMap() {
    const villages = await Village.find().populate('user_id', 'username').lean();
    return villages.map(v => ({
        id: v._id.toString(),
        name: v.name,
        owner: v.user_id ? v.user_id.username : 'barbarian',
        x: v.x,
        y: v.y,
        points: v.points
    }));
}

async function attackVillage(userId, fromVillageId, toVillageId, troopsSent) {
    if (!isValidObjectId(fromVillageId) || !isValidObjectId(toVillageId)) throw new Error('Некорректный villageId');
    if (fromVillageId === toVillageId) throw new Error('Нельзя атаковать свою деревню');
    const fromId = new mongoose.Types.ObjectId(fromVillageId);
    const toId = new mongoose.Types.ObjectId(toVillageId);
    const fromVillage = await getVillage(userId, fromId);
    const toVillage = await Village.findById(toId).lean();
    if (!fromVillage || !toVillage) throw new Error('Деревня не найдена');

    // Проверяем, варварская ли это деревня
    const isBarbarian = !toVillage.user_id;
    if (isBarbarian) {
        // Получаем войска варваров
        const barbTroops = await Troop.find({ village_id: toVillage._id }).lean();
        let barbDef = 0;
        for (const t of barbTroops) {
            barbDef += (TROOP_TYPES[t.troop_type]?.defense || 0) * t.amount;
        }
        // Считаем атаку игрока
        let playerAttack = 0;
        for (const [type, amount] of Object.entries(troopsSent || {})) {
            playerAttack += (TROOP_TYPES[type]?.attack || 0) * amount;
        }
        // Победа, если атака больше защиты
        let loot = { wood: 0, clay: 0, iron: 0, food: 0 };
        let win = false;
        if (playerAttack > barbDef) {
            win = true;
            // Грабим до 50% ресурсов варваров (или всё, если мало)
            loot.wood = Math.floor(toVillage.wood / 2);
            loot.clay = Math.floor(toVillage.clay / 2);
            loot.iron = Math.floor(toVillage.iron / 2);
            loot.food = Math.floor(toVillage.food / 2);
            // Списываем ресурсы у варваров
            await Village.updateOne({ _id: toVillage._id }, {
                $inc: {
                    wood: -loot.wood,
                    clay: -loot.clay,
                    iron: -loot.iron,
                    food: -loot.food
                }
            });
            // Добавляем ресурсы игроку
            await Village.updateOne({ _id: fromVillage._id }, {
                $inc: {
                    wood: loot.wood,
                    clay: loot.clay,
                    iron: loot.iron,
                    food: loot.food
                }
            });
        }
        return {
            success: win,
            loot,
            message: win ? 'Вы успешно ограбили варварскую деревню!' : 'Атака не удалась, защита варваров слишком сильна.'
        };
    }
    // ... старая логика для обычных деревень ...
    return { success: true };
}

async function updateAllVillagesResources() {
    const startTime = Date.now();
    const BATCH_SIZE = 50; // Обрабатываем по 50 деревень за раз
    
    try {
        logger.info('Starting batch resource update...');
        
        // Считаем общее количество деревень
        const totalCount = await Village.countDocuments();
        logger.info(`Total villages to update: ${totalCount}`);
        
        let updatedCount = 0;
        let errorCount = 0;
        let skip = 0;
        
        // Обрабатываем батчами
        while (skip < totalCount) {
            const villages = await Village.find()
                .skip(skip)
                .limit(BATCH_SIZE)
                .lean();
            
            if (villages.length === 0) break;
            
            // Параллельная обработка батча с ограничением
            const updatePromises = villages.map(village => 
                updateVillageResources(village)
                    .then(() => {
                        updatedCount++;
                    })
                    .catch(error => {
                        logger.error(`Failed to update village ${village._id}:`, error);
                        errorCount++;
                    })
            );
            
            // Ждем завершения текущего батча
            await Promise.all(updatePromises);
            
            skip += BATCH_SIZE;
            
            // Логируем прогресс каждые 200 деревень
            if (updatedCount % 200 === 0 && updatedCount > 0) {
                logger.info(`Resource update progress: ${updatedCount}/${totalCount}`);
            }
            
            // Даем GC время на очистку памяти между батчами
            if (global.gc) {
                global.gc();
            }
        }
        
        const duration = Date.now() - startTime;
        
        logger.info('Resource update completed', {
            totalCount,
            updatedCount,
            errorCount,
            duration,
            avgTimePerVillage: totalCount > 0 ? (duration / totalCount).toFixed(2) : 0
        });
        
        gameLogger.resourcesUpdated(updatedCount, duration);
        
        return { updatedCount, errorCount, duration };
        
    } catch (error) {
        logger.error('Critical error in batch resource update:', error);
        throw error;
    }
}

async function processConstructionQueue() {
    const BATCH_SIZE = 100;
    const now = new Date();
    
    try {
        let processed = 0;
        let skip = 0;
        
        while (true) {
            const buildings = await Building.find({ 
                is_upgrading: true, 
                upgrade_finish_time: { $lte: now } 
            })
            .skip(skip)
            .limit(BATCH_SIZE)
            .lean();
            
            if (buildings.length === 0) break;
            
            // Обрабатываем батч
            for (const building of buildings) {
                try {
                    await Building.updateOne(
                        { _id: building._id }, 
                        { 
                            $inc: { level: 1 }, 
                            is_upgrading: false, 
                            upgrade_finish_time: null 
                        }
                    );
                    
                    await Village.updateOne(
                        { _id: building.village_id }, 
                        { $inc: { points: building.level * 10 } }
                    );
                    
                    processed++;
                } catch (error) {
                    logger.error(`Failed to process building ${building._id}:`, error);
                }
            }
            
            skip += BATCH_SIZE;
        }
        
        if (processed > 0) {
            logger.info(`Processed ${processed} building upgrades`);
        }
        
    } catch (error) {
        logger.error('Error in construction queue processing:', error);
    }
}

async function processTrainingQueue() {
    const BATCH_SIZE = 100;
    const now = new Date();
    
    try {
        let processed = 0;
        let skip = 0;
        
        while (true) {
            const trainings = await TrainingQueue.find({ 
                finish_time: { $lte: now } 
            })
            .skip(skip)
            .limit(BATCH_SIZE)
            .lean();
            
            if (trainings.length === 0) break;
            
            // Группируем по деревням для оптимизации
            const troopUpdates = {};
            const trainingIds = [];
            
            for (const training of trainings) {
                const key = `${training.village_id}_${training.troop_type}`;
                troopUpdates[key] = (troopUpdates[key] || 0) + training.amount;
                trainingIds.push(training._id);
            }
            
            // Применяем обновления
            for (const [key, amount] of Object.entries(troopUpdates)) {
                const [villageId, troopType] = key.split('_');
                
                try {
                    await Troop.updateOne(
                        { village_id: villageId, troop_type: troopType }, 
                        { $inc: { amount: amount } }
                    );
                    processed++;
                } catch (error) {
                    logger.error(`Failed to update troops for ${key}:`, error);
                }
            }
            
            // Удаляем обработанные записи
            if (trainingIds.length > 0) {
                await TrainingQueue.deleteMany({ _id: { $in: trainingIds } });
            }
            
            skip += BATCH_SIZE;
        }
        
        if (processed > 0) {
            logger.info(`Processed ${processed} troop trainings`);
        }
        
    } catch (error) {
        logger.error('Error in training queue processing:', error);
    }
}

async function processAttacks() {
    // not implemented in this simplified version
}

async function createTribe() { return { success: true }; }
async function getTribes() { return []; }
async function joinTribe() { return { success: true }; }
async function speedUpAction() { return { success: true }; }

/**
 * Генерирует N варварских деревень на случайных свободных позициях
 * @param {number} count - сколько деревень создать
 */
async function generateBarbarianVillages(count = 10) {
    const created = [];
    for (let i = 0; i < count; i++) {
        try {
            const { x, y } = await findFreePosition();
            const resources = {
                wood: Math.floor(Math.random() * 101) + 50, // 50-150
                clay: Math.floor(Math.random() * 101) + 50,
                iron: Math.floor(Math.random() * 101) + 50,
                food: Math.floor(Math.random() * 101) + 50
            };
            const village = await Village.create({
                user_id: null,
                name: 'Варвары',
                x, y,
                ...resources,
                last_update: new Date(),
                points: 0
            });
            // Минимальные войска (например, 1-3 копейщика)
            await Troop.create({
                village_id: village._id,
                troop_type: 'spearman',
                amount: Math.floor(Math.random() * 3) + 1 // 1-3
            });
            created.push(village);
        } catch (error) {
            console.error('Ошибка генерации варварской деревни:', error);
        }
    }
    return created;
}

module.exports = {
    createVillage,
    getVillage,
    updateVillageResources,
    getBuildings,
    upgradeBuilding,
    getTroops,
    trainTroops,
    getWorldMap,
    attackVillage,
    createTribe,
    getTribes,
    joinTribe,
    speedUpAction,
    updateAllVillagesResources,
    processConstructionQueue,
    processTrainingQueue,
    processAttacks,
    generateBarbarianVillages
};
