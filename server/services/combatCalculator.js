/**
 * COMBAT CALCULATOR SERVICE
 * Core battle mechanics with rock-paper-scissors counters
 *
 * Combat Flow:
 * 1. Calculate base power for both sides
 * 2. Apply terrain modifiers
 * 3. Apply formation bonuses
 * 4. Apply counter bonuses (rock-paper-scissors)
 * 5. Apply position bonus (defender advantage)
 * 6. Apply RNG variance
 * 7. Determine winner
 * 8. Calculate casualties
 * 9. Calculate loot
 */

const {
  UNIT_STATS,
  COUNTER_BONUS,
  TERRAIN_MODIFIERS,
  FORMATION_BONUSES,
  POSITION_BONUS,
  CASUALTY_RATES,
  BATTLE_RNG_VARIANCE,
  LOOT_RATES,
  BATTLE_VP_REWARDS,
  WAR_DECLARATION_VP_BONUS,
} = require('../config/constants');

const logger = require('../utils/logger');

/**
 * Calculate base power of an army
 * Power = sum of (unit_count * unit_hp * unit_damage)
 *
 * @param {Object} army - { militia: n, spearman: n, archer: n, cavalry: n }
 * @returns {number} base power
 */
function calculateBasePower(army) {
  let power = 0;

  for (const [unitType, count] of Object.entries(army)) {
    if (count > 0 && UNIT_STATS[unitType]) {
      const stats = UNIT_STATS[unitType];
      // Power formula: count * HP * damage / 10 (for readable numbers)
      power += count * stats.hp * stats.damage / 10;
    }
  }

  return Math.floor(power);
}

/**
 * Calculate effective power after terrain modifiers
 *
 * @param {Object} army - Army composition
 * @param {string} terrain - Terrain type
 * @param {boolean} isDefender - Is this the defending army
 * @returns {number} modified power
 */
function applyTerrainModifiers(army, terrain, isDefender) {
  const mods = TERRAIN_MODIFIERS[terrain] || TERRAIN_MODIFIERS.plains;
  let power = 0;

  for (const [unitType, count] of Object.entries(army)) {
    if (count <= 0 || !UNIT_STATS[unitType]) continue;

    const stats = UNIT_STATS[unitType];
    let unitPower = count * stats.hp * stats.damage / 10;

    // Apply unit-specific terrain modifiers
    if (unitType === 'cavalry') {
      unitPower *= mods.cavalryEffectiveness;
    }
    if (unitType === 'archer') {
      unitPower *= mods.archerDamage;
    }
    if (unitType === 'spearman') {
      // Spearmen get HP bonus from terrain cover
      const hpMod = mods.spearmanHP || 1.0;
      unitPower *= hpMod;
    }

    // Apply garrison HP bonus (castle only, defender only)
    if (isDefender && mods.garrisonHPBonus) {
      unitPower *= mods.garrisonHPBonus;
    }

    power += unitPower;
  }

  // Apply defense bonus for defender
  if (isDefender) {
    power *= mods.defenseBonus;
  }

  // Apply attacker damage penalty (castle)
  if (!isDefender && mods.attackerDamagePenalty) {
    power *= mods.attackerDamagePenalty;
  }

  return Math.floor(power);
}

/**
 * Apply formation bonuses to power
 *
 * @param {number} power - Current power
 * @param {string} formation - Formation type
 * @param {boolean} isDefender - Is this the defender
 * @param {number} workshopLevel - Workshop level for amplification
 * @returns {number} modified power
 */
function applyFormationBonus(power, formation = 'balanced', isDefender, workshopLevel = 1) {
  const formationMod = FORMATION_BONUSES[formation] || FORMATION_BONUSES.balanced;

  // Workshop amplifies formation bonuses at higher levels
  const workshopMultiplier = workshopLevel >= 10 ? 1.20 :
    workshopLevel >= 9 ? 1.15 :
    workshopLevel >= 7 ? 1.10 :
    workshopLevel >= 5 ? 1.05 : 1.0;

  // Apply damage bonus
  let modifiedPower = power * formationMod.damageBonus;

  // Apply defense bonus for defender
  if (isDefender) {
    const defenseBonus = 1 + (formationMod.defenseBonus - 1) * workshopMultiplier;
    modifiedPower *= defenseBonus;
  }

  return Math.floor(modifiedPower);
}

/**
 * Calculate counter bonuses between armies (rock-paper-scissors)
 *
 * Counter relationships:
 * - Spearman counters Cavalry (+50% damage)
 * - Cavalry counters Archer (+50% damage)
 * - Archer counters Spearman (+50% damage)
 *
 * @param {Object} attackerArmy - Attacker army composition
 * @param {Object} defenderArmy - Defender army composition
 * @returns {Object} { attackerBonus, defenderBonus }
 */
function calculateCounterBonuses(attackerArmy, defenderArmy) {
  const counters = {
    spearman: 'cavalry',   // Spearman beats Cavalry
    cavalry: 'archer',     // Cavalry beats Archer
    archer: 'spearman',    // Archer beats Spearman
  };

  let attackerBonus = 1.0;
  let defenderBonus = 1.0;

  // Calculate attacker's counter advantage
  for (const [unitType, countersType] of Object.entries(counters)) {
    const attackerCount = attackerArmy[unitType] || 0;
    const defenderVictimCount = defenderArmy[countersType] || 0;

    if (attackerCount > 0 && defenderVictimCount > 0) {
      // Bonus proportional to counter matchup
      const ratio = Math.min(attackerCount / defenderVictimCount, 2);
      attackerBonus += (COUNTER_BONUS - 1) * ratio * 0.1;
    }
  }

  // Calculate defender's counter advantage
  for (const [unitType, countersType] of Object.entries(counters)) {
    const defenderCount = defenderArmy[unitType] || 0;
    const attackerVictimCount = attackerArmy[countersType] || 0;

    if (defenderCount > 0 && attackerVictimCount > 0) {
      const ratio = Math.min(defenderCount / attackerVictimCount, 2);
      defenderBonus += (COUNTER_BONUS - 1) * ratio * 0.1;
    }
  }

  return { attackerBonus, defenderBonus };
}

/**
 * Apply position bonus (defender advantage)
 *
 * @param {number} power - Current power
 * @param {boolean} isDefender - Is this the defender
 * @returns {number} modified power
 */
function applyPositionBonus(power, isDefender) {
  const multiplier = isDefender ? POSITION_BONUS.defender : POSITION_BONUS.attacker;
  return Math.floor(power * multiplier);
}

/**
 * Apply RNG variance to power
 *
 * @param {number} power - Current power
 * @returns {number} randomized power
 */
function applyRngVariance(power) {
  const variance = BATTLE_RNG_VARIANCE.min +
    Math.random() * (BATTLE_RNG_VARIANCE.max - BATTLE_RNG_VARIANCE.min);
  return Math.floor(power * variance);
}

/**
 * Calculate casualties for both sides
 *
 * @param {Object} army - Army composition
 * @param {number} casualtyRate - Percentage of army lost (0-1)
 * @returns {Object} casualties by unit type
 */
function calculateCasualties(army, casualtyRate) {
  const casualties = {};
  let totalLost = 0;

  for (const [unitType, count] of Object.entries(army)) {
    if (count > 0) {
      // Lower tier units die first (militia has highest casualty rate)
      const tierMultiplier = UNIT_STATS[unitType]?.tier === 1 ? 1.2 :
        UNIT_STATS[unitType]?.tier === 2 ? 1.0 : 0.8;

      const lost = Math.floor(count * casualtyRate * tierMultiplier);
      casualties[unitType] = Math.min(lost, count);
      totalLost += casualties[unitType];
    } else {
      casualties[unitType] = 0;
    }
  }

  casualties.total = totalLost;
  return casualties;
}

/**
 * Calculate surviving army after battle
 *
 * @param {Object} army - Original army
 * @param {Object} casualties - Casualties by unit type
 * @returns {Object} surviving army
 */
function calculateSurvivors(army, casualties) {
  const survivors = {};

  for (const [unitType, count] of Object.entries(army)) {
    survivors[unitType] = Math.max(0, count - (casualties[unitType] || 0));
  }

  return survivors;
}

/**
 * Calculate loot from defender
 *
 * @param {number} defenderGold - Defender's gold
 * @param {number} warehouseProtection - Warehouse protection percentage (0-50)
 * @param {boolean} isDecisiveVictory - Attacker won decisively
 * @returns {number} gold looted
 */
function calculateLoot(defenderGold, warehouseProtection = 0, isDecisiveVictory = false) {
  // Base loot percentage
  let lootPercentage = LOOT_RATES.basePercentage;

  // Increase loot for decisive victories
  if (isDecisiveVictory) {
    lootPercentage = LOOT_RATES.maxPercentage;
  }

  // Warehouse protection reduces loot
  const protectionReduction = warehouseProtection / 100;
  lootPercentage *= (1 - protectionReduction);

  const loot = Math.floor(defenderGold * lootPercentage);
  return loot;
}

/**
 * Calculate VP rewards for battle
 *
 * @param {Object} options - Battle outcome options
 * @returns {Object} VP rewards
 */
function calculateVpRewards(options) {
  const {
    isAttackerVictory,
    isDefenderVictory,
    territoryChanged,
    attackerCasualties,
    defenderCasualties,
    isWarTarget,
  } = options;

  const rewards = {
    attacker: 0,
    defender: 0,
  };

  // VP for territory capture
  if (isAttackerVictory && territoryChanged) {
    rewards.attacker += BATTLE_VP_REWARDS.territoryCaptured;
  }

  // VP for successful defense
  if (isDefenderVictory) {
    rewards.defender += BATTLE_VP_REWARDS.successfulDefense;
  }

  // VP per enemy unit killed
  rewards.attacker += defenderCasualties.total * BATTLE_VP_REWARDS.perEnemyUnitKilled;
  rewards.defender += attackerCasualties.total * BATTLE_VP_REWARDS.perEnemyUnitKilled;

  // War declaration bonus
  if (isWarTarget) {
    if (isAttackerVictory) {
      rewards.attacker *= WAR_DECLARATION_VP_BONUS;
    }
    if (isDefenderVictory) {
      rewards.defender *= WAR_DECLARATION_VP_BONUS;
    }
  }

  return {
    attacker: Math.floor(rewards.attacker),
    defender: Math.floor(rewards.defender),
  };
}

/**
 * Process a complete battle
 *
 * @param {Object} battleData - Battle input data
 * @returns {Object} Battle result
 */
function processBattle(battleData) {
  const {
    attackerArmy,
    defenderArmy,
    terrain,
    attackerFormation = 'balanced',
    defenderFormation = 'balanced',
    attackerWorkshopLevel = 1,
    defenderWorkshopLevel = 1,
    defenderGold = 0,
    defenderWarehouseProtection = 0,
    isNpcDefender = false,
    isWarTarget = false,
  } = battleData;

  logger.debug('Processing battle', {
    attackerArmy,
    defenderArmy,
    terrain,
    attackerFormation,
    defenderFormation,
  });

  // Step 1: Calculate base power
  const attackerBasePower = calculateBasePower(attackerArmy);
  const defenderBasePower = calculateBasePower(defenderArmy);

  // Step 2: Apply terrain modifiers
  let attackerPower = applyTerrainModifiers(attackerArmy, terrain, false);
  let defenderPower = applyTerrainModifiers(defenderArmy, terrain, true);

  // Step 3: Apply formation bonuses
  attackerPower = applyFormationBonus(attackerPower, attackerFormation, false, attackerWorkshopLevel);
  defenderPower = applyFormationBonus(defenderPower, defenderFormation, true, defenderWorkshopLevel);

  // Step 4: Apply counter bonuses
  const { attackerBonus, defenderBonus } = calculateCounterBonuses(attackerArmy, defenderArmy);
  attackerPower = Math.floor(attackerPower * attackerBonus);
  defenderPower = Math.floor(defenderPower * defenderBonus);

  // Step 5: Apply position bonus
  attackerPower = applyPositionBonus(attackerPower, false);
  defenderPower = applyPositionBonus(defenderPower, true);

  // Save pre-RNG power for combat log
  const attackerFinalPower = attackerPower;
  const defenderFinalPower = defenderPower;

  // Step 6: Apply RNG variance
  attackerPower = applyRngVariance(attackerPower);
  defenderPower = applyRngVariance(defenderPower);

  // Step 7: Determine winner
  const powerDifference = attackerPower - defenderPower;
  const powerRatio = attackerPower / Math.max(1, defenderPower);

  let result;
  let isDecisiveVictory = false;

  if (powerRatio > 1.5) {
    result = 'attacker_victory';
    isDecisiveVictory = true;
  } else if (powerRatio > 1.0) {
    result = 'attacker_victory';
  } else if (powerRatio < 0.67) {
    result = 'defender_victory';
    isDecisiveVictory = true;
  } else if (powerRatio < 1.0) {
    result = 'defender_victory';
  } else {
    result = 'draw';
  }

  // Step 8: Calculate casualties
  const attackerCasualtyRate = result === 'attacker_victory' ? CASUALTY_RATES.winner :
    result === 'defender_victory' ? CASUALTY_RATES.loser : 0.5;
  const defenderCasualtyRate = result === 'defender_victory' ? CASUALTY_RATES.winner :
    result === 'attacker_victory' ? CASUALTY_RATES.loser : 0.5;

  const attackerCasualties = calculateCasualties(attackerArmy, attackerCasualtyRate);
  const defenderCasualties = calculateCasualties(defenderArmy, defenderCasualtyRate);

  const attackerSurvivors = calculateSurvivors(attackerArmy, attackerCasualties);
  const defenderSurvivors = calculateSurvivors(defenderArmy, defenderCasualties);

  // Step 9: Calculate loot
  let goldLooted = 0;
  if (result === 'attacker_victory' && !isNpcDefender) {
    goldLooted = calculateLoot(defenderGold, defenderWarehouseProtection, isDecisiveVictory);
  }

  // Step 10: Calculate VP rewards
  const territoryChanged = result === 'attacker_victory';
  const vpRewards = calculateVpRewards({
    isAttackerVictory: result === 'attacker_victory',
    isDefenderVictory: result === 'defender_victory',
    territoryChanged,
    attackerCasualties,
    defenderCasualties,
    isWarTarget,
  });

  // Build combat log
  const combatLog = buildCombatLog({
    attackerArmy,
    defenderArmy,
    terrain,
    attackerFormation,
    defenderFormation,
    attackerBasePower,
    defenderBasePower,
    attackerFinalPower,
    defenderFinalPower,
    attackerBonus,
    defenderBonus,
    result,
    attackerCasualties,
    defenderCasualties,
  });

  const battleResult = {
    result,
    isDecisiveVictory,
    territoryChanged,

    attacker: {
      initialPower: attackerBasePower,
      finalPower: attackerFinalPower,
      actualPower: attackerPower,
      casualties: attackerCasualties,
      survivors: attackerSurvivors,
      vpGained: vpRewards.attacker,
      goldLooted,
    },

    defender: {
      initialPower: defenderBasePower,
      finalPower: defenderFinalPower,
      actualPower: defenderPower,
      casualties: defenderCasualties,
      survivors: defenderSurvivors,
      vpGained: vpRewards.defender,
      goldLost: goldLooted,
    },

    combatLog,
    powerRatio: powerRatio.toFixed(2),
  };

  logger.debug('Battle processed', {
    result: battleResult.result,
    powerRatio: battleResult.powerRatio,
    attackerCasualties: attackerCasualties.total,
    defenderCasualties: defenderCasualties.total,
  });

  return battleResult;
}

/**
 * Build detailed combat log for replay
 */
function buildCombatLog(data) {
  const {
    attackerArmy,
    defenderArmy,
    terrain,
    attackerFormation,
    defenderFormation,
    attackerBasePower,
    defenderBasePower,
    attackerFinalPower,
    defenderFinalPower,
    attackerBonus,
    defenderBonus,
    result,
    attackerCasualties,
    defenderCasualties,
  } = data;

  const phases = [
    {
      phase: 'deployment',
      description: 'Armies deployed',
      attacker: { army: attackerArmy, formation: attackerFormation },
      defender: { army: defenderArmy, formation: defenderFormation },
      terrain,
    },
    {
      phase: 'power_calculation',
      description: 'Power calculated',
      attacker: { basePower: attackerBasePower, finalPower: attackerFinalPower },
      defender: { basePower: defenderBasePower, finalPower: defenderFinalPower },
    },
    {
      phase: 'counter_analysis',
      description: 'Counter bonuses applied',
      attacker: { counterBonus: attackerBonus.toFixed(2) },
      defender: { counterBonus: defenderBonus.toFixed(2) },
    },
    {
      phase: 'combat',
      description: 'Battle resolved',
      result,
    },
    {
      phase: 'casualties',
      description: 'Casualties calculated',
      attacker: { casualties: attackerCasualties },
      defender: { casualties: defenderCasualties },
    },
  ];

  return phases;
}

/**
 * Simulate battle outcome for UI preview
 * (Without RNG for consistent preview)
 */
function simulateBattle(attackerArmy, defenderArmy, terrain) {
  const attackerPower = calculateBasePower(attackerArmy);
  const defenderPower = applyTerrainModifiers(defenderArmy, terrain, true);
  const defenderWithPositionBonus = applyPositionBonus(defenderPower, true);

  const ratio = attackerPower / Math.max(1, defenderWithPositionBonus);

  let prediction;
  if (ratio > 1.3) {
    prediction = 'likely_victory';
  } else if (ratio > 1.0) {
    prediction = 'possible_victory';
  } else if (ratio > 0.7) {
    prediction = 'risky';
  } else {
    prediction = 'likely_defeat';
  }

  return {
    attackerPower,
    defenderPower: defenderWithPositionBonus,
    ratio: ratio.toFixed(2),
    prediction,
  };
}

module.exports = {
  calculateBasePower,
  applyTerrainModifiers,
  applyFormationBonus,
  calculateCounterBonuses,
  applyPositionBonus,
  applyRngVariance,
  calculateCasualties,
  calculateSurvivors,
  calculateLoot,
  calculateVpRewards,
  processBattle,
  simulateBattle,
};
