/**
 * CRYPTOTRIBES GAME CONSTANTS
 * Single source of truth for all game parameters
 * Extracted from GDD.md (Game Design Document)
 *
 * DO NOT hardcode these values elsewhere - always import from this file
 */

// ============================================
// UNIT STATS
// ============================================

const UNIT_STATS = {
  militia: {
    name: 'Militia',
    tier: 1,
    hp: 100,
    damage: 10,
    cost: 10, // gold
    speed: 'medium',
    range: 'melee',
    trainingTime: {
      barracksLv1: 60, // seconds
      barracksLv10: 10
    },
    counters: null, // neutral against all
    weakTo: null,
    description: 'Basic infantry, cheap cannon fodder'
  },
  spearman: {
    name: 'Spearman',
    tier: 2,
    hp: 120,
    damage: 15,
    cost: 25,
    speed: 'slow',
    range: 'melee',
    trainingTime: {
      barracksLv3: 45,
      barracksLv10: 7
    },
    unlockLevel: 3, // Barracks level required
    counters: 'cavalry', // +50% damage to cavalry
    weakTo: 'archer', // -25% defense vs archers
    description: 'Anti-cavalry tank'
  },
  archer: {
    name: 'Archer',
    tier: 2,
    hp: 80,
    damage: 20,
    cost: 30,
    speed: 'fast',
    range: 'ranged',
    trainingTime: {
      barracksLv5: 60,
      barracksLv10: 10
    },
    unlockLevel: 5,
    counters: 'spearman', // +50% damage to spearmen
    weakTo: 'cavalry', // -25% defense vs cavalry
    description: 'Ranged DPS, glass cannon'
  },
  cavalry: {
    name: 'Cavalry',
    tier: 3,
    hp: 150,
    damage: 25,
    cost: 50,
    speed: 'very_fast',
    range: 'melee',
    trainingTime: {
      barracksLv7: 90,
      barracksLv10: 15
    },
    unlockLevel: 7,
    counters: 'archer', // +50% damage to archers
    weakTo: 'spearman', // -25% defense vs spearmen
    description: 'Elite fast raiders'
  }
};

// Counter bonus multiplier (when unit counters enemy type)
const COUNTER_BONUS = 1.5; // +50% damage

// ============================================
// BUILDING COSTS & LEVELS
// ============================================

const BUILDING_COSTS = {
  barracks: {
    name: 'Barracks',
    description: 'Train units, unlock advanced unit types',
    levels: [
      { level: 1, cost: 0, time: 0, trainingSpeed: 60, queueSize: 10, unlock: 'Militia' },
      { level: 2, cost: 100, time: 120, trainingSpeed: 50, queueSize: 15 },
      { level: 3, cost: 200, time: 300, trainingSpeed: 45, queueSize: 20, unlock: 'Spearmen' },
      { level: 4, cost: 400, time: 600, trainingSpeed: 40, queueSize: 30 },
      { level: 5, cost: 800, time: 1200, trainingSpeed: 35, queueSize: 40, unlock: 'Archers' },
      { level: 6, cost: 1200, time: 2400, trainingSpeed: 30, queueSize: 50 },
      { level: 7, cost: 1500, time: 3600, trainingSpeed: 25, queueSize: 60, unlock: 'Cavalry' },
      { level: 8, cost: 2000, time: 5400, trainingSpeed: 20, queueSize: 75 },
      { level: 9, cost: 2500, time: 7200, trainingSpeed: 15, queueSize: 85 },
      { level: 10, cost: 3000, time: 10800, trainingSpeed: 10, queueSize: 100, unlock: 'All units' }
    ],
    totalCost: 11700,
    totalTime: 31320 // seconds (~8.7 hours)
  },
  warehouse: {
    name: 'Warehouse',
    description: 'Store resources, protect from raids, generate passive income',
    levels: [
      { level: 1, cost: 0, time: 0, capacity: 1000, protection: 0, passiveIncome: 0 },
      { level: 2, cost: 80, time: 60, capacity: 2000, protection: 5, passiveIncome: 2 },
      { level: 3, cost: 150, time: 180, capacity: 3500, protection: 10, passiveIncome: 4 },
      { level: 4, cost: 300, time: 360, capacity: 5000, protection: 15, passiveIncome: 6 },
      { level: 5, cost: 600, time: 720, capacity: 7000, protection: 20, passiveIncome: 8 },
      { level: 6, cost: 1000, time: 1200, capacity: 10000, protection: 25, passiveIncome: 10 },
      { level: 7, cost: 1500, time: 1800, capacity: 13000, protection: 30, passiveIncome: 12 },
      { level: 8, cost: 1800, time: 2700, capacity: 16000, protection: 35, passiveIncome: 14 },
      { level: 9, cost: 2000, time: 3600, capacity: 18000, protection: 40, passiveIncome: 16 },
      { level: 10, cost: 2500, time: 5400, capacity: 20000, protection: 50, passiveIncome: 20 }
    ],
    totalCost: 9930,
    totalTime: 15840 // seconds (~4.4 hours)
  },
  workshop: {
    name: 'Workshop',
    description: 'Unlock formations, enable scouting, tactical advantage',
    levels: [
      { level: 1, cost: 0, time: 0, unlock: '3 basic formations' },
      { level: 2, cost: 150, time: 180 },
      { level: 3, cost: 300, time: 360, unlock: 'Scouting (see enemy garrisons)' },
      { level: 4, cost: 600, time: 720 },
      { level: 5, cost: 1200, time: 1500, formationBonus: 1.05 },
      { level: 6, cost: 2000, time: 2400 },
      { level: 7, cost: 2500, time: 3600, formationBonus: 1.10 },
      { level: 8, cost: 3000, time: 5400 },
      { level: 9, cost: 3500, time: 7200, formationBonus: 1.15 },
      { level: 10, cost: 4000, time: 10800, formationBonus: 1.20 }
    ],
    totalCost: 17250,
    totalTime: 31680 // seconds (~8.8 hours)
  }
};

// Total to max all buildings
const TOTAL_BUILDING_COST = 38880; // gold
const TOTAL_BUILDING_TIME = 78840; // seconds (~22 hours)

// ============================================
// TERRAIN MODIFIERS
// ============================================

const TERRAIN_MODIFIERS = {
  plains: {
    name: 'Plains',
    defenseBonus: 1.0,
    cavalryEffectiveness: 1.0,
    archerDamage: 1.0,
    spearmanHP: 1.0,
    description: 'Neutral terrain, no modifiers'
  },
  forest: {
    name: 'Forest',
    defenseBonus: 1.25, // +25% defense for defender
    cavalryEffectiveness: 0.75, // -25% cavalry effectiveness
    archerDamage: 1.0,
    spearmanHP: 1.10, // +10% HP for spearmen (cover)
    description: 'Favors defenders and infantry'
  },
  hills: {
    name: 'Hills',
    defenseBonus: 1.15, // +15% defense for defender
    cavalryEffectiveness: 0.90, // -10% cavalry effectiveness
    archerDamage: 1.25, // +25% archer damage (high ground)
    spearmanHP: 1.0,
    description: 'Favors archers with high ground'
  },
  castle: {
    name: 'Castle',
    defenseBonus: 1.50, // +50% defense for defender (fortifications)
    cavalryEffectiveness: 1.0,
    archerDamage: 1.0,
    spearmanHP: 1.0,
    garrisonHPBonus: 1.30, // +30% HP for all garrison units (castle walls)
    attackerDamagePenalty: 0.80, // -20% damage for attackers (siege disadvantage)
    description: 'Heavily fortified center territories'
  }
};

// ============================================
// FORMATION BONUSES
// ============================================

const FORMATION_BONUSES = {
  offensive: {
    name: 'Offensive',
    damageBonus: 1.15, // +15% damage
    defenseBonus: 0.90, // -10% defense
    description: 'High risk, high reward'
  },
  defensive: {
    name: 'Defensive',
    damageBonus: 0.95, // -5% damage
    defenseBonus: 1.20, // +20% defense
    description: 'Fortify positions'
  },
  balanced: {
    name: 'Balanced',
    damageBonus: 1.05, // +5% damage
    defenseBonus: 1.05, // +5% defense
    description: 'Versatile default'
  }
};

// Workshop level amplifies formation bonuses
const WORKSHOP_FORMATION_MULTIPLIERS = {
  1: 1.0, 2: 1.0, 3: 1.0, 4: 1.0,
  5: 1.05, 6: 1.05,
  7: 1.10, 8: 1.10,
  9: 1.15,
  10: 1.20
};

// ============================================
// POSITION BONUS (ATTACKER VS DEFENDER)
// ============================================

const POSITION_BONUS = {
  attacker: 1.0, // No bonus
  defender: 1.2  // +20% defensive advantage
};

// ============================================
// TERRITORY VALUES
// ============================================

const TERRITORY_TIERS = {
  center: {
    name: 'Center',
    count: 5,
    vpPerHour: 100,
    goldPerHour: 100,
    terrain: 'castle',
    upkeepPerHour: 20,
    netGoldPerHour: 80,
    difficulty: 'HARD',
    description: 'Most valuable territories'
  },
  ring: {
    name: 'Ring',
    count: 15,
    vpPerHour: 50,
    goldPerHour: 50,
    terrain: 'mixed', // 8 Plains, 4 Forest, 3 Hills
    upkeepPerHour: 20,
    netGoldPerHour: 30,
    difficulty: 'MEDIUM'
  },
  edge: {
    name: 'Edge',
    count: 30,
    vpPerHour: 25,
    goldPerHour: 25,
    terrain: 'mostly_plains', // 17 Plains, 8 Forest, 5 Hills
    upkeepPerHour: 20,
    netGoldPerHour: 5,
    difficulty: 'EASY'
  }
};

// Total territories
const TOTAL_TERRITORIES = 50;

// Territory distribution by terrain
const TERRITORY_TERRAIN_DISTRIBUTION = {
  center: { castle: 5 },
  ring: { plains: 8, forest: 4, hills: 3 },
  edge: { plains: 17, forest: 8, hills: 5 }
};

// ============================================
// NPC GARRISON VALUES
// ============================================

const NPC_GARRISONS = {
  edge: {
    difficulty: 'weak',
    units: {
      militia: { min: 10, max: 20 },
      spearman: { min: 3, max: 8 },
      archer: { min: 2, max: 5 },
      cavalry: { min: 0, max: 2 }
    },
    totalUnits: { min: 15, max: 35 },
    estimatedPower: 15000,
    loot: { min: 100, max: 300 },
    requiredPlayers: 1
  },
  ring: {
    difficulty: 'strong',
    units: {
      militia: { min: 30, max: 50 },
      spearman: { min: 15, max: 25 },
      archer: { min: 10, max: 20 },
      cavalry: { min: 5, max: 10 }
    },
    totalUnits: { min: 60, max: 105 },
    estimatedPower: 50000,
    loot: { min: 300, max: 600 },
    requiredPlayers: 2
  },
  center: {
    difficulty: 'elite',
    units: {
      militia: { min: 80, max: 120 },
      spearman: { min: 40, max: 60 },
      archer: { min: 30, max: 50 },
      cavalry: { min: 20, max: 30 }
    },
    totalUnits: { min: 170, max: 260 },
    estimatedPower: 200000, // Base power (before +50% castle terrain = 300k effective)
    loot: { min: 1000, max: 2000 },
    requiredPlayers: { min: 6, max: 8 }
  }
};

// ============================================
// ECONOMY - DIMINISHING RETURNS
// ============================================

const DIMINISHING_RETURNS = {
  brackets: [
    { min: 1, max: 5, efficiency: 1.0 },   // 100% efficiency
    { min: 6, max: 10, efficiency: 0.8 },  // 80% efficiency (-20% penalty)
    { min: 11, max: 15, efficiency: 0.6 }, // 60% efficiency (-40% penalty)
    { min: 16, max: 20, efficiency: 0.4 }, // 40% efficiency (-60% penalty)
    { min: 21, max: 999, efficiency: 0.2 } // 20% efficiency (-80% penalty)
  ]
};

// Helper function to calculate efficiency for territory count
function getDiminishingReturnsEfficiency(territoryCount) {
  const bracket = DIMINISHING_RETURNS.brackets.find(
    b => territoryCount >= b.min && territoryCount <= b.max
  );
  return bracket ? bracket.efficiency : 0.2;
}

// ============================================
// ECONOMY - UPKEEP COSTS
// ============================================

const UPKEEP_COSTS = {
  territoryPerHour: 20, // gold per territory per hour
  armyPerHour: 0.1 // gold per unit per hour (1 gold per 10 units)
};

// Leader penalties (top tribes pay extra upkeep)
const LEADER_UPKEEP_PENALTIES = {
  rank1: 1.50, // +50% upkeep for 1st place
  rank2: 1.25, // +25% upkeep for 2nd place
  rank3: 1.10, // +10% upkeep for 3rd place
  rank4Plus: 1.0 // Normal upkeep for rank 4+
};

// ============================================
// ECONOMY - BASE GENERATION
// ============================================

const BASE_GENERATION = {
  goldPerHour: 10 // All players get 10 gold/hour (prevents bankruptcy)
};

// ============================================
// VICTORY POINTS (VP)
// ============================================

// Underdog bonuses (lower-ranked tribes get VP multiplier)
const UNDERDOG_VP_BONUSES = {
  rank1to3: 1.0,   // No bonus for top 3
  rank4to6: 1.15,  // +15% VP generation
  rank7to10: 1.25, // +25% VP generation
  rank11Plus: 1.5  // +50% VP generation
};

// Battle VP rewards
const BATTLE_VP_REWARDS = {
  territoryCaptured: 100,
  perEnemyUnitKilled: 1,
  successfulDefense: 50
};

// War declaration VP bonus
const WAR_DECLARATION_VP_BONUS = 1.5; // +50% VP from battles vs declared enemy

// ============================================
// COMBAT - CASUALTY DISTRIBUTION
// ============================================

const CASUALTY_RATES = {
  winner: 0.40, // Winner loses 40% of units
  loser: 0.60   // Loser loses 60% of units
};

// RNG variance for battle outcomes
const BATTLE_RNG_VARIANCE = {
  min: 0.90, // -10% power
  max: 1.10  // +10% power
};

// ============================================
// COMBAT - LOOT CALCULATION
// ============================================

const LOOT_RATES = {
  basePercentage: 0.20, // Steal 20% of defender's gold
  maxPercentage: 0.40,  // Max 40% if very weak defense
  warehouseProtectionReduces: true // Warehouse protection % reduces loot
};

// ============================================
// TRIBE SETTINGS
// ============================================

const TRIBE_SETTINGS = {
  maxMembers: 12,
  maxCaptains: 2,
  votingThreshold: 8, // Requires 8/12 votes (67% majority)
  treasuryTaxRate: 0.10, // 10% of territorial income goes to treasury
  battleLootTaxRate: 0.20, // 20% of battle loot goes to treasury
  maxWarsActive: 1, // Can only declare war on 1 tribe at a time
  warDuration: 48 * 3600 // 48 hours in seconds
};

// ============================================
// SEASON SETTINGS
// ============================================

const SEASON_SETTINGS = {
  durationDays: 10,
  startHourUTC: 16, // 16:00 UTC (4 PM)
  entryFeeDollars: 25,
  prizePoolPercentage: 85, // 85% distributed to players
  rakePercentage: 15, // 15% platform profit
  events: [
    { day: 1, name: 'Gold Rush', goldBonus: 2.0, description: 'All territories generate +100% gold for 24h' },
    { day: 3, name: 'Fog of War', scoutingDisabled: true, description: 'Cannot see enemy garrisons for 24h' },
    { day: 5, name: 'Raid Boss', bossHP: 10000, bossDamage: 100, reward: { gold: 5000, vp: 500 } },
    { day: 8, name: 'Center Rush', centerVPMultiplier: 3.0, description: 'Center territories grant +200% VP (300 VP/hr)' },
    { day: 10, name: 'Armageddon', centerVPMultiplier: 6.0, allStatsBonus: 1.5, description: 'Final day chaos' }
  ]
};

// ============================================
// ANTI-CHEAT SETTINGS
// ============================================

const ANTICHEAT_SETTINGS = {
  walletMinAgeDays: 90,
  walletMinTransactions: 10,
  behavioralSimilarityThreshold: 0.80, // If 2 accounts have >80% similar patterns, flag
  ipDuplicateThreshold: 4, // Flag if 4+ accounts from same IP
  reportBounty: 50 // $50 reward for confirmed multi-account report
};

// ============================================
// SHIELDS
// ============================================

const SHIELD_SETTINGS = {
  personal: {
    duration: 4 * 3600, // 4 hours in seconds
    cooldown: 24 * 3600, // 24 hours in seconds
    cost: 0, // Free
    maxActive: 1 // Can shield 1 territory
  }
  // Territorial and Tribal shields removed from MVP
};

// ============================================
// SUPPLY CAP (ARMY SIZE LIMIT)
// ============================================

const SUPPLY_CAP = {
  base: 500,
  perBuildingLevel: 10 // +10 supply per total building level
};

// Example: All buildings at Lv5 = 500 + (15 × 10) = 650 supply
// Max supply: 500 + (30 × 10) = 800 units

// ============================================
// RATE LIMITING
// ============================================

const RATE_LIMITS = {
  actionsPerHour: 100, // Max 100 API calls per hour per player
  attacksPerHour: 20,  // Max 20 attacks per hour
  trainingPerHour: 50  // Max 50 training queue additions per hour
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Units
  UNIT_STATS,
  COUNTER_BONUS,

  // Buildings
  BUILDING_COSTS,
  TOTAL_BUILDING_COST,
  TOTAL_BUILDING_TIME,

  // Combat
  TERRAIN_MODIFIERS,
  FORMATION_BONUSES,
  WORKSHOP_FORMATION_MULTIPLIERS,
  POSITION_BONUS,
  CASUALTY_RATES,
  BATTLE_RNG_VARIANCE,
  LOOT_RATES,

  // Territories
  TERRITORY_TIERS,
  TOTAL_TERRITORIES,
  TERRITORY_TERRAIN_DISTRIBUTION,
  NPC_GARRISONS,

  // Economy
  DIMINISHING_RETURNS,
  getDiminishingReturnsEfficiency,
  UPKEEP_COSTS,
  LEADER_UPKEEP_PENALTIES,
  BASE_GENERATION,

  // Victory Points
  UNDERDOG_VP_BONUSES,
  BATTLE_VP_REWARDS,
  WAR_DECLARATION_VP_BONUS,

  // Tribes
  TRIBE_SETTINGS,

  // Season
  SEASON_SETTINGS,

  // Anti-Cheat
  ANTICHEAT_SETTINGS,

  // Shields
  SHIELD_SETTINGS,

  // Supply Cap
  SUPPLY_CAP,

  // Rate Limits
  RATE_LIMITS
};
