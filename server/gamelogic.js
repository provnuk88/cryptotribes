const { db, runAsync, getAsync, allAsync } = require('./database');

// Константы игры
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
    spearman: { 
        name: 'Spearman', 
        cost: { wood: 50, clay: 30, iron: 10, food: 0 }, 
        upkeep: 1, 
        attack: 10, 
        defense: 15, 
        trainTime: 2 
    },
    swordsman: { 
        name: 'Swordsman', 
        cost: { wood: 30, clay: 30, iron: 70, food: 0 }, 
        upkeep: 1, 
        attack: 25, 
        defense: 30, 
        trainTime: 3 
    },
    archer: { 
        name: 'Archer', 
        cost: { wood: 60, clay: 30, iron: 40, food: 0 }, 
        upkeep: 1, 
        attack: 15, 
        defense: 10, 
        trainTime: 3 
    },
    light_cavalry: { 
        name: 'Light Cavalry', 
        cost: { wood: 125, clay: 100, iron: 250, food: 0 }, 
        upkeep: 4, 
        attack: 130, 
        defense: 30, 
        trainTime: 5 
    }
};

// Вспомогательные функции

// Рассчитать стоимость улучшения здания
function calculateBuildingCost(buildingType, currentLevel) {
    const building = BUILDING_TYPES[buildingType];
    const multiplier = Math.pow(currentLevel + 1, 1.5);
    
    return {
        wood: Math.floor(building.baseCost.wood * multiplier),
        clay: Math.floor(building.baseCost.clay * multiplier),
        iron: Math.floor(building.baseCost.iron * multiplier),
        food: Math.floor(building.baseCost.food * multiplier)
    };
}

// Рассчитать время строительства (в минутах)
function calculateBuildTime(buildingType, level) {
    const building = BUILDING_TYPES[buildingType];
    return Math.floor(building.baseTime * Math.pow(level, 1.1));
}

// Рассчитать производство ресурсов
function calculateProduction(buildingType, level) {
    const building = BUILDING_TYPES[buildingType];
    if (!building.production) return 0;
    return Math.floor(building.baseProduction * level * Math.pow(1.2, level - 1));
}

// Рассчитать вместимость склада
function calculateWarehouseCapacity(level) {
    return Math.floor(1000 * Math.pow(level, 1.2));
}

// Рассчитать расстояние между деревнями
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Найти свободную позицию на карте
async function findFreePosition() {
    const maxAttempts = 100;
    const mapSize = 20;
    
    for (let i = 0; i < maxAttempts; i++) {
        const x = Math.floor(Math.random() * mapSize);
        const y = Math.floor(Math.random() * mapSize);
        
        const existing = await getAsync('SELECT id FROM villages WHERE x = ? AND y = ?', [x, y]);
        if (!existing) {
            return { x, y };
        }
    }
    
    throw new Error('Не удалось найти свободную позицию на карте');
}

// Основные функции игровой логики

// Создать деревню для нового игрока
async function createVillage(userId, villageName) {
    const { x, y } = await findFreePosition();
    
    // Создаем деревню с начальными ресурсами
    const result = await runAsync(
        'INSERT INTO villages (user_id, name, x, y, wood, clay, iron, food) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, villageName, x, y, 1000, 1000, 1000, 1000]
    );
    
    const villageId = result.id;
    
    // Создаем начальные здания
    for (const buildingType of Object.keys(BUILDING_TYPES)) {
        const level = buildingType === 'tribal_hall' ? 1 : 0;
        await runAsync(
            'INSERT INTO buildings (village_id, building_type, level) VALUES (?, ?, ?)',
            [villageId, buildingType, level]
        );
    }
    
    // Создаем начальные войска (пусто)
    for (const troopType of Object.keys(TROOP_TYPES)) {
        await runAsync(
            'INSERT INTO troops (village_id, troop_type, amount) VALUES (?, ?, 0)',
            [villageId, troopType]
        );
    }
    
    return villageId;
}

// Получить данные деревни
async function getVillage(userId, villageId = null) {
    let village;
    
    if (villageId) {
        village = await getAsync(
            'SELECT * FROM villages WHERE id = ? AND user_id = ?',
            [villageId, userId]
        );
    } else {
        village = await getAsync(
            'SELECT * FROM villages WHERE user_id = ? ORDER BY id LIMIT 1',
            [userId]
        );
    }
    
    return village;
}

// Обновить ресурсы деревни
async function updateVillageResources(village) {
    const now = new Date();
    const lastUpdate = new Date(village.last_update);
    const timeDiff = Math.floor((now - lastUpdate) / 1000 / 60); // в минутах
    
    if (timeDiff < 1) return village;
    
    // Получаем здания деревни
    const buildings = await allAsync(
        'SELECT * FROM buildings WHERE village_id = ?',
        [village.id]
    );
    
    // Рассчитываем производство
    let production = { wood: 0, clay: 0, iron: 0, food: 0 };
    let warehouseLevel = 0;
    
    for (const building of buildings) {
        const buildingType = BUILDING_TYPES[building.building_type];
        
        if (buildingType.production && building.level > 0) {
            const rate = calculateProduction(building.building_type, building.level);
            production[buildingType.production] += rate;
        }
        
        if (building.building_type === 'warehouse') {
            warehouseLevel = building.level;
        }
    }
    
    // Учитываем содержание войск
    const troops = await allAsync(
        'SELECT * FROM troops WHERE village_id = ?',
        [village.id]
    );
    
    let totalUpkeep = 0;
    for (const troop of troops) {
        const troopType = TROOP_TYPES[troop.troop_type];
        totalUpkeep += troopType.upkeep * troop.amount;
    }
    
    production.food -= totalUpkeep;
    
    // Рассчитываем новые ресурсы (не больше 12 часов накопления)
    const maxMinutes = Math.min(timeDiff, 720);
    const capacity = calculateWarehouseCapacity(warehouseLevel);
    
    const newResources = {
        wood: Math.min(village.wood + (production.wood * maxMinutes / 60), capacity),
        clay: Math.min(village.clay + (production.clay * maxMinutes / 60), capacity),
        iron: Math.min(village.iron + (production.iron * maxMinutes / 60), capacity),
        food: Math.max(0, Math.min(village.food + (production.food * maxMinutes / 60), capacity))
    };
    
    // Обновляем в БД
    await runAsync(
        `UPDATE villages 
         SET wood = ?, clay = ?, iron = ?, food = ?, last_update = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [newResources.wood, newResources.clay, newResources.iron, newResources.food, village.id]
    );
    
    return {
        ...village,
        ...newResources,
        production,
        capacity,
        last_update: now.toISOString()
    };
}

// Получить здания деревни
async function getBuildings(villageId) {
    const buildings = await allAsync(
        'SELECT * FROM buildings WHERE village_id = ?',
        [villageId]
    );
    
    // Добавляем дополнительную информацию
    return buildings.map(building => {
        const buildingInfo = BUILDING_TYPES[building.building_type];
        return {
            ...building,
            name: buildingInfo.name,
            nextLevelCost: calculateBuildingCost(building.building_type, building.level),
            buildTime: calculateBuildTime(building.building_type, building.level + 1),
            production: buildingInfo.production ? calculateProduction(building.building_type, building.level) : null
        };
    });
}

// Улучшить здание
async function upgradeBuilding(userId, villageId, buildingType) {
    // Проверяем владельца деревни
    const village = await getVillage(userId, villageId);
    if (!village) {
        throw new Error('Деревня не найдена');
    }
    
    // Обновляем ресурсы
    const updatedVillage = await updateVillageResources(village);
    
    // Получаем текущее здание
    const building = await getAsync(
        'SELECT * FROM buildings WHERE village_id = ? AND building_type = ?',
        [villageId, buildingType]
    );
    
    if (!building) {
        throw new Error('Здание не найдено');
    }
    
    if (building.is_upgrading) {
        throw new Error('Здание уже улучшается');
    }
    
    // Проверяем Tribal Hall
    if (buildingType !== 'tribal_hall') {
        const tribalHall = await getAsync(
            'SELECT level FROM buildings WHERE village_id = ? AND building_type = ?',
            [villageId, 'tribal_hall']
        );
        
        if (building.level >= tribalHall.level) {
            throw new Error('Сначала улучшите Tribal Hall');
        }
    }
    
    // Проверяем стоимость
    const cost = calculateBuildingCost(buildingType, building.level);
    
    if (updatedVillage.wood < cost.wood || 
        updatedVillage.clay < cost.clay || 
        updatedVillage.iron < cost.iron || 
        updatedVillage.food < cost.food) {
        throw new Error('Недостаточно ресурсов');
    }
    
    // Списываем ресурсы
    await runAsync(
        'UPDATE villages SET wood = wood - ?, clay = clay - ?, iron = iron - ?, food = food - ? WHERE id = ?',
        [cost.wood, cost.clay, cost.iron, cost.food, villageId]
    );
    
    // Начинаем строительство
    const buildTime = calculateBuildTime(buildingType, building.level + 1);
    const finishTime = new Date(Date.now() + buildTime * 60 * 1000);
    
    await runAsync(
        'UPDATE buildings SET is_upgrading = 1, upgrade_finish_time = ? WHERE id = ?',
        [finishTime.toISOString(), building.id]
    );
    
    return {
        success: true,
        finishTime: finishTime.toISOString(),
        buildTime: buildTime
    };
}

// Получить войска деревни
async function getTroops(villageId) {
    const troops = await allAsync(
        'SELECT * FROM troops WHERE village_id = ?',
        [villageId]
    );
    
    // Добавляем информацию о типах войск
    return troops.map(troop => {
        const troopInfo = TROOP_TYPES[troop.troop_type];
        return {
            ...troop,
            name: troopInfo.name,
            stats: {
                attack: troopInfo.attack,
                defense: troopInfo.defense,
                upkeep: troopInfo.upkeep
            }
        };
    });
}

// Обучить войска
async function trainTroops(userId, villageId, troopType, amount) {
    if (!TROOP_TYPES[troopType]) {
        throw new Error('Неверный тип войск');
    }
    
    if (amount < 1) {
        throw new Error('Количество должно быть больше 0');
    }
    
    // Проверяем владельца деревни
    const village = await getVillage(userId, villageId);
    if (!village) {
        throw new Error('Деревня не найдена');
    }
    
    // Проверяем barracks
    const barracks = await getAsync(
        'SELECT level FROM buildings WHERE village_id = ? AND building_type = ?',
        [villageId, 'barracks']
    );
    
    if (!barracks || barracks.level < 1) {
        throw new Error('Постройте казармы');
    }
    
    // Обновляем ресурсы
    const updatedVillage = await updateVillageResources(village);
    
    // Рассчитываем стоимость
    const troopInfo = TROOP_TYPES[troopType];
    const totalCost = {
        wood: troopInfo.cost.wood * amount,
        clay: troopInfo.cost.clay * amount,
        iron: troopInfo.cost.iron * amount,
        food: troopInfo.cost.food * amount
    };
    
    // Проверяем ресурсы
    if (updatedVillage.wood < totalCost.wood || 
        updatedVillage.clay < totalCost.clay || 
        updatedVillage.iron < totalCost.iron || 
        updatedVillage.food < totalCost.food) {
        throw new Error('Недостаточно ресурсов');
    }
    
    // Списываем ресурсы
    await runAsync(
        'UPDATE villages SET wood = wood - ?, clay = clay - ?, iron = iron - ?, food = food - ? WHERE id = ?',
        [totalCost.wood, totalCost.clay, totalCost.iron, totalCost.food, villageId]
    );
    
    // Добавляем в очередь обучения
    const trainTime = troopInfo.trainTime * amount;
    const finishTime = new Date(Date.now() + trainTime * 60 * 1000);
    
    await runAsync(
        'INSERT INTO training_queue (village_id, troop_type, amount, finish_time) VALUES (?, ?, ?, ?)',
        [villageId, troopType, amount, finishTime.toISOString()]
    );
    
    return {
        success: true,
        finishTime: finishTime.toISOString(),
        trainTime: trainTime
    };
}

// Получить карту мира
async function getWorldMap() {
    const villages = await allAsync(
        `SELECT v.*, u.username 
         FROM villages v 
         JOIN users u ON v.user_id = u.id`
    );
    
    return villages.map(village => ({
        id: village.id,
        name: village.name,
        owner: village.username,
        x: village.x,
        y: village.y,
        points: village.points
    }));
}

// Атаковать деревню
async function attackVillage(userId, fromVillageId, toVillageId, troops) {
    // Проверяем владельца атакующей деревни
    const fromVillage = await getVillage(userId, fromVillageId);
    if (!fromVillage) {
        throw new Error('Деревня не найдена');
    }
    
    // Проверяем целевую деревню
    const toVillage = await getAsync('SELECT * FROM villages WHERE id = ?', [toVillageId]);
    if (!toVillage) {
        throw new Error('Целевая деревня не найдена');
    }
    
    if (fromVillageId === toVillageId) {
        throw new Error('Нельзя атаковать свою деревню');
    }
    
    // Проверяем наличие войск
    const availableTroops = await allAsync(
        'SELECT * FROM troops WHERE village_id = ?',
        [fromVillageId]
    );
    
    let totalTroops = 0;
    for (const troopType of Object.keys(troops)) {
        if (!troops[troopType] || troops[troopType] < 1) continue;
        
        const available = availableTroops.find(t => t.troop_type === troopType);
        if (!available || available.amount < troops[troopType]) {
            throw new Error(`Недостаточно войск типа ${troopType}`);
        }
        
        totalTroops += troops[troopType];
    }
    
    if (totalTroops === 0) {
        throw new Error('Выберите войска для атаки');
    }
    
    // Списываем войска из деревни
    for (const troopType of Object.keys(troops)) {
        if (!troops[troopType] || troops[troopType] < 1) continue;
        
        await runAsync(
            'UPDATE troops SET amount = amount - ? WHERE village_id = ? AND troop_type = ?',
            [troops[troopType], fromVillageId, troopType]
        );
    }
    
    // Рассчитываем время прибытия
    const distance = calculateDistance(fromVillage.x, fromVillage.y, toVillage.x, toVillage.y);
    const travelTime = Math.max(5, Math.floor(distance * 3)); // минимум 5 минут
    const arrivalTime = new Date(Date.now() + travelTime * 60 * 1000);
    
    // Создаем атаку
    await runAsync(
        'INSERT INTO attacks (from_village_id, to_village_id, troops_data, arrival_time) VALUES (?, ?, ?, ?)',
        [fromVillageId, toVillageId, JSON.stringify(troops), arrivalTime.toISOString()]
    );
    
    return {
        success: true,
        arrivalTime: arrivalTime.toISOString(),
        travelTime: travelTime
    };
}

// Создать племя
async function createTribe(userId, name, tag) {
    if (!name || !tag) {
        throw new Error('Укажите название и тег племени');
    }
    
    if (tag.length > 5) {
        throw new Error('Тег не должен быть длиннее 5 символов');
    }
    
    // Проверяем, что пользователь не в племени
    const user = await getAsync('SELECT tribe_id FROM users WHERE id = ?', [userId]);
    if (user.tribe_id) {
        throw new Error('Вы уже состоите в племени');
    }
    
    // Проверяем ресурсы (1000 каждого)
    const village = await getVillage(userId);
    const updatedVillage = await updateVillageResources(village);
    
    if (updatedVillage.wood < 1000 || 
        updatedVillage.clay < 1000 || 
        updatedVillage.iron < 1000 || 
        updatedVillage.food < 1000) {
        throw new Error('Для создания племени нужно 1000 каждого ресурса');
    }
    
    // Создаем племя
    const result = await runAsync(
        'INSERT INTO tribes (name, tag, leader_id) VALUES (?, ?, ?)',
        [name, tag, userId]
    );
    
    // Обновляем пользователя
    await runAsync('UPDATE users SET tribe_id = ? WHERE id = ?', [result.id, userId]);
    
    // Списываем ресурсы
    await runAsync(
        'UPDATE villages SET wood = wood - 1000, clay = clay - 1000, iron = iron - 1000, food = food - 1000 WHERE id = ?',
        [village.id]
    );
    
    return {
        success: true,
        tribeId: result.id,
        name: name,
        tag: tag
    };
}

// Получить список племен
async function getTribes() {
    const tribes = await allAsync(
        `SELECT t.*, u.username as leader_name, COUNT(DISTINCT m.id) as member_count
         FROM tribes t
         JOIN users u ON t.leader_id = u.id
         LEFT JOIN users m ON m.tribe_id = t.id
         GROUP BY t.id
         ORDER BY t.points DESC`
    );
    
    return tribes;
}

// Присоединиться к племени
async function joinTribe(userId, tribeId) {
    // Проверяем, что пользователь не в племени
    const user = await getAsync('SELECT tribe_id FROM users WHERE id = ?', [userId]);
    if (user.tribe_id) {
        throw new Error('Вы уже состоите в племени');
    }
    
    // Проверяем существование племени
    const tribe = await getAsync('SELECT * FROM tribes WHERE id = ?', [tribeId]);
    if (!tribe) {
        throw new Error('Племя не найдено');
    }
    
    // Присоединяемся
    await runAsync('UPDATE users SET tribe_id = ? WHERE id = ?', [tribeId, userId]);
    
    return {
        success: true,
        tribeName: tribe.name,
        tribeTag: tribe.tag
    };
}

// Ускорить действие за кристаллы
async function speedUpAction(userId, actionId, type) {
    // Проверяем кристаллы пользователя
    const user = await getAsync('SELECT crystals FROM users WHERE id = ?', [userId]);
    
    const crystalCost = 10; // Фиксированная стоимость для простоты
    
    if (user.crystals < crystalCost) {
        throw new Error('Недостаточно кристаллов');
    }
    
    // В зависимости от типа действия
    if (type === 'building') {
        await runAsync(
            'UPDATE buildings SET level = level + 1, is_upgrading = 0, upgrade_finish_time = NULL WHERE id = ?',
            [actionId]
        );
    } else if (type === 'training') {
        const queue = await getAsync('SELECT * FROM training_queue WHERE id = ?', [actionId]);
        if (queue) {
            await runAsync(
                'UPDATE troops SET amount = amount + ? WHERE village_id = ? AND troop_type = ?',
                [queue.amount, queue.village_id, queue.troop_type]
            );
            await runAsync('DELETE FROM training_queue WHERE id = ?', [actionId]);
        }
    }
    
    // Списываем кристаллы
    await runAsync('UPDATE users SET crystals = crystals - ? WHERE id = ?', [crystalCost, userId]);
    
    return {
        success: true,
        crystalsSpent: crystalCost
    };
}

// === ИГРОВЫЕ ЦИКЛЫ ===

// Обновить ресурсы всех деревень
async function updateAllVillagesResources() {
    const villages = await allAsync('SELECT * FROM villages');
    
    for (const village of villages) {
        await updateVillageResources(village);
    }
}

// Обработать очередь строительства
async function processConstructionQueue() {
    const now = new Date().toISOString();
    
    const completedBuildings = await allAsync(
        'SELECT * FROM buildings WHERE is_upgrading = 1 AND upgrade_finish_time <= ?',
        [now]
    );
    
    for (const building of completedBuildings) {
        await runAsync(
            'UPDATE buildings SET level = level + 1, is_upgrading = 0, upgrade_finish_time = NULL WHERE id = ?',
            [building.id]
        );
        
        // Обновляем очки деревни
        await runAsync(
            'UPDATE villages SET points = points + ? WHERE id = ?',
            [building.level * 10, building.village_id]
        );
    }
}

// Обработать очередь обучения
async function processTrainingQueue() {
    const now = new Date().toISOString();
    
    const completedTraining = await allAsync(
        'SELECT * FROM training_queue WHERE finish_time <= ?',
        [now]
    );
    
    for (const training of completedTraining) {
        await runAsync(
            'UPDATE troops SET amount = amount + ? WHERE village_id = ? AND troop_type = ?',
            [training.amount, training.village_id, training.troop_type]
        );
        
        await runAsync('DELETE FROM training_queue WHERE id = ?', [training.id]);
    }
}

// Обработать атаки
async function processAttacks() {
    const now = new Date().toISOString();
    
    const arrivedAttacks = await allAsync(
        'SELECT * FROM attacks WHERE arrival_time <= ? AND is_returning = 0',
        [now]
    );
    
    for (const attack of arrivedAttacks) {
        const attackingTroops = JSON.parse(attack.troops_data);
        
        // Получаем защищающиеся войска
        const defendingTroops = await allAsync(
            'SELECT * FROM troops WHERE village_id = ?',
            [attack.to_village_id]
        );
        
        // Простой расчет боя
        let attackPower = 0;
        let defensePower = 0;
        
        // Сила атаки
        for (const [troopType, amount] of Object.entries(attackingTroops)) {
            if (amount > 0) {
                attackPower += TROOP_TYPES[troopType].attack * amount;
            }
        }
        
        // Сила защиты
        for (const troop of defendingTroops) {
            if (troop.amount > 0) {
                defensePower += TROOP_TYPES[troop.troop_type].defense * troop.amount;
            }
        }
        
        // Бонус от стены
        const wall = await getAsync(
            'SELECT level FROM buildings WHERE village_id = ? AND building_type = ?',
            [attack.to_village_id, 'wall']
        );
        
        if (wall && wall.level > 0) {
            defensePower *= (1 + wall.level * 0.05);
        }
        
        // Случайный фактор ±20%
        attackPower *= (0.8 + Math.random() * 0.4);
        defensePower *= (0.8 + Math.random() * 0.4);
        
        // Результат боя
        const attackWins = attackPower > defensePower;
        
        if (attackWins) {
            // Атакующий побеждает - грабит ресурсы
            const targetVillage = await getAsync('SELECT * FROM villages WHERE id = ?', [attack.to_village_id]);
            const lootPercentage = 0.3; // 30% ресурсов
            
            const loot = {
                wood: Math.floor(targetVillage.wood * lootPercentage),
                clay: Math.floor(targetVillage.clay * lootPercentage),
                iron: Math.floor(targetVillage.iron * lootPercentage),
                food: Math.floor(targetVillage.food * lootPercentage)
            };
            
            // Забираем ресурсы у защитника
            await runAsync(
                'UPDATE villages SET wood = wood - ?, clay = clay - ?, iron = iron - ?, food = food - ? WHERE id = ?',
                [loot.wood, loot.clay, loot.iron, loot.food, attack.to_village_id]
            );
            
            // Добавляем ресурсы атакующему
            await runAsync(
                'UPDATE villages SET wood = wood + ?, clay = clay + ?, iron = iron + ?, food = food + ? WHERE id = ?',
                [loot.wood, loot.clay, loot.iron, loot.food, attack.from_village_id]
            );
            
            // Защитник теряет часть войск
            const defenderLossRate = 0.5;
            for (const troop of defendingTroops) {
                const losses = Math.floor(troop.amount * defenderLossRate);
                await runAsync(
                    'UPDATE troops SET amount = amount - ? WHERE id = ?',
                    [losses, troop.id]
                );
            }
            
            // Атакующий теряет меньше войск
            const attackerLossRate = 0.2;
            const survivingTroops = {};
            for (const [troopType, amount] of Object.entries(attackingTroops)) {
                survivingTroops[troopType] = Math.floor(amount * (1 - attackerLossRate));
            }
            
            // Возвращаем выживших домой
            attack.troops_data = JSON.stringify(survivingTroops);
            
            // Создаем отчет
            await createReport(
                attack.from_village_id,
                'attack_success',
                'Победа в атаке!',
                `Вы победили и награбили: ${loot.wood} дерева, ${loot.clay} глины, ${loot.iron} железа, ${loot.food} еды`
            );
            
            await createReport(
                attack.to_village_id,
                'defense_failed',
                'Поражение в обороне!',
                `Вас атаковали и разграбили. Потери значительные.`
            );
            
        } else {
            // Защитник побеждает
            const attackerLossRate = 0.8;
            const defenderLossRate = 0.2;
            
            // Атакующий теряет большую часть войск
            const survivingTroops = {};
            for (const [troopType, amount] of Object.entries(attackingTroops)) {
                survivingTroops[troopType] = Math.floor(amount * (1 - attackerLossRate));
            }
            
            attack.troops_data = JSON.stringify(survivingTroops);
            
            // Защитник теряет немного войск
            for (const troop of defendingTroops) {
                const losses = Math.floor(troop.amount * defenderLossRate);
                await runAsync(
                    'UPDATE troops SET amount = amount - ? WHERE id = ?',
                    [losses, troop.id]
                );
            }
            
            // Создаем отчеты
            await createReport(
                attack.from_village_id,
                'attack_failed',
                'Поражение в атаке!',
                'Ваша атака провалилась. Большие потери.'
            );
            
            await createReport(
                attack.to_village_id,
                'defense_success',
                'Победа в обороне!',
                'Вы успешно отразили атаку!'
            );
        }
        
        // Отправляем войска обратно
        const distance = calculateDistance(
            attack.from_village_id,
            attack.to_village_id,
            attack.from_village_id,
            attack.to_village_id
        );
        const returnTime = Math.max(5, Math.floor(distance * 3));
        const returnArrivalTime = new Date(Date.now() + returnTime * 60 * 1000);
        
        await runAsync(
            'UPDATE attacks SET is_returning = 1, arrival_time = ? WHERE id = ?',
            [returnArrivalTime.toISOString(), attack.id]
        );
    }
    
    // Обработка возвращающихся войск
    const returnedTroops = await allAsync(
        'SELECT * FROM attacks WHERE arrival_time <= ? AND is_returning = 1',
        [now]
    );
    
    for (const attack of returnedTroops) {
        const troops = JSON.parse(attack.troops_data);
        
        // Возвращаем войска в деревню
        for (const [troopType, amount] of Object.entries(troops)) {
            if (amount > 0) {
                await runAsync(
                    'UPDATE troops SET amount = amount + ? WHERE village_id = ? AND troop_type = ?',
                    [amount, attack.from_village_id, troopType]
                );
            }
        }
        
        // Удаляем атаку
        await runAsync('DELETE FROM attacks WHERE id = ?', [attack.id]);
    }
}

// Создать отчет
async function createReport(villageId, type, title, content) {
    const village = await getAsync('SELECT user_id FROM villages WHERE id = ?', [villageId]);
    if (village) {
        await runAsync(
            'INSERT INTO reports (user_id, type, title, content) VALUES (?, ?, ?, ?)',
            [village.user_id, type, title, content]
        );
    }
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
    processAttacks
};