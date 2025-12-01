---
name: CryptoTribes Game Logic Developer
description: Develop and balance game mechanics for CryptoTribes - battles, territories, units, tribes, resources, and real-time systems. Use when implementing gameplay features, balancing formulas, testing game logic, or working with MongoDB schemas. Triggers on "game logic", "battle system", "balance", "territories", "units", "tribes".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, WebSearch
---

# CryptoTribes Game Logic Developer

Expert skill for developing the strategic gameplay systems of CryptoTribes, a 14-day seasonal PvPvE strategy game with real money prizes.

## Project Context

### Tech Stack
- **Backend**: Node.js + Express + MongoDB
- **Real-time**: Socket.io (WebSocket) for live updates
- **Payment**: Stripe integration
- **Auth**: Wallet-based authentication
- **Game Engine**: Custom battle calculation system

### Game Architecture
- **Season Duration**: 14 days per season
- **Players**: 1000 players, 12-player tribes
- **Territories**: 50 territories (5 center, 15 ring, 30 edges)
- **Units**: 4 types (Militia, Spearman, Archer, Cavalry)
- **Buildings**: 5 types (Barracks, Warehouse, Workshop, Market, Headquarters)

### Core Directories
- `models/` - MongoDB schemas (User, Village, Building, Troop, Territory, Tribe, Battle)
- `server/` - Game logic, routes, controllers, services
- `server/gameLogic.js` - Core battle calculations
- `server/payments.js` - Stripe integration
- `spec.md` - Complete game specification with formulas

## When to Use This Skill

Activate this skill when working on:
- Battle system calculations and formulas
- Territory control and NPC defense
- Unit training and army management
- Building upgrade systems
- Resource generation (passive/active)
- Tribal mechanics and coordination
- Victory Points (VP) tracking
- Prize distribution logic
- Game balance and testing
- Real-time WebSocket events
- MongoDB schema design for game data

## Core Game Formulas (from spec.md)

### 1. Battle Power Calculation
```javascript
// Base formula
Power = SUM(unit_count × unit_HP × unit_Damage × counter_bonus × formation_bonus × terrain_bonus)

// Counter bonuses
Cavalry vs Archer: +50% (1.5x)
Archer vs Spearman: +50% (1.5x)
Spearman vs Cavalry: +50% (1.5x)
Militia: neutral (1.0x)

// Terrain modifiers
Castle: +50% defense, +30% HP garrison
Forest: +25% defense, +10% HP spearmen, -25% cavalry
Hills: +25% archer damage, +15% defense, -10% cavalry
River: -50% cavalry, +20% defense, -10% attack
Plains: No modifiers
```

### 2. Casualties Distribution
```javascript
// Winner loses less
Winner_losses = Total_units × 0.4 × (Enemy_power / Winner_power)

// Loser loses more
Loser_losses = Total_units × 0.6
```

### 3. Resource Generation
```javascript
// Passive generation sources
Base_generation = 10 gold/hour
Warehouse_bonus = warehouse_level × 2 gold/hour
Territory_share = territory_generation × 0.5 (if in garrison)

// Total passive income
Hourly_income = Base + Warehouse + SUM(Territory_shares)
```

### 4. Army Size Limits
```javascript
// Dynamic cap based on progress
Max_army = 500 + (Total_building_levels × 10)

// Overcap penalty
If units > Max_army:
  Overcap_units_effectiveness = -10%
  Maintenance_cost = overcap_units × 0.5 gold/hour
```

### 5. VP Generation
```javascript
// Hourly from territories
Center_territory = 100 VP/hour
Ring_territory = 50 VP/hour
Edge_territory = 25 VP/hour

// Battle rewards
Territory_captured = 100 VP (one-time)
Successful_defense = 50 VP
Enemy_killed = 1 VP per unit
```

## Development Workflow

### Step 1: Read Specification
```bash
# Always check spec.md first for requirements
Read spec.md

# Find relevant section
Grep "pattern" spec.md -A 10 -B 5
```

### Step 2: Understand Existing Code
```bash
# Check existing models
Read models/[ModelName].js

# Review game logic
Read server/gameLogic.js

# Check controllers/services
Glob "server/**/*Controller.js"
Glob "server/**/*Service.js"
```

### Step 3: Implement Following Patterns

**MongoDB Schema Pattern:**
```javascript
const mongoose = require('mongoose');

const SchemaName = new mongoose.Schema({
  // Core fields
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Game data
  fieldName: { type: Number, default: 0 },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Indexes for performance
SchemaName.index({ userId: 1, fieldName: 1 });

module.exports = mongoose.model('ModelName', SchemaName);
```

**Battle Calculation Pattern:**
```javascript
function calculateBattlePower(army, formation, terrain) {
  let totalPower = 0;

  for (const [unitType, count] of Object.entries(army)) {
    const unit = UNIT_STATS[unitType];
    let power = count * unit.hp * unit.damage;

    // Apply counter bonuses
    power *= getCounterBonus(unitType, enemyArmy);

    // Apply formation bonus
    power *= getFormationBonus(formation);

    // Apply terrain modifier
    power *= getTerrainModifier(unitType, terrain);

    totalPower += power;
  }

  return totalPower;
}
```

**WebSocket Event Pattern:**
```javascript
// Emit real-time updates
io.to(`tribe-${tribeId}`).emit('territory_captured', {
  territoryId,
  newOwner: tribeId,
  timestamp: Date.now(),
  vpGained: 100
});
```

### Step 4: Balance Testing
```javascript
// Test battle scenarios
const testBattle = (attacker, defender, terrain) => {
  const atkPower = calculateBattlePower(attacker.army, attacker.formation, terrain);
  const defPower = calculateBattlePower(defender.army, defender.formation, terrain);

  console.log('Attacker Power:', atkPower);
  console.log('Defender Power:', defPower);
  console.log('Winner:', atkPower > defPower ? 'Attacker' : 'Defender');
  console.log('Casualties:', calculateCasualties(atkPower, defPower, attacker.army, defender.army));
};
```

### Step 5: Verify Against Spec
- Check formulas match spec.md exactly
- Verify balance (no dominant strategy)
- Test edge cases (0 units, max units, terrain combinations)
- Ensure Risk-to-Earn (units die permanently)

## Game Constants (Reference)

### Unit Stats
```javascript
const UNIT_STATS = {
  militia: { hp: 100, damage: 10, cost: 10, speed: 'medium' },
  spearman: { hp: 120, damage: 15, cost: 25, speed: 'slow' },
  archer: { hp: 80, damage: 20, cost: 30, speed: 'fast' },
  cavalry: { hp: 150, damage: 25, cost: 50, speed: 'very_fast' }
};
```

### Building Levels
```javascript
const BUILDING_MAX_LEVEL = 10;

const UPGRADE_COSTS = {
  barracks: [100, 200, 400, 800, 1500, 2000, 2500, 3000, 3000], // Level 1→10
  warehouse: [80, 150, 300, 600, 1000, 1500, 1800, 2000, 2000],
  workshop: [150, 300, 600, 1200, 2000, 3000, 3500, 4000, 4000],
  market: [100, 200, 400, 800, 1200, 1800, 2000, 2500, 2500],
  headquarters: [50, 100, 200, 400, 700, 1000, 1200, 1500, 1500]
};
```

### Territory Tiers
```javascript
const TERRITORY_TIERS = {
  center: { ids: [1, 2, 3, 4, 5], vp: 100, gold: 100, npc: 'elite' },
  ring: { ids: [6-20], vp: 50, gold: 50, npc: 'strong' },
  edge: { ids: [21-50], vp: 25, gold: 25, npc: 'weak' }
};
```

## Common Tasks & Solutions

### Task: Implement Battle System
1. Read `spec.md` battle formulas (lines 213-258)
2. Check existing `server/gameLogic.js`
3. Implement `calculateBattlePower()` with all modifiers
4. Implement `determineBattleWinner()`
5. Implement `calculateCasualties()`
6. Create Battle model for history
7. Emit WebSocket event `battle_completed`
8. Test with example scenarios from spec

### Task: Add New Unit Type
1. Update `models/Troop.js` with new unit stats
2. Add to `UNIT_STATS` constants
3. Update battle calculations for new unit
4. Add counter relationships (if any)
5. Update training queues in Barracks
6. Test balance against existing units
7. Update spec.md with new unit details

### Task: Territory Control System
1. Create Territory model with owner, garrison, terrain type
2. Implement garrison placement logic
3. Add NPC defense based on tier (center/ring/edge)
4. Implement capture mechanics (battle → ownership transfer)
5. Set up hourly VP generation cron job
6. Emit WebSocket `territory_status_changed`
7. Test PvPvE scenarios

### Task: Balance Testing
1. Create test scenarios in `tests/balance.test.js`
2. Test all counter matchups (cavalry vs archer, etc)
3. Test terrain modifiers on different units
4. Verify no unit has >60% win rate across all scenarios
5. Test economic progression (gold generation vs costs)
6. Verify 14-day timeline achievable
7. Document findings and adjust constants

## Anti-Patterns to Avoid

❌ **Don't**: Hard-code values instead of using constants
✅ **Do**: Use centralized constants for easy balancing

❌ **Don't**: Skip validation (negative units, invalid IDs)
✅ **Do**: Always validate input before calculations

❌ **Don't**: Forget to emit WebSocket events for real-time updates
✅ **Do**: Emit events for all game state changes

❌ **Don't**: Modify spec.md formulas without discussion
✅ **Do**: Follow spec exactly, propose changes separately

❌ **Don't**: Create pay-to-win mechanics
✅ **Do**: Maintain skill > money balance

## Integration Points

### With Frontend
- Expose REST API endpoints in `server/routes/`
- Emit WebSocket events via Socket.io
- Return structured JSON responses
- Include error handling and validation

### With Database
- Use MongoDB transactions for critical operations (battles, transfers)
- Create indexes for performance (userId, territoryId, tribeId)
- Implement cron jobs for passive generation
- Batch updates for efficiency

### With Payment System
- Entry fee collection via Stripe (`server/payments.js`)
- Prize distribution at season end
- Validate wallet addresses
- Track payment history

## Testing Strategy

```javascript
// Unit tests for formulas
describe('Battle System', () => {
  it('should apply counter bonuses correctly', () => {
    const cavalry = { cavalry: 50 };
    const archers = { archer: 30 };
    const power = calculateBattlePower(cavalry, 'offensive', 'plains', archers);
    // Should have 1.5x multiplier
  });

  it('should respect terrain modifiers', () => {
    const cavalry = { cavalry: 50 };
    const power = calculateBattlePower(cavalry, 'balanced', 'forest');
    // Should have -25% penalty in forest
  });
});
```

## Quick Reference Commands

```bash
# Start development server
npm run dev

# Run tests
npm test

# Check MongoDB connection
node server/utils/dbConnection.js

# Create database indexes
node server/utils/createIndexes.js

# Test battle calculations
node tests/testBattle.js

# Monitor resource generation
node tests/testResources.js
```

## Success Criteria

Every implementation should:
1. ✅ Match spec.md formulas exactly
2. ✅ Include proper error handling
3. ✅ Emit WebSocket events for real-time updates
4. ✅ Have MongoDB indexes for performance
5. ✅ Include balance testing
6. ✅ Maintain Risk-to-Earn principle
7. ✅ Support 1000 concurrent players
8. ✅ Follow existing code patterns

## Resources

- **Spec**: `spec.md` - Complete game design document
- **Models**: `models/` - MongoDB schemas
- **Game Logic**: `server/gameLogic.js` - Core calculations
- **Tests**: `tests/` - Balance and integration tests
- **API**: `server/routes/` - REST endpoints

---

**Remember**: This is a competitive strategy game with real money prizes. Balance, fairness, and performance are critical. Always test thoroughly and follow the spec exactly.
