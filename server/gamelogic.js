const Village = require('../models/Village');
const Building = require('../models/Building');
const Troop = require('../models/Troop');
const TrainingQueue = require('../models/TrainingQueue');

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

function calculateBuildingCost(type, level) {
  const b = BUILDING_TYPES[type];
  const m = Math.pow(level + 1, 1.5);
  return {
    wood: Math.floor(b.baseCost.wood * m),
    clay: Math.floor(b.baseCost.clay * m),
    iron: Math.floor(b.baseCost.iron * m),
    food: Math.floor(b.baseCost.food * m)
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

async function findFreePosition() {
  const maxAttempts = 100;
  const size = 20;
  for (let i = 0; i < maxAttempts; i++) {
    const x = Math.floor(Math.random() * size);
    const y = Math.floor(Math.random() * size);
    const exists = await Village.findOne({ x, y }).lean();
    if (!exists) return { x, y };
  }
  throw new Error('Не удалось найти свободную позицию');
}

async function createVillage(userId, name) {
  const pos = await findFreePosition();
  const village = await Village.create({ user: userId, name, x: pos.x, y: pos.y });
  for (const type of Object.keys(BUILDING_TYPES)) {
    const level = type === 'tribal_hall' ? 1 : 0;
    await Building.create({ village: village._id, building_type: type, level });
  }
  for (const troop of Object.keys(TROOP_TYPES)) {
    await Troop.create({ village: village._id, troop_type: troop, amount: 0 });
  }
  return village._id;
}

async function getVillage(userId, villageId = null) {
  if (villageId) return Village.findOne({ _id: villageId, user: userId });
  return Village.findOne({ user: userId }).sort({ _id: 1 });
}

async function updateVillageResources(village) {
  const now = Date.now();
  const diffMinutes = Math.floor((now - new Date(village.last_update).getTime()) / 60000);
  if (diffMinutes < 1) return village.toObject();

  const buildings = await Building.find({ village: village._id });
  let production = { wood: 0, clay: 0, iron: 0, food: 0 };
  let warehouseLevel = 0;
  for (const b of buildings) {
    const info = BUILDING_TYPES[b.building_type];
    if (info.production && b.level > 0) {
      production[info.production] += calculateProduction(b.building_type, b.level);
    }
    if (b.building_type === 'warehouse') warehouseLevel = b.level;
  }
  const troops = await Troop.find({ village: village._id });
  let upkeep = 0;
  for (const t of troops) {
    upkeep += TROOP_TYPES[t.troop_type].upkeep * t.amount;
  }
  production.food -= upkeep;

  const maxMinutes = Math.min(diffMinutes, 720);
  const capacity = calculateWarehouseCapacity(warehouseLevel);

  village.wood = Math.min(village.wood + production.wood * maxMinutes / 60, capacity);
  village.clay = Math.min(village.clay + production.clay * maxMinutes / 60, capacity);
  village.iron = Math.min(village.iron + production.iron * maxMinutes / 60, capacity);
  village.food = Math.max(0, Math.min(village.food + production.food * maxMinutes / 60, capacity));
  village.last_update = new Date(now);
  await village.save();
  return { ...village.toObject(), production, capacity };
}

async function getBuildings(villageId) {
  const list = await Building.find({ village: villageId }).lean();
  return list.map(b => {
    const info = BUILDING_TYPES[b.building_type];
    return {
      ...b,
      name: info.name,
      nextLevelCost: calculateBuildingCost(b.building_type, b.level),
      buildTime: calculateBuildTime(b.building_type, b.level + 1),
      production: info.production ? calculateProduction(b.building_type, b.level) : null
    };
  });
}

async function upgradeBuilding(userId, villageId, type) {
  const village = await getVillage(userId, villageId);
  if (!village) throw new Error('Деревня не найдена');
  await updateVillageResources(village);
  const building = await Building.findOne({ village: villageId, building_type: type });
  if (!building) throw new Error('Здание не найдено');
  if (building.is_upgrading) throw new Error('Здание уже улучшается');
  if (type !== 'tribal_hall') {
    const th = await Building.findOne({ village: villageId, building_type: 'tribal_hall' });
    if (building.level >= th.level) throw new Error('Сначала улучшите Tribal Hall');
  }
  const cost = calculateBuildingCost(type, building.level);
  if (village.wood < cost.wood || village.clay < cost.clay || village.iron < cost.iron || village.food < cost.food) {
    throw new Error('Недостаточно ресурсов');
  }
  village.wood -= cost.wood;
  village.clay -= cost.clay;
  village.iron -= cost.iron;
  village.food -= cost.food;
  await village.save();
  const buildTime = calculateBuildTime(type, building.level + 1);
  const finish = new Date(Date.now() + buildTime * 60000);
  building.is_upgrading = true;
  building.upgrade_finish_time = finish;
  await building.save();
  return { success: true, finishTime: finish.toISOString(), buildTime };
}

async function getTroops(villageId) {
  const troops = await Troop.find({ village: villageId }).lean();
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

async function trainTroops(userId, villageId, type, amount) {
  if (!TROOP_TYPES[type]) throw new Error('Неверный тип войск');
  if (amount < 1) throw new Error('Количество должно быть больше 0');
  const village = await getVillage(userId, villageId);
  if (!village) throw new Error('Деревня не найдена');
  const barracks = await Building.findOne({ village: villageId, building_type: 'barracks' });
  if (!barracks || barracks.level < 1) throw new Error('Постройте казармы');
  await updateVillageResources(village);
  const info = TROOP_TYPES[type];
  const cost = {
    wood: info.cost.wood * amount,
    clay: info.cost.clay * amount,
    iron: info.cost.iron * amount,
    food: info.cost.food * amount
  };
  if (village.wood < cost.wood || village.clay < cost.clay || village.iron < cost.iron || village.food < cost.food) {
    throw new Error('Недостаточно ресурсов');
  }
  village.wood -= cost.wood;
  village.clay -= cost.clay;
  village.iron -= cost.iron;
  village.food -= cost.food;
  await village.save();
  const trainTime = info.trainTime * amount;
  const finish = new Date(Date.now() + trainTime * 60000);
  await TrainingQueue.create({ village: villageId, troop_type: type, amount, finish_time: finish });
  return { success: true, finishTime: finish.toISOString(), trainTime };
}

module.exports = {
  createVillage,
  getVillage,
  updateVillageResources,
  getBuildings,
  upgradeBuilding,
  getTroops,
  trainTroops
};
