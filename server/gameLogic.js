const Village = require('../models/Village');
const Building = require('../models/Building');
const Troop = require('../models/Troop');
const TrainingQueue = require('../models/TrainingQueue');
const User = require('../models/User');
const LRU = require('lru-cache');
const mapCache = new LRU({ max: 1, ttl: 60000 });

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
    mapCache.delete('world');

    return village._id;
}

async function getVillage(userId, villageId = null) {
    if (villageId) {
        return Village.findOne({ _id: villageId, user_id: userId }).lean();
    }
    return Village.findOne({ user_id: userId }).lean();
}

async function updateVillageResources(village) {
    const now = new Date();
    const last = new Date(village.last_update);
    const diff = Math.floor((now - last) / 60000);
    if (diff < 1) return village;

    const buildings = await Building.find({ village_id: village._id }).lean();
    let production = { wood: 0, clay: 0, iron: 0, food: 0 };
    let warehouse = 0;
    for (const b of buildings) {
        const info = BUILDING_TYPES[b.building_type];
        if (info.production && b.level > 0) {
            production[info.production] += calculateProduction(b.building_type, b.level);
        }
        if (b.building_type === 'warehouse') warehouse = b.level;
    }
    const troops = await Troop.find({ village_id: village._id }).lean();
    let upkeep = 0;
    for (const t of troops) {
        upkeep += TROOP_TYPES[t.troop_type].upkeep * t.amount;
    }
    production.food -= upkeep;

    const maxMinutes = Math.min(diff, 720);
    const capacity = calculateWarehouseCapacity(warehouse);
    const newResources = {
        wood: Math.min(village.wood + (production.wood * maxMinutes / 60), capacity),
        clay: Math.min(village.clay + (production.clay * maxMinutes / 60), capacity),
        iron: Math.min(village.iron + (production.iron * maxMinutes / 60), capacity),
        food: Math.max(0, Math.min(village.food + (production.food * maxMinutes / 60), capacity))
    };

    await Village.updateOne({ _id: village._id }, { ...newResources, last_update: now });
    return { ...village, ...newResources, production, capacity, last_update: now.toISOString() };
}

async function getBuildings(villageId) {
    const buildings = await Building.find({ village_id: villageId }).lean();
    return buildings.map(b => ({
        ...b,
        name: BUILDING_TYPES[b.building_type].name,
        nextLevelCost: calculateBuildingCost(b.building_type, b.level),
        buildTime: calculateBuildTime(b.building_type, b.level + 1),
        production: BUILDING_TYPES[b.building_type].production ? calculateProduction(b.building_type, b.level) : null
    }));
}

async function upgradeBuilding(userId, villageId, buildingType) {
    const village = await getVillage(userId, villageId);
    if (!village) throw new Error('Деревня не найдена');
    const updated = await updateVillageResources(village);
    const building = await Building.findOne({ village_id: villageId, building_type: buildingType });
    if (!building) throw new Error('Здание не найдено');
    if (building.is_upgrading) throw new Error('Здание уже улучшается');

    if (buildingType !== 'tribal_hall') {
        const tribalHall = await Building.findOne({ village_id: villageId, building_type: 'tribal_hall' });
        if (building.level >= tribalHall.level) {
            throw new Error('Сначала улучшите Tribal Hall');
        }
    }

    const cost = calculateBuildingCost(buildingType, building.level);
    if (updated.wood < cost.wood || updated.clay < cost.clay || updated.iron < cost.iron || updated.food < cost.food) {
        throw new Error('Недостаточно ресурсов');
    }

    await Village.updateOne({ _id: villageId }, {
        $inc: { wood: -cost.wood, clay: -cost.clay, iron: -cost.iron, food: -cost.food }
    });

    const buildTime = calculateBuildTime(buildingType, building.level + 1);
    const finishTime = new Date(Date.now() + buildTime * 60000);
    await Building.updateOne({ _id: building._id }, { is_upgrading: true, upgrade_finish_time: finishTime });
    return { success: true, finishTime: finishTime.toISOString(), buildTime };
}

async function getTroops(villageId) {
    const troops = await Troop.find({ village_id: villageId }).lean();
    return troops.map(t => ({
        ...t,
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
    const village = await getVillage(userId, villageId);
    if (!village) throw new Error('Деревня не найдена');

    const barracks = await Building.findOne({ village_id: villageId, building_type: 'barracks' });
    if (!barracks || barracks.level < 1) throw new Error('Постройте казармы');

    const updated = await updateVillageResources(village);
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

    await Village.updateOne({ _id: villageId }, {
        $inc: { wood: -totalCost.wood, clay: -totalCost.clay, iron: -totalCost.iron, food: -totalCost.food }
    });

    const trainTime = info.trainTime * amount;
    const finishTime = new Date(Date.now() + trainTime * 60000);
    await TrainingQueue.create({ village_id: villageId, troop_type: troopType, amount, finish_time: finishTime });
    return { success: true, finishTime: finishTime.toISOString(), trainTime };
}

async function getWorldMap() {
    const cached = mapCache.get('world');
    if (cached) return cached;
    const villages = await Village.find().populate('user_id', 'username').lean();
    const map = villages.map(v => ({ id: v._id.toString(), name: v.name, owner: v.user_id.username, x: v.x, y: v.y, points: v.points }));
    mapCache.set('world', map);
    return map;
}

async function attackVillage(userId, fromVillageId, toVillageId) {
    const fromVillage = await getVillage(userId, fromVillageId);
    const toVillage = await Village.findById(toVillageId).lean();
    if (!fromVillage || !toVillage) throw new Error('Деревня не найдена');
    // simplified attack logic
    return { success: true };
}

async function updateAllVillagesResources() {
    const villages = await Village.find().lean();
    for (const v of villages) {
        await updateVillageResources(v);
    }
}

async function processConstructionQueue() {
    const now = new Date();
    const list = await Building.find({ is_upgrading: true, upgrade_finish_time: { $lte: now } });
    for (const b of list) {
        await Building.updateOne({ _id: b._id }, { $inc: { level: 1 }, is_upgrading: false, upgrade_finish_time: null });
        await Village.updateOne({ _id: b.village_id }, { $inc: { points: b.level * 10 } });
        mapCache.delete('world');
    }
}

async function processTrainingQueue() {
    const now = new Date();
    const list = await TrainingQueue.find({ finish_time: { $lte: now } });
    for (const t of list) {
        await Troop.updateOne({ village_id: t.village_id, troop_type: t.troop_type }, { $inc: { amount: t.amount } });
        await TrainingQueue.deleteOne({ _id: t._id });
    }
}

async function processAttacks() {
    // not implemented in this simplified version
}

async function createTribe() { return { success: true }; }
async function getTribes() { return []; }
async function joinTribe() { return { success: true }; }
async function speedUpAction() { return { success: true }; }

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
    processAttacks
};
