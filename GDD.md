# KINGDOMS: EXTRACTION WARS
## GAME DESIGN DOCUMENT (GDD)
### Season 1 MVP - Version 1.0

---

## TABLE OF CONTENTS

1. [Game Overview](#1-game-overview)
2. [Core Pillars](#2-core-pillars)
3. [Target Audience & Metrics](#3-target-audience--metrics)
4. [Game Loop](#4-game-loop)
5. [Building System](#5-building-system)
6. [Unit System](#6-unit-system)
7. [Combat System](#7-combat-system)
8. [Territory System](#8-territory-system)
9. [Tribe System](#9-tribe-system)
10. [Economy & Resources](#10-economy--resources)
11. [Victory Points (VP)](#11-victory-points-vp)
12. [Seasonal Structure](#12-seasonal-structure)
13. [Prize System](#13-prize-system)
14. [Anti-Snowball Mechanics](#14-anti-snowball-mechanics)
15. [Anti-Cheat & Security](#15-anti-cheat--security)
16. [Technical Requirements](#16-technical-requirements)
17. [MVP Scope](#17-mvp-scope)
18. [Post-Launch Roadmap](#18-post-launch-roadmap)

---

## 1. GAME OVERVIEW

### 1.1 High-Level Concept

**Kingdoms: Extraction Wars** is a browser-based competitive strategy MMO where 12-person tribes battle for territory control over 10-day seasons. Players compete for real money prizes ($25 entry fee, $21,250 prize pool) in a skill-based Risk-to-Earn format.

**Genre**: Browser MMO Strategy / Risk-to-Earn / Competitive Tribal Warfare

**Platform**: Web (desktop & mobile browsers)

**Monetization**: Entry fee ($25 USDT per player per season)

**Core Experience**: "Tribal Wars meets DraftKings" - strategic depth with real stakes

---

### 1.2 Unique Selling Points

1. **Real Money Competition** - $25 entry, $21,250 prize pool (85% distribution)
2. **Tribal Warfare** - 12-person teams, social coordination required
3. **10-Day Seasons** - Fresh start every season, no permanent advantages
4. **Skill-Based** - 80% skill / 20% luck ratio through strategic depth
5. **Anti-Snowball** - Diminishing returns + upkeep costs keep competition alive
6. **Risk-to-Earn** - Units permanently lost in battle, real stakes

---

### 1.3 Core Game Loop (60-minute daily session)

```
1. CHECK IN (5 min)
   ↓ Collect passive resources
   ↓ Check completed upgrades/training
   ↓ Read tribe Discord

2. PLAN (5 min)
   ↓ Review territory map
   ↓ Identify targets
   ↓ Coordinate with tribe

3. EXECUTE (40 min)
   ↓ Launch attacks
   ↓ Capture territories
   ↓ Train units
   ↓ Upgrade buildings

4. FORTIFY (10 min)
   ↓ Redistribute garrisons
   ↓ Set shields
   ↓ Queue next upgrades

5. EXIT
   → Repeat next session
```

---

## 2. CORE PILLARS

### 2.1 Strategic Depth
- **Rock-Paper-Scissors** unit counters (Cavalry > Archer > Spearman > Cavalry)
- **Terrain modifiers** (Forest +25% defense, -25% cavalry effectiveness)
- **Formations** (Offensive, Defensive, Balanced grant 15-20% bonuses)
- **Scouting** (Workshop Lv3+ reveals enemy garrisons)

### 2.2 Social Coordination
- **12-person tribes** with roles (Chieftain, Captains, Warriors)
- **War declarations** require 8/12 votes
- **Shared treasury** for tribe-level strategy
- **Coordinated attacks** needed for center territories (6-8 players)

### 2.3 Economic Balance
- **Diminishing returns** (15 territories = optimal, 20+ = inefficient)
- **Upkeep costs** (20 gold/hr per territory + 1 gold/hr per 10 units)
- **Leader penalties** (Top 3 tribes pay +25-50% upkeep)
- **Underdog bonuses** (Lower-ranked tribes get +25-50% VP generation)

### 2.4 Competitive Integrity
- **Seasonal reset** (fresh start every 10 days)
- **Transparent mechanics** (all formulas visible to players)
- **Anti-cheat** (wallet age verification, behavioral analysis, manual review)
- **Fair matchmaking** (self-organized tribes OR auto-matchmaking option)

---

## 3. TARGET AUDIENCE & METRICS

### 3.1 Target Player Profile

**Primary Audience**:
- Age: 25-40 years old
- Gaming experience: Strategy games (Tribal Wars, Travian, Clash of Clans)
- Crypto familiarity: Intermediate (has wallet, understands USDT)
- Time commitment: 60-90 minutes daily
- Competitive mindset: Willing to pay $25 for skilled competition

**Secondary Audience**:
- Poker/DFS players looking for new skill-based wagering
- Esports fans interested in team competitions
- Crypto natives seeking play-to-earn games

---

### 3.2 Success Metrics

**Season 1 Targets** (200-400 players):
- Registration: 200-400 players
- Day 1 retention: 90%+
- Day 5 retention: 70%+
- Day 10 completion: 55%+
- Average session length: 60+ minutes
- Daily logins: 3-5 per player
- Net revenue: Break-even (after $5K marketing spend)

**Season 3+ Targets** (500-1000 players):
- Registration: 500-1000 players
- Day 10 retention: 60%+
- Net revenue: $5-10K profit per season
- Organic growth: 20%+ season-over-season

**Key Balance Metrics**:
- **Gini Coefficient** (territory inequality): <0.65
- **VP Lead Margin** (1st vs 5th place): <35% on Day 7
- **Unit Diversity**: Each unit type 15-35% of total armies
- **Comeback Rate**: 15%+ of top 5 tribes were rank 8-12 on Day 5

---

## 4. GAME LOOP

### 4.1 Progression Timeline (10 Days)

**Days 1-3: EXPANSION PHASE**
- Capture edge territories (PvE against weak NPC garrisons)
- Upgrade buildings (Barracks Lv3, Warehouse Lv2, Workshop Lv1)
- Train initial army (100-200 units)
- Form tribe identity, establish Discord
- **Intensity**: LOW (learning mechanics)

**Days 4-6: EARLY WARS**
- Fight for ring territories (first PvP battles)
- Upgrade buildings (Barracks Lv5-7, Workshop Lv3 for scouting)
- Army composition optimization (counter-builds)
- Establish dominance or find niche
- **Intensity**: MEDIUM (competitive positioning)

**Days 7-9: TERRITORY WARS**
- Peak activity (most battles per hour)
- Battle for optimal 15-18 territory portfolios
- War declarations against rivals
- Alliances and betrayals
- Max buildings reached (Lv10)
- **Intensity**: HIGH (critical battles)

**Day 10: FINALE**
- Center territory push (coordinated tribal assaults)
- Last-minute VP grabs
- Desperate comebacks or defending leads
- Final battles before season ends 23:59 UTC
- **Intensity**: MAXIMUM (winner decided here)

---

### 4.2 Daily Session Structure

**Early Game Session (Days 1-3)**: 45-60 minutes
1. Collect 200-300 gold (passive generation)
2. Launch 3-5 PvE attacks (capture edges)
3. Start building upgrade (5-10 minute timer)
4. Train 20-40 units (15-30 minute queue)
5. Set personal shield before logout

**Mid Game Session (Days 4-7)**: 60-75 minutes
1. Collect 400-600 gold (passive + territories)
2. Scout enemy garrisons (Workshop Lv3+)
3. Coordinate with tribe (Discord voice chat)
4. Launch 2-3 PvP attacks (strategic targets)
5. Redistribute garrisons (strengthen weak points)
6. Start next building upgrade (30-60 minute timer)

**Late Game Session (Days 8-10)**: 90+ minutes
1. Collect 800-1200 gold (large territory portfolio)
2. Mass attacks (5-10 battles per session)
3. Tribe coordination (war declarations, shared targets)
4. Defensive micro (respond to enemy attacks)
5. VP optimization (capture high-value territories)
6. Shield critical territories

---

## 5. BUILDING SYSTEM

### 5.1 Overview

**Total Buildings**: 3 types (Barracks, Warehouse, Workshop)
**Max Level**: 10 per building
**Upgrade Mechanism**: Spend gold, wait for timer, gain benefit
**Simultaneous Upgrades**: Only 1 building can upgrade at a time
**Total Cost to Max All**: ~22,000 gold
**Total Time to Max All**: ~6-7 days of active play

---

### 5.2 Building #1: BARRACKS

**Purpose**: Train units, unlock advanced unit types

**Progression Table**:
| Level | Cost (Gold) | Time | Unlock | Training Speed | Queue Size |
|-------|-------------|------|--------|----------------|------------|
| 1 | 0 (start) | 0 | Militia only | 60 sec/unit | 10 units |
| 2 | 100 | 2 min | - | 50 sec/unit | 15 units |
| 3 | 200 | 5 min | Spearmen | 45 sec/unit | 20 units |
| 4 | 400 | 10 min | - | 40 sec/unit | 30 units |
| 5 | 800 | 20 min | Archers | 35 sec/unit | 40 units |
| 6 | 1200 | 40 min | - | 30 sec/unit | 50 units |
| 7 | 1500 | 60 min | Cavalry | 25 sec/unit | 60 units |
| 8 | 2000 | 90 min | - | 20 sec/unit | 75 units |
| 9 | 2500 | 120 min | - | 15 sec/unit | 85 units |
| 10 | 3000 | 180 min | All units | 10 sec/unit | 100 units |
| **Total** | **11,700g** | **~8.7 hours** | | | |

**Key Breakpoints**:
- **Level 3**: Spearmen unlock (counter cavalry)
- **Level 5**: Archers unlock (counter spearmen)
- **Level 7**: Cavalry unlock (elite units)
- **Level 10**: 6x faster training (10s vs 60s)

**Strategic Importance**: CRITICAL (gates army composition)

---

### 5.3 Building #2: WAREHOUSE

**Purpose**: Store resources, protect from raids, generate passive income

**Progression Table**:
| Level | Cost (Gold) | Time | Capacity | Protection | Passive Income |
|-------|-------------|------|----------|------------|----------------|
| 1 | 0 (start) | 0 | 1,000g | 0% | 0 g/hr |
| 2 | 80 | 1 min | 2,000g | 5% | 2 g/hr |
| 3 | 150 | 3 min | 3,500g | 10% | 4 g/hr |
| 4 | 300 | 6 min | 5,000g | 15% | 6 g/hr |
| 5 | 600 | 12 min | 7,000g | 20% | 8 g/hr |
| 6 | 1000 | 20 min | 10,000g | 25% | 10 g/hr |
| 7 | 1500 | 30 min | 13,000g | 30% | 12 g/hr |
| 8 | 1800 | 45 min | 16,000g | 35% | 14 g/hr |
| 9 | 2000 | 60 min | 18,000g | 40% | 16 g/hr |
| 10 | 2500 | 90 min | 20,000g | 50% | 20 g/hr |
| **Total** | **9,930g** | **~4.4 hours** | | | |

**Protection Mechanic**:
- When territory is raided, attacker steals resources
- Protection % reduces stolen amount
- Example: Territory has 1000g, Warehouse Lv10 (50% protection) → Attacker steals 500g maximum

**Passive Income**:
- Generates gold every 10 minutes (cron job)
- Stacks with territory income
- Warehouse Lv10 = 20g/hr = 480g/day

**Strategic Importance**: HIGH (economy amplifier, raid defense)

---

### 5.4 Building #3: WORKSHOP

**Purpose**: Unlock formations, enable scouting, tactical advantage

**Progression Table**:
| Level | Cost (Gold) | Time | Unlock |
|-------|-------------|------|--------|
| 1 | 0 (start) | 0 | 3 basic formations |
| 2 | 150 | 3 min | - |
| 3 | 300 | 6 min | **Scouting** (see enemy garrisons) |
| 4 | 600 | 12 min | - |
| 5 | 1200 | 25 min | +5% formation effectiveness |
| 6 | 2000 | 40 min | - |
| 7 | 2500 | 60 min | +10% formation effectiveness |
| 8 | 3000 | 90 min | - |
| 9 | 3500 | 120 min | +15% formation effectiveness |
| 10 | 4000 | 180 min | +20% formation effectiveness |
| **Total** | **17,250g** | **~8.8 hours** | | |

**Formations** (available at Lv1):

1. **OFFENSIVE**
   - +15% damage
   - -10% defense
   - Use: Overwhelming attacks, when you have superior army

2. **DEFENSIVE**
   - +20% defense
   - -5% damage
   - Use: Territory defense, holding key positions

3. **BALANCED**
   - +5% damage
   - +5% defense
   - Use: Default, when enemy composition unknown

**Scouting** (unlocks at Lv3):
- Before attacking, you can see enemy garrison composition
- See exact unit counts (20 Spearmen, 30 Archers, etc.)
- **Critical advantage**: Plan perfect counter-compositions
- Without scouting, attacks are blind (high risk)

**Formation Effectiveness** (Lv5-10):
- Amplifies formation bonuses
- Example: Offensive formation at Lv10 = +15% × 1.2 = +18% damage
- Small but meaningful edge in close battles

**Strategic Importance**: CRITICAL (information advantage, force multiplier)

---

### 5.5 Building Upgrade Strategy

**Optimal Upgrade Order** (meta strategy):
1. **Day 1**: Barracks 1→3 (unlock Spearmen) - 300g, 7 min
2. **Day 2**: Workshop 1→3 (unlock Scouting) - 450g, 9 min
3. **Day 3**: Barracks 3→5 (unlock Archers) - 1200g, 30 min
4. **Day 4**: Warehouse 1→5 (capacity + protection) - 1130g, 22 min
5. **Day 5**: Barracks 5→7 (unlock Cavalry) - 3700g, 90 min
6. **Day 6-7**: Max Workshop (formations +20%) - 13,250g, 7.3 hours
7. **Day 7-8**: Max Barracks (10s training) - 7500g, 6.5 hours
8. **Day 9**: Max Warehouse (50% protection) - 4300g, 2.5 hours

**Total**: ~32,000 gold, ~17 hours (spread across 9 days)

**Reasoning**:
- Rush Workshop Lv3 for scouting (game-changing information)
- Unlock all unit types by Day 5 (army diversity)
- Max Workshop first (20% formation bonus = permanent force multiplier)
- Max Barracks second (fast unit production)
- Warehouse last (protection matters most when you're rich)

---

## 6. UNIT SYSTEM

### 6.1 Overview

**Total Unit Types**: 4 (Militia, Spearman, Archer, Cavalry)
**Counter System**: Rock-Paper-Scissors (+50% damage bonus)
**Supply Cap**: 500 + (Total Building Levels × 10)
- Example: All buildings Lv5 = 500 + (15 × 10) = 650 supply
- Max supply: 500 + (30 × 10) = 800 units

**Army Upkeep**: 1 gold/hour per 10 units
- Example: 200 units = 20 gold/hour maintenance

**Training**: Queue-based (can queue 100 units at Barracks Lv10)
**Losses**: Permanent (no resurrection, units die in battle)

---

### 6.2 Unit Stats & Roles

#### MILITIA (Tier 1: Basic Infantry)

**Cost**: 10 gold
**Training Time**: 60s (Barracks Lv1) → 10s (Barracks Lv10)
**Unlock**: Available from start

**Stats**:
- HP: 100
- Damage: 10
- Speed: Medium
- Range: Melee

**Counters**: None (neutral against all)

**Special Traits**:
- Cheapest unit (10g vs 25-50g)
- No weaknesses or strengths
- Cannon fodder / filler units

**Best Use Cases**:
✓ Early game (Day 1-3) when gold is scarce
✓ PvE farming (edge territories)
✓ Garrison filler (cheap defense)
✓ Mass armies (quantity over quality)

**Worst Use Cases**:
✗ Elite PvP (weak against specialized armies)
✗ Late game (Day 8-10) when everyone has cavalry/archers
✗ Attacking fortified positions

**Strategic Role**: Economic unit, expendable, scales with numbers

---

#### SPEARMAN (Tier 2: Anti-Cavalry Infantry)

**Cost**: 25 gold
**Training Time**: 45s (Barracks Lv3) → 7s (Barracks Lv10)
**Unlock**: Barracks Level 3

**Stats**:
- HP: 120 (+20% vs Militia)
- Damage: 15 (+50% vs Militia)
- Speed: Slow
- Range: Melee

**Counters**:
- ✓ **Strong vs Cavalry** (+50% damage dealt)
- ✗ **Weak vs Archers** (-25% defense, archers kite them)

**Special Traits**:
- Highest HP (tank role)
- Slow movement (can't chase archers)
- Anti-cavalry specialization

**Best Use Cases**:
✓ Defending territories (high HP + defensive formation)
✓ Countering cavalry-heavy armies
✓ Forest terrain (+10% HP bonus from terrain)
✓ Holding key positions (center territories)

**Worst Use Cases**:
✗ Attacking archer-heavy garrisons (get kited)
✗ Fast raids (too slow)
✗ Open plains (no terrain advantage)

**Strategic Role**: Defensive anchor, cavalry deterrent

---

#### ARCHER (Tier 2: Anti-Infantry Ranged)

**Cost**: 30 gold
**Training Time**: 60s (Barracks Lv5) → 10s (Barracks Lv10)
**Unlock**: Barracks Level 5

**Stats**:
- HP: 80 (-20% vs Militia)
- Damage: 20 (+100% vs Militia)
- Speed: Fast
- Range: Ranged (attacks first in battle)

**Counters**:
- ✓ **Strong vs Spearmen** (+50% damage, kiting advantage)
- ✗ **Weak vs Cavalry** (-25% defense, cavalry closes gap quickly)

**Special Traits**:
- Ranged attacks (strikes before melee)
- Fast movement (repositioning, kiting)
- Fragile (low HP)

**Best Use Cases**:
✓ Attacking spearman-heavy garrisons
✓ Hills terrain (+25% damage from elevation)
✓ Hit-and-run tactics (fast speed)
✓ DPS role in mixed armies

**Worst Use Cases**:
✗ Defending against cavalry
✗ Forest terrain (reduced vision)
✗ Frontline tanking (low HP)

**Strategic Role**: Glass cannon DPS, counter-infantry

---

#### CAVALRY (Tier 3: Elite Fast Raiders)

**Cost**: 50 gold (most expensive)
**Training Time**: 90s (Barracks Lv7) → 15s (Barracks Lv10)
**Unlock**: Barracks Level 7

**Stats**:
- HP: 150 (highest)
- Damage: 25 (highest)
- Speed: Very Fast
- Range: Melee (but first strike due to speed)

**Counters**:
- ✓ **Strong vs Archers** (+50% damage, closes gap before archers deal damage)
- ✗ **Weak vs Spearmen** (-25% defense, spears stop cavalry charges)

**Special Traits**:
- Elite stats (150 HP, 25 damage)
- Very fast (first strike initiative)
- Expensive (50g each = 5x militia cost)

**Best Use Cases**:
✓ Hunting archer-heavy armies
✓ Quick raids (speed advantage)
✓ Plains terrain (no penalties)
✓ Decisive battles (elite power)

**Worst Use Cases**:
✗ Attacking spearman garrisons (hard counter)
✗ Forest/hills terrain (-25% effectiveness)
✗ Economic gameplay (too expensive to spam)

**Strategic Role**: Elite strike force, archer hunters, late-game power

---

### 6.3 Counter System (Rock-Paper-Scissors)

```
CAVALRY (50g, 150 HP, 25 DMG)
    ↓ +50% damage
    ↓
ARCHER (30g, 80 HP, 20 DMG)
    ↓ +50% damage
    ↓
SPEARMAN (25g, 120 HP, 15 DMG)
    ↓ +50% damage
    ↓
CAVALRY ← closes the loop

MILITIA (10g, 100 HP, 10 DMG) = NEUTRAL (no counters)
```

**Counter Bonus**: Exactly +50% damage dealt

**Example Calculation**:
- 50 Cavalry vs 100 Archers (equal gold investment: 2500g)
- Cavalry damage with counter: 25 × 1.5 = 37.5 damage per hit
- Cavalry power: 50 × 150 HP × 37.5 DMG = 281,250
- Archer power: 100 × 80 HP × 20 DMG = 160,000
- **Result: Cavalry wins** (counter overcomes 2:1 numbers)

**Why This Works**:
- No dominant strategy (cavalry can't spam vs spearmen)
- Scouting matters (counter-build wins)
- Terrain adds complexity (cavalry weak in forest)
- Unit cost balances power (cavalry 5x militia cost but not 5x power)

---

### 6.4 Army Composition Meta

**Early Game (Days 1-3)**: Militia Spam
- 80% Militia, 20% Spearmen
- Reason: Gold-scarce, PvE targets, cheap filler
- Cost: ~1500g for 100 units

**Mid Game (Days 4-6)**: Balanced Mixed
- 30% Spearmen, 40% Archers, 30% Militia
- Reason: Army diversity, counter flexibility
- Cost: ~3000g for 100 units

**Late Game (Days 7-10)**: Specialized Builds

**A) Cavalry Blitz** (vs archer-heavy enemies)
- 60% Cavalry, 30% Archers, 10% Spearmen
- Cost: ~4200g for 100 units
- Strength: Destroys archer builds
- Weakness: Vulnerable to spear walls

**B) Spear Wall** (vs cavalry-heavy enemies)
- 60% Spearmen, 30% Archers, 10% Militia
- Cost: ~2400g for 100 units
- Strength: Hard counters cavalry
- Weakness: Kited by archers

**C) Archer Mass** (vs spearman-heavy enemies)
- 60% Archers, 30% Cavalry, 10% Militia
- Cost: ~3300g for 100 units
- Strength: Kites spearmen, high DPS
- Weakness: Crushed by cavalry charges

**Universal Counter**: Balanced 33/33/33 split works against all but excels at none

---

## 7. COMBAT SYSTEM

### 7.1 Battle Flow (Async Auto-Resolve)

**Step 1: INITIATION** (5-30 seconds)
- Attacker clicks territory on map
- Selects units from available army
- Chooses formation (Offensive, Defensive, Balanced)
- Confirms attack

**Step 2: QUEUE** (0-60 seconds)
- Attack enters battle queue (Bull.js + Redis)
- If territory under attack, waits for previous battle
- Average wait: 10-20 seconds
- UI shows: "Your attack is #2 in queue, ~15 seconds"

**Step 3: AUTO-RESOLVE** (instant calculation, 5-10 seconds for animation)
- Server calculates battle power (deterministic formula + RNG seed)
- Determines winner
- Calculates casualties (60/40 split)
- Updates database (transaction-based)

**Step 4: RESULTS** (5-10 seconds)
- Animation plays (optional: can skip for speed)
- Shows winner, casualties, loot, VP gained
- If victory: Territory ownership changes
- If defeat: Lost units, no territory change

**Total Battle Time**: 15-60 seconds from click to result

**No Manual Combat**: All battles auto-resolve (fast-paced, mobile-friendly)

---

### 7.2 Battle Power Formula

**Base Formula**:
```javascript
Battle_Power = SUM(
    unit_count ×
    unit_HP ×
    unit_Damage ×
    counter_bonus ×
    formation_bonus ×
    terrain_bonus ×
    position_bonus
)

position_bonus:
- Attacker: 1.0 (no bonus)
- Defender: 1.2 (+20% defensive advantage)
```

**Example Calculation**:

**Attacker**: 50 Cavalry, Offensive formation, attacking Plains territory
- Unit power: 50 units × 150 HP × 25 DMG = 187,500 base
- Counter bonus: Attacking 100 Archers → 1.5x multiplier = 281,250
- Formation bonus: Offensive = 1.15x = 323,437
- Terrain bonus: Plains = 1.0x (no modifier) = 323,437
- Position bonus: Attacker = 1.0x = 323,437
- **Attacker Power: 323,437**

**Defender**: 100 Archers, Defensive formation, defending Plains territory
- Unit power: 100 units × 80 HP × 20 DMG = 160,000 base
- Counter bonus: vs Cavalry → 0.75x (weak to cavalry) = 120,000
- Formation bonus: Defensive = 1.20x = 144,000
- Terrain bonus: Plains = 1.0x = 144,000
- Position bonus: Defender = 1.2x = 172,800
- **Defender Power: 172,800**

**Result**: Attacker wins (323,437 > 172,800)

---

### 7.3 RNG Variance (±10%)

**Purpose**: Add excitement without removing skill

**Implementation**:
- Final power multiplied by random 0.90-1.10
- Deterministic seed (battleId + timestamp)
- Same battle recalculated = same result (no refresh exploits)

**Example**:
- Attacker power: 323,437 × 1.05 (good RNG) = 339,608
- Defender power: 172,800 × 0.95 (bad RNG) = 164,160
- Gap widens from 187% to 207% (attacker still wins)

**Impact**:
- Close battles (50/50) can swing either way (exciting)
- Dominant battles (2:1 power) rarely flip (skill rewarded)
- Average outcome: RNG cancels out over many battles

---

### 7.4 Casualty Distribution

**Winner** (territory captured or defended successfully):
- Loses 40% of units (weighted by unit participation)

**Loser** (failed attack or lost defense):
- Loses 60% of units

**Weighted Casualties**:
- Units that dealt more damage take more casualties
- Example: Cavalry dealt 80% of damage → 80% of cavalry die

**Example**:
- Attacker: 50 Cavalry → Wins → Loses 40% = 20 cavalry die, 30 survive
- Defender: 100 Archers → Loses → Loses 60% = 60 archers die, 40 survive (flee)

**Surviving Defenders**: Return to player's camp, can be redeployed

**Why 60/40 Split**:
- Rewards aggressive play (attackers lose less)
- But not too much (risk still exists)
- Prevents turtling (defending isn't free)

---

### 7.5 Terrain Modifiers

**PLAINS** (~25 territories):
- No modifiers
- Neutral ground
- All units fight normally

**FOREST** (~12 territories):
- +25% defense for defender
- -25% cavalry effectiveness (can't charge through trees)
- +10% HP for spearmen (use trees for cover)
- **Best for**: Defending with spearmen
- **Worst for**: Attacking with cavalry

**HILLS** (~8 territories):
- +25% damage for archers (high ground)
- +15% defense for defender (uphill advantage)
- -10% cavalry effectiveness (can't charge uphill)
- **Best for**: Defending with archers
- **Worst for**: Attacking with cavalry

**CASTLE** (5 center territories, most valuable):
- +50% defense for defender (fortifications)
- +30% HP for garrison (castle walls)
- -20% damage for attackers (siege disadvantage)
- **Requires**: 6-8 coordinated players to capture
- **These are the CENTER territories** (100 VP/hr, 100 gold/hr each)

---

### 7.6 Battle Examples

**Example 1: Counter-Play Wins**

Setup:
- Attacker: 100 Archers (3000g cost), Offensive formation, Plains
- Defender: 50 Spearmen (1250g cost), Defensive formation, Plains

Math:
- Attacker: 100 × 80 × 20 × 1.5 (counter) × 1.15 (offensive) × 1.0 = 276,000
- Defender: 50 × 120 × 15 × 1.0 × 1.20 (defensive) × 1.20 (def bonus) = 129,600

Result: Attacker wins despite defender spending 40% of the gold
Reason: Archers hard counter spearmen (+50% damage)

---

**Example 2: Terrain Saves Defender**

Setup:
- Attacker: 80 Cavalry (4000g), Offensive formation, Forest
- Defender: 60 Spearmen (1500g), Defensive formation, Forest

Math:
- Attacker: 80 × 150 × 25 × 0.5 (counter) × 1.15 × 0.75 (forest penalty) = 129,375
- Defender: 60 × 132 (120 × 1.1 forest HP) × 15 × 1.0 × 1.20 × 1.25 (forest def) × 1.20 = 283,680

Result: Defender wins despite 2.67x gold disadvantage
Reason: Forest nerfs cavalry (-25%), buffs spearmen (+10% HP), defender bonus (+20%)

---

**Example 3: Numbers Overcome Counter**

Setup:
- Attacker: 200 Militia (2000g), Balanced formation, Plains
- Defender: 30 Cavalry (1500g), Balanced formation, Plains

Math:
- Attacker: 200 × 100 × 10 × 1.0 × 1.05 × 1.0 = 210,000
- Defender: 30 × 150 × 25 × 1.0 × 1.05 × 1.20 (def) = 141,750

Result: Attacker wins with cheap spam
Reason: 200 militia (2000g) > 30 cavalry (1500g) when no counter applies

**Takeaway**: Rock-Paper-Scissors works, but overwhelming numbers still matter

---

## 8. TERRITORY SYSTEM

### 8.1 Overview

**Total Territories**: 50
**Ownership**: Tribal (not individual)
**Capture**: Win battle against garrison
**Benefits**: Gold/hour, VP/hour, strategic positioning

**Tiers**:
- **Center** (5 territories): 100 VP/hr, 100 gold/hr
- **Ring** (15 territories): 50 VP/hr, 50 gold/hr
- **Edges** (30 territories): 25 VP/hr, 25 gold/hr

---

### 8.2 Territory Distribution & Map Layout

**Map Structure** (conceptual hexagonal grid):

```
         [CENTER TIER - 5 territories]
              #1  #2  #3
                #4  #5
         (Castle terrain, 100 VP/hr each)

    [RING TIER - 15 territories]
   #6  #7  #8  #9  #10 #11 #12
      #13 #14 #15 #16 #17
         #18 #19 #20
    (Mixed terrain, 50 VP/hr each)

[EDGE TIER - 30 territories]
#21 #22 #23 #24 #25 #26 #27 #28 #29 #30
   #31 #32 #33 #34 #35 #36 #37 #38
      #39 #40 #41 #42 #43 #44
         #45 #46 #47 #48 #49 #50
(Mostly Plains, 25 VP/hr each)
```

**Terrain Distribution**:
- Center (5): All Castle (+50% defense, +30% garrison HP)
- Ring (15): 8 Plains, 4 Forest, 3 Hills
- Edges (30): 17 Plains, 8 Forest, 5 Hills

**Adjacency**: Each territory connects to 2-4 neighbors (hex grid)

---

### 8.3 Territory Economics

**Base Generation** (per hour per territory):
| Tier | VP/hour | Gold/hour | Upkeep | Net Gold |
|------|---------|-----------|--------|----------|
| Center | 100 | 100 | 20 | +80 |
| Ring | 50 | 50 | 20 | +30 |
| Edge | 25 | 25 | 20 | +5 |

**Diminishing Returns** (efficiency penalty):
| Territory Count | Efficiency | Effective Income |
|-----------------|------------|------------------|
| 1-5 territories | 100% | Full value |
| 6-10 territories | 80% | 20% penalty |
| 11-15 territories | 60% | 40% penalty |
| 16-20 territories | 40% | 60% penalty |
| 21+ territories | 20% | 80% penalty |

**Example**:
- 15 territories (5 edges + 10 ring):
  - First 5: (5×25 + 0×50) × 1.0 = 125 gold/hr
  - Next 5: (0×25 + 5×50) × 0.8 = 200 gold/hr
  - Next 5: (0×25 + 5×50) × 0.6 = 150 gold/hr
  - Total: 475 gold/hr
  - Upkeep: 15 × 20 = 300 gold/hr
  - **Net: +175 gold/hr**

- 20 territories (10 edges + 10 ring):
  - Using diminishing returns formula
  - Total income: 550 gold/hr
  - Upkeep: 20 × 20 = 400 gold/hr
  - **Net: +150 gold/hr (LESS than 15 territories!)**

**Optimal Portfolio**: 15-18 territories (sweet spot)

---

### 8.4 Garrison System

**What is Garrison**:
- Units assigned to defend a territory
- Automatically fight when territory is attacked
- Units remain in garrison until reassigned or killed
- Can garrison any tribal territory (if you contribute units)

**Garrison Limits**:
- No maximum (can stack 500 units on 1 territory)
- But inefficient (spreading defenses is better)

**Garrison Management**:
- Drag units from camp → territory (instant)
- Reassign units between territories (instant)
- Withdraw units to camp (instant)
- **Strategic depth**: Where to place 200 units across 15 territories?

**Garrison Contribution & Rewards**:
- Multiple tribe members can garrison same territory
- **VP/Gold distributed proportionally** to each player's garrison contribution

**Distribution Formula**:
```
Player_Income = Territory_Income × (Player_Units / Total_Garrison_Units)
```

**Example**:
- Territory #23 (Ring, 50 VP/hr, 50 gold/hr)
- Player A garrisons 60 units (60%)
- Player B garrisons 30 units (30%)
- Player C garrisons 10 units (10%)
- Total garrison: 100 units

**Rewards**:
- Player A: 50 × 0.60 = **30 VP/hr, 30 gold/hr**
- Player B: 50 × 0.30 = **15 VP/hr, 15 gold/hr**
- Player C: 50 × 0.10 = **5 VP/hr, 5 gold/hr**

**Strategic Implications**:
- Contributing more units = more VP (incentive to garrison)
- But units stuck in garrison can't attack (opportunity cost)
- Balance between offense (capture new territories) and defense (hold current ones)

---

### 8.5 NPC Garrisons (PvE Content)

**Initial State**: All 50 territories start with NPC defenders

**Edge Territories** (30 territories):
- Garrison: 5-15 Militia (random)
- Power: ~5,000-15,000
- Capturable by: 1 player with 30-50 units
- Loot: 100-300 gold
- **Difficulty**: EASY (Day 1 content)

**Ring Territories** (15 territories):
- Garrison: 20-30 mixed units (10 Spearmen, 10 Archers, 5 Militia)
- Power: ~40,000-60,000
- Capturable by: 1 player with 80-120 units OR 2 players coordinating
- Loot: 300-600 gold
- **Difficulty**: MEDIUM (Day 3-4 content)

**Center Territories** (5 territories):
- Garrison: 100 mixed units (30 Spearmen, 40 Archers, 30 Cavalry)
- Power: ~450,000 (with +50% terrain defense = 675,000 effective)
- Capturable by: 6-8 players coordinating (300+ total units)
- Loot: 1000-2000 gold
- **Difficulty**: HARD (Day 7-9 content, requires tribe coordination)

**NPC Refresh**: None (once captured, stays captured)

---

### 8.6 Shield System (MVP Version)

**Personal Shield** (Free, 1 per day):
- Duration: 4 hours
- Cooldown: 24 hours (resets at 00:00 UTC)
- Coverage: 1 territory where you have garrison
- Effect: Territory cannot be attacked while shield active
- Use case: Protect key territory before logging off (overnight)

**How to Use**:
1. Click territory with your garrison
2. Click "Activate Shield"
3. Shield lasts 4 hours
4. Cooldown timer shows next available shield

**Strategic Depth**:
- Which territory to shield? (Center > Ring > Edge)
- Coordinate with tribe (shield different territories, not same one)
- Time shield expiration with online hours (wake up when shield drops)

**Removed from MVP** (Season 2+):
- Territorial Shield (500g, 8h, 1 territory) - gold sink
- Tribal Shield (2000g, 2h, ALL tribal territories) - emergency protection

---

### 8.7 Territory Strategy Guide

**Day 1-2 Strategy**: Grab 5 Edges
- Easy PvE, low upkeep, establish base income
- Net: +25 gold/hr (5 × 25 - 5 × 20)

**Day 3-4 Strategy**: Push to 10 Territories (5 edges + 5 ring)
- Total income: 250 gold/hr (before diminishing returns)
- After diminishing: ~210 gold/hr
- Upkeep: 200 gold/hr
- Net: +10 gold/hr (breaking even)

**Day 5-7 Strategy**: Optimize to 15 Territories (target: 5 ring, 10 edges OR 10 ring, 5 edges)
- Best portfolio: 10 ring + 5 edges
  - Income: 475 gold/hr (with diminishing returns)
  - Upkeep: 300 gold/hr
  - **Net: +175 gold/hr**

**Day 8-10 Strategy**: Fight for 1-2 Center Territories
- 1 Center + 10 Ring + 4 Edges = 15 territories
  - Income: 100 + 300 + 60 = 460 gold/hr (after diminishing)
  - Upkeep: 300 gold/hr
  - **Net: +160 gold/hr + HIGH VP**

**Why Not More?**
- 20 territories = +150 gold/hr (less than 15 territories due to penalties)
- Plus leader penalty (+50% upkeep for top tribe) = net negative
- **Optimal = 15-18 territories, not 25-30**

---

### 8.8 Adaptive Ring System (Admin Configuration)

**Purpose**: Scale map size and difficulty based on player count per season

**Ring Structure** (3-5 rings, admin-configurable):
1. **Center Ring** (5 territories, always present)
   - Terrain: Castle
   - VP/Gold: 100/hr each
   - NPC: Elite difficulty
   - Multiplier: **4x** base value

2. **Inner Ring** (10-20 territories, scales with players)
   - Terrain: Mixed (Plains, Forest, Hills)
   - VP/Gold: 50/hr each
   - NPC: Strong difficulty
   - Multiplier: **2x** base value

3. **Outer Ring** (20-40 territories, scales with players)
   - Terrain: Mostly Plains
   - VP/Gold: 25/hr each
   - NPC: Weak difficulty
   - Multiplier: **1x** base value

4. **Edge Ring** (Optional, for 800+ players)
   - VP/Gold: 10/hr each
   - NPC: Trivial
   - Multiplier: **0.5x** base value

---

**Adaptive Formula**:
```javascript
total_territories = center_count + (ring_count × player_scaling_factor)

player_scaling_factor = max(1, players / 20)
// Example: 200 players = 10x scaling
//          400 players = 20x scaling
//          1000 players = 50x scaling

ring_territories = base_ring_size × player_scaling_factor
```

**Example Configurations**:

**Season 1 (300 players)**:
- Center: 5 territories (100 VP/hr each)
- Inner Ring: 15 territories (50 VP/hr each)
- Outer Ring: 30 territories (25 VP/hr each)
- **Total: 50 territories**

**Season 3 (600 players)**:
- Center: 5 territories (100 VP/hr each)
- Inner Ring: 30 territories (50 VP/hr each)
- Outer Ring: 60 territories (25 VP/hr each)
- **Total: 95 territories**

**Season 5 (1000 players)**:
- Center: 5 territories (100 VP/hr each)
- Inner Ring: 50 territories (50 VP/hr each)
- Outer Ring: 95 territories (25 VP/hr each)
- Edge Ring: 50 territories (10 VP/hr each)
- **Total: 200 territories**

---

**Admin Panel Presets**:

| Preset | Rings | NPC Difficulty | PvP From Ring | Safe Period |
|--------|-------|----------------|---------------|-------------|
| **Casual** | 3 | Easy (-20% NPC power) | Ring 3+ | 72 hours |
| **Competitive** | 4 | Standard | Ring 2+ | 48 hours |
| **Hardcore** | 5 | Hard (+30% NPC power) | Ring 1+ | 24 hours |

**Advanced Mode** (manual configuration):
- Ring count: 3-5
- Territories per ring: Manual input
- NPC power multiplier: 0.5x - 2.0x
- VP/Gold values: Custom (with recommended ranges)
- PvP unlock: Which ring enables player vs player combat

**Balancing Constraints** (prevent admin from breaking game):
- Center must always be 4x-10x more valuable than outer ring
- Total territories must not exceed `players / 2` (avoid ghost towns)
- NPC power cannot exceed 5x standard (must remain capturable)

**Why This System?**:
- ✅ Scales seamlessly from 200 to 2000 players
- ✅ Maintains territory scarcity (always competition)
- ✅ Admin can tune difficulty without code changes
- ✅ Prevents one-size-fits-all problems (casual vs hardcore seasons)

---

## 9. TRIBE SYSTEM

### 9.1 Overview

**Tribe Size**: 12 players maximum
**Roles**: Chieftain (1), Captains (2), Warriors (9)
**Formation**: Hybrid (self-organized OR auto-matchmaking)
**Ownership**: Territories owned by tribe (not individual)
**Victory**: Tribal VP determines winners

---

### 9.2 Tribe Formation (Registration Phase)

**Timeline**: 7 days before season start

**Option A: Self-Organized Tribes** (Recommended Path)
1. Player creates tribe (names it, sets tag)
2. Generates invite link
3. Shares link on Discord, Twitter, with friends
4. 11 other players join via link
5. Tribe locks when 12/12 slots filled
6. Season starts with full tribe

**Benefits**:
- Fair (you choose teammates)
- Creates community (Discord servers, pre-season strategy)
- Higher skill expression (coordinated teams)

**Drawbacks**:
- Barrier to entry (need to recruit 11 people)
- Socially awkward (what if you have no friends?)

---

**Option B: Auto-Matchmaking** (Accessibility Path)
1. Player registers as "solo"
2. System queues solo players
3. When 12 solo players accumulate → tribe forms automatically
4. Random name assigned (can be changed by Chieftain)
5. Season starts with random tribe

**Benefits**:
- Accessible (no social requirement)
- Fast (instant tribe)
- Good for testing/casual players

**Drawbacks**:
- RNG teammates (skill variance)
- No pre-season bonding
- Lower coordination

---

**Hybrid Implementation** (Chosen Approach):
- Players can create/join self-organized tribes
- OR register solo for auto-matchmaking
- Two separate queues (organized tribes vs solo queue tribes)
- **Separate leaderboards?** TBD (might separate in Season 2 if needed)

**Recommendation**: Start with hybrid, monitor if solo queue tribes get crushed by organized tribes. If >30% skill gap, consider separate brackets in Season 2.

---

### 9.3 Tribe Roles & Permissions

**CHIEFTAIN** (1 person):
- Appoints/demotes Captains
- Kicks inactive members (requires 8/12 vote OR <2 logins in 48 hours)
- Declares war (requires 8/12 member vote)
- Manages tribe treasury (withdraw for tribe expenses)
- Sets tribe strategy (marks map targets)
- **Cannot**: Remove members without vote, steal treasury

**CAPTAINS** (2 people):
- Coordinate squad attacks (organize 5-6 players)
- View extended stats (all member activity logs)
- Suggest war declarations (Chieftain finalizes)
- Assist with strategy (planning sessions)
- **Cannot**: Kick members, withdraw treasury

**WARRIORS** (9 people):
- Participate in battles
- Vote on important decisions (war declarations, member kicks)
- Contribute to tribe treasury (voluntary donations)
- **Cannot**: Kick others, declare war unilaterally

---

### 9.4 Tribe Treasury

**Purpose**: Pooled resources for tribe-level strategy

**Income Sources**:
1. **Voluntary Contributions**
   - Any member can donate gold
   - Example: "I'm donating 500g to help fund our center push"

2. **Territory Tax** (10% of territorial income)
   - If tribe controls territory generating 50 gold/hr
   - 5 gold/hr goes to treasury automatically
   - 45 gold/hr split among contributors

3. **Battle Loot** (20% of captured resources)
   - Win battle, loot 1000 gold from enemy
   - 200g → treasury, 800g → attacker

**Spending** (Chieftain manages):
- Buy shields (Territorial/Tribal shields in Season 2+)
- Fund struggling members ("Nikita lost 100 units, let's give him 500g to rebuild")
- Coordinated attacks ("Everyone train 20 cavalry, treasury covers 50% of cost")

**Transparency**: All treasury transactions logged, visible to all members

**Prevents Abuse**: Chieftain can't withdraw for personal gain (requires Captain approval for withdrawals >1000g)

---

### 9.5 War Declarations

**Mechanic**: Formal war = +50% VP for battles against target tribe

**Process**:
1. Chieftain proposes war against Tribe X
2. Tribe votes (requires 8/12 "yes" votes = 67% majority)
3. If passed, war declared for 48 hours
4. **Target tribe receives notification**: "Tribe Y has declared war on you!"
5. All battles against Tribe X grant +50% VP (for the declaring tribe)
6. After 48h, war expires (can re-declare with another vote)

**Counter-Declarations**:
- Target tribe can declare counter-war
- If both tribes declare war on each other: **Both sides get +50% VP** from battles
- Creates high-stakes mutual conflict

**Strategic Purpose**:
- Incentivize attacking the leader (gang up on #1 tribe)
- Create narrative ("We're at war with Red Tribe!")
- Encourage coordination (focus fire on common enemy)
- Counter-declarations reward mutual aggression

**Example**:
- Normal battle vs enemy: Win = +100 VP
- One-sided war declaration: Attacker gets +150 VP (+50%)
- Mutual war (both declared): Both sides get +150 VP per win
- Over 10 battles: 500 bonus VP (can swing leaderboard)

**Balancing Rules**:
- Limit: 1 active war declaration at a time per tribe
- War bonuses DO NOT stack beyond +50% (no +100% from double-declaring)
- If Tribe A declares war on B, then Tribe C declares war on A → only latest war gets bonus

---

### 9.6 Member Management

**Kicking Inactive Members**:

**Option A: Vote-Based Kick** (Democratic)
- Any member proposes kick ("Kick Player X for inactivity")
- Requires 8/12 votes (67% majority)
- If passed, player removed from tribe
- Kicked player loses access to tribal territories (garrisons auto-withdraw to their camp)

**Option B: Auto-Kick** (Automated)
- If member has <2 logins in 48 hours = flagged as inactive
- Chieftain can kick without vote (emergency power)
- Prevents dead weight (AFKers hurting tribe)

**Chosen Approach**: Hybrid
- Auto-kick if <1 login in 72 hours (extreme inactivity)
- Vote-based kick for less severe cases

**No Recruitment Mid-Season**:
- Once season starts, tribe locked at current size
- If member kicked, tribe proceeds with 11/12 (disadvantage)
- **Reasoning**: Prevents collusion (can't recruit ringers mid-season)

---

### 9.7 Tribe Communication

**In-Game Tools** (MVP):
- Tribe chat (text messages, 100 message history)
- Chieftain map markers (pin enemy targets)
- Attack notifications ("Player X is attacking Territory #23!")
- Victory/defeat announcements

**External Tools** (Recommended):
- Discord server (voice chat, strategy planning)
- Spreadsheets (territory assignments, army compositions)
- Bots (VP tracking, battle alerts)

**Integration** (Post-MVP):
- Discord webhook integration (battle results → Discord channel)
- API for custom bots (community-built tools)

---

## 10. ECONOMY & RESOURCES

### 10.1 Resource Types (MVP: Gold Only)

**Gold**:
- Primary currency
- Used for: Building upgrades, unit training, (future: shields, trade)
- Cannot be traded between players in MVP (prevents multi-accounting exploits)

**Crystals / Premium Currency**: NOT IN MVP
- Removed for Season 1 (simplicity)
- Future: Cosmetics, convenience (not pay-to-win)

---

### 10.2 Gold Generation Sources

**1. BASE GENERATION** (Passive, all players):
- 10 gold/hour (always active)
- Reason: Prevents total bankruptcy, always something to do

**2. WAREHOUSE PASSIVE INCOME**:
- Scales with Warehouse level
- Lv1: 0 g/hr → Lv10: 20 g/hr
- Total: 0-20 gold/hour
- Reason: Rewards building upgrades

**3. TERRITORIAL INCOME** (Primary income source):
- Each territory generates gold/hour
- Shared among garrison contributors (50% split)
- Subject to diminishing returns + upkeep

**Example (Day 7 portfolio)**:
- 15 territories (10 ring, 5 edges)
- Total income: 475 g/hr (after diminishing returns)
- Upkeep: 300 g/hr (20 per territory)
- **Net: +175 g/hr**

**4. BATTLE LOOT**:
- Win attack: Steal 20-40% of enemy resources (capped by Warehouse protection)
- Example: Enemy has 2000g, Warehouse Lv10 (50% protection) → Steal max 1000g
- Actual loot: 20% = 200g (if normal battle)
- **One-time reward per battle**

**Total Gold Generation (Active Player Day 7)**:
- Base: 10 g/hr
- Warehouse Lv10: 20 g/hr
- Territories (15): 175 g/hr net
- Battles (5 per day): 1000-2000g one-time
- **Hourly**: 205 g/hr = 4920g/day passive
- **Daily total**: ~6000-7000g/day (active player)

**Total Gold Needed (Day 1-10)**:
- Max all buildings: ~22,000g
- Train 500 units: ~15,000g (mixed composition)
- Replace casualties: ~8,000g (lost in battles)
- **Total: ~45,000g over 10 days** = 4,500g/day average
- **Feasibility**: ✓ Possible with active play

---

### 10.3 Gold Sinks (Where Gold Gets Spent)

**1. Building Upgrades**: 22,000g total (one-time)
**2. Unit Training**: 15,000-25,000g (depending on composition)
**3. Battle Casualties**: 5,000-15,000g (replace lost units)
**4. Army Upkeep**: 1 gold/hr per 10 units
   - Example: 200 units = 20 gold/hr = 480g/day = 4800g over 10 days
**5. Territory Upkeep**: 20 gold/hr per territory
   - Example: 15 territories = 300 gold/hr = 7200g/day = 72,000g over 10 days

**Wait, upkeep is 72,000g but income is only 45,000g?**

**Correction**: Upkeep is paid from INCOME, not from player balance
- Territory generates 50 g/hr, upkeep is 20 g/hr → Net +30 g/hr deposited to player
- Player never "pays" upkeep manually, it's auto-deducted
- **Balance equation**: Income (with upkeep) ≈ Spending (units + buildings)

**Revised Balance**:
- Net income over 10 days: ~45,000g (after all upkeep)
- Spending on units + buildings: ~40,000g
- **Net profit: +5,000g** (ends season with surplus = working as intended)

---

### 10.4 Economic Progression Timeline

**Day 1**: Starting Gold = 500
- Spend: 300g (buildings + 30 militia)
- Income: 50g/day (base + no territories yet)
- **End balance: 250g**

**Day 2**: Starting 250g
- Capture 5 edges (500g loot from PvE)
- Spend: 800g (more upgrades + units)
- Income: 150g/day (base + 5 territories)
- **End balance: 100g**

**Day 3**: Starting 100g
- Spend: 1500g (Barracks 5, train archers)
- Income: 200g/day (8 territories)
- Loot: 1000g (battles)
- **End balance: -200g → Borrow from future income OR slow down**

**Days 4-6**: Stabilization
- Income: 300-400g/day (12-15 territories)
- Spending: 3000g (max buildings)
- Loot: 2000-3000g (PvP battles)
- **End balance: ~1000g** (cashflow positive)

**Days 7-10**: Endgame
- Income: 400-500g/day (15 territories + max warehouse)
- Spending: 2000-4000g (replace casualties, train elites)
- Loot: 3000-5000g (intense PvP)
- **End balance: 3000-5000g** (rich, can spam units)

**Economic Curve**: Tight early (Days 1-3), comfortable mid (Days 4-6), abundant late (Days 7-10)

---

### 10.5 Economic Strategy (Meta)

**Strategy A: Economic Boom** (Greedy)
- Rush Warehouse Lv10 (passive income)
- Capture 15+ territories early (maximize income)
- Risk: Weak military, vulnerable to aggression
- Reward: By Day 6, swimming in gold

**Strategy B: Military Rush** (Aggressive)
- Rush Barracks Lv7 (unlock cavalry)
- Train 100+ units Day 3-4
- Attack constantly (loot > passive income)
- Risk: If attacks fail, bankrupt
- Reward: Snowball off enemy loot

**Strategy C: Balanced** (Safe, recommended for new players)
- Upgrade buildings evenly
- Maintain 60-80 units
- Capture 10-12 territories (don't overextend)
- Risk: Mediocre at everything
- Reward: Consistent, reliable

**Optimal (Tryhard Meta)**:
1. Days 1-2: Economic boom (grab 5 edges fast, upgrade Warehouse to 5)
2. Days 3-4: Military spike (Barracks 7, train 40 cavalry + 60 archers)
3. Days 5-7: Aggressive expansion (attack Ring territories, maximize to 15)
4. Days 8-10: Consolidate (defend territories, optimize army)

---

## 11. VICTORY POINTS (VP)

### 11.1 Overview

**Purpose**: Determine season winners

**Calculation**: Tribal VP = sum of all sources

**Leaderboard**: Real-time ranking (updates every 10 minutes)

**Prize Distribution**: Based on final VP on Day 10 at 23:59 UTC

---

### 11.2 VP Sources

**PRIMARY: Territorial Control** (80% of total VP)

Hourly generation:
- **Center**: 100 VP/hour per territory
- **Ring**: 50 VP/hour per territory
- **Edge**: 25 VP/hour per territory

**Diminishing Returns Applied** (same formula as gold):
- 1-5 territories: 100% efficiency
- 6-10: 80%
- 11-15: 60%
- 16-20: 40%
- 21+: 20%

**Example VP Generation**:
- 15 territories (5 edges, 10 ring) held for 24 hours:
  - First 5 edges: 5 × 25 × 1.0 × 24 = 3,000 VP
  - Next 5 ring: 5 × 50 × 0.8 × 24 = 4,800 VP
  - Next 5 ring: 5 × 50 × 0.6 × 24 = 3,600 VP
  - **Total: 11,400 VP in 24 hours**

---

**SECONDARY: Battle Rewards** (15% of total VP)

Per battle:
- **Territory captured**: +100 VP (one-time)
- **Enemy unit killed**: +1 VP per unit
- **Successful defense**: +50 VP

Example:
- Attack territory, win
- Kill 60 enemy units
- Capture territory
- **Total: 100 + 60 + 0 = 160 VP**

If war declaration active (+50% bonus):
- **Total: 240 VP**

---

**TERTIARY: Milestones** (5% of total VP)

One-time bonuses:
- First territory captured: +50 VP
- First center territory captured: +500 VP
- Max any building to Lv10: +50 VP per building
- Win 10 battles: +100 VP
- Win 50 battles: +500 VP

**Total from milestones: ~1000-2000 VP per player** (small but meaningful)

---

### 11.3 VP Calculation (10-Day Season)

**Hypothetical Tribe "Alpha"** (Strong performance):

**Territorial VP** (held 15 territories average for 240 hours):
- 15 territories × 45 VP/hr average (mixed) × 240 hours = 162,000 VP

**Battle VP** (120 battles over 10 days):
- 80 victories × 150 VP average = 12,000 VP
- 40 defeats × 30 VP (kill some enemies) = 1,200 VP
- Total: 13,200 VP

**Milestone VP**: 1,500 VP (various achievements)

**Total VP: 176,700 VP**

---

**Hypothetical Tribe "Underdog"** (Struggling, but active):

**Territorial VP** (held 8 territories average):
- 8 territories × 35 VP/hr × 240 hours × 1.25 (underdog bonus) = 84,000 VP

**Battle VP** (80 battles, 40% win rate):
- 32 victories × 140 VP = 4,480 VP
- 48 defeats × 25 VP = 1,200 VP
- Total: 5,680 VP

**Milestone VP**: 800 VP

**Underdog Bonus Applied**: +50% on territorial VP (already included above)

**Total VP: 90,480 VP**

**Gap**: 176,700 vs 90,480 = 1.95:1 ratio (strong tribe has ~2x VP of weak tribe)

**Is this fair?** Yes, rewards skill/activity but underdog bonuses keep it competitive

---

### 11.4 Underdog Bonuses (Anti-Snowball)

**Purpose**: Help lower-ranked tribes catch up

**Mechanic**: Rank-based VP generation multipliers

| Rank | Bonus | Effect |
|------|-------|--------|
| 1-3 | 0% | Normal VP generation |
| 4-6 | +15% | 1.15x VP from territories |
| 7-10 | +25% | 1.25x VP from territories |
| 11+ | +50% | 1.5x VP from territories |

**Does NOT apply to**:
- Battle VP (only territorial)
- Milestone VP

**Example**:
- Rank 8 tribe holds 1 Ring territory (50 VP/hr base)
- With +25% underdog bonus: 50 × 1.25 = 62.5 VP/hr
- Over 24 hours: 1500 VP instead of 1200 VP
- **+300 VP per day per territory** (significant over 10 days)

**Balancing**:
- Rank 1 tribe: 15 territories @ 100% = X VP
- Rank 10 tribe: 8 territories @ 125% = 0.83X VP
- Gap: 1.2:1 (manageable, comeback possible)

**Without underdog bonuses**:
- Gap would be 1.87:1 (much harder to catch up)

---

### 11.5 VP Projections (Leaderboard Simulation)

**Estimated Final VP** (Day 10, 23:59 UTC):

| Rank | Tribe Name | Est. VP | Territories (avg) | Win Rate |
|------|------------|---------|-------------------|----------|
| 1 | Alpha | 185,000 | 18 | 75% |
| 2 | Beta | 172,000 | 16 | 70% |
| 3 | Gamma | 158,000 | 15 | 68% |
| 4 | Delta | 135,000 | 13 | 60% |
| 5 | Epsilon | 122,000 | 12 | 58% |
| 6 | Zeta | 108,000 | 10 | 52% |
| 7 | Eta | 95,000 | 9 | 48% |
| 8 | Theta | 82,000 | 8 | 45% |

**VP Gap Analysis**:
- 1st vs 3rd: 185K vs 158K = 17% gap (close race!)
- 1st vs 5th: 185K vs 122K = 51% gap (leader pulls ahead but not insurmountable)
- 3rd vs 8th: 158K vs 82K = 93% gap (clear skill tiers)

**Comeback Potential**:
- Can 5th place catch 3rd in final 3 days?
  - Gap: 36,000 VP
  - 3 days = 72 hours
  - Need +500 VP/hr advantage
  - Possible if: Capture 2 center territories (200 VP/hr) + win 20 battles (3000 VP)
  - **Verdict: Unlikely but POSSIBLE** (keeps hope alive)

---

## 12. SEASONAL STRUCTURE

### 12.1 Season Timeline (10 Days)

**Pre-Season** (7 days before):
- Tribe registration opens
- Players form tribes or join solo queue
- Marketing campaign (Twitter, Discord, influencers)
- Entry fees collected ($25 USDT per player)

**Season Start** (Day 1, Monday 00:00 UTC):
- All territories spawn with NPC garrisons
- All players start with 500 gold, 0 units
- Season officially begins

**Days 1-10**: Active gameplay (see progression timeline in section 4.1)

**Season End** (Day 10, Sunday 23:59 UTC):
- All attacks freeze at 23:50 UTC (10-minute warning)
- Final VP tallied at 23:59:59 UTC
- Leaderboard locks

**Post-Season** (3 days):
- Winners announced (Day 11, 00:00 UTC)
- Prize distribution (48 hours, via USDT to wallets)
- Post-mortem stats published (top battles, MVP players, interesting stats)
- Break period (players rest, devs fix bugs, prepare Season 2)

**Next Season Start**: Day 14 (next Monday 00:00 UTC)

---

### 12.2 Daily Intensity Curve

**Goal**: Each day should feel unique and progressively more intense

| Day | Phase | Focus | Intensity | Key Activities |
|-----|-------|-------|-----------|----------------|
| 1 | Expansion | Land grab | ⭐ LOW | PvE farming, capture 5 edges |
| 2 | Expansion | Building | ⭐ LOW | Upgrade Barracks/Workshop, train 50 units |
| 3 | Early Wars | First blood | ⭐⭐ MEDIUM | First PvP battles, capture ring territories |
| 4 | Early Wars | Positioning | ⭐⭐ MEDIUM | Establish tribal dominance, scout enemies |
| 5 | Territory Wars | Consolidation | ⭐⭐⭐ HIGH | Optimize to 15 territories, max buildings |
| 6 | Territory Wars | Conflict | ⭐⭐⭐ HIGH | War declarations, intense PvP |
| 7 | Territory Wars | Peak activity | ⭐⭐⭐⭐ VERY HIGH | Most battles per day, alliances form |
| 8 | Center Rush | Elite battles | ⭐⭐⭐⭐ VERY HIGH | First center captures, coordinated assaults |
| 9 | Center Rush | Desperation | ⭐⭐⭐⭐⭐ MAXIMUM | Last chance to catch up, all-in attacks |
| 10 | Finale | Winner decided | ⭐⭐⭐⭐⭐ MAXIMUM | Final VP grabs, defending leads |

---

### 12.3 Key Events (MVP: 5 Events)

**Cut from 14 daily events → 5 key events** (saves 2 weeks dev time)

**Event #1: "GOLD RUSH"** (Day 1)
- All territories generate +100% gold for 24 hours
- PvE enemies drop +50% loot
- **Purpose**: Help new players build economy fast
- **Impact**: Everyone reaches ~1500g by end of Day 1 (enough for early upgrades)

**Event #2: "FOG OF WAR"** (Day 3)
- Cannot see enemy garrisons (scouting disabled)
- Attacks are blind (high risk)
- **Purpose**: Shake up meta, rewards calculated risk-taking
- **Impact**: Some players gamble and win big, others lose armies

**Event #3: "RAID BOSS - DRAGON"** (Day 5)
- Neutral boss spawns on random center territory
- HP: 10,000 | Damage: 100 per attacking unit
- Requires 6-8 coordinated players to kill
- Reward: 5,000 gold + 500 VP (split among top 3 damage dealers)
- **Purpose**: Force tribal coordination, PvE break from PvP
- **Impact**: Tribes that coordinate well get massive reward

**Event #4: "CENTER RUSH"** (Day 8)
- Center territories grant +200% VP (300 VP/hr instead of 100)
- All shields disabled on center territories
- **Purpose**: Focus attention on high-value targets
- **Impact**: Massive battles for center, leader changes hands

**Event #5: "ARMAGEDDON"** (Day 10)
- Center territories grant +500% VP (600 VP/hr)
- All tribes get +50% to all stats (offense, defense, HP, damage)
- **Purpose**: Explosive finale, comeback mechanics
- **Impact**: Final 24 hours decide winner

**Removed Events** (Season 2+):
- Diplomatic Day, Betrayal, Black Market, Plague, Earthquake, Mercenary Day, Final Stand, etc.
- **Reasoning**: Each event = 2-3 days dev time + balance testing, too much for MVP

---

### 12.4 Season Reward Tiers

**Based on VP rank at season end**

**Tribal Prizes** (Top 5 tribes):
- 1st place: $8,750 (12 players = $729 each)
- 2nd place: $1,500 (12 players = $125 each)
- 3rd place: $1,500 (12 players = $125 each)
- 4th place: $500 (12 players = $42 each)
- 5th place: $500 (12 players = $42 each)
- **Total**: $12,750 (60% of prize pool)

**Individual Prizes** (Top performers, 5 categories):
- War Hero (Most enemy kills): 1st $200, 2nd $130, 3rd $70
- Empire Builder (Most buildings maxed): 1st $200, 2nd $130, 3rd $70
- Economic Master (Most gold earned): 1st $200, 2nd $130, 3rd $70
- Survivor (Highest win rate): 1st $200, 2nd $130, 3rd $70
- Support Legend (Most assists/shared victories): 1st $200, 2nd $130, 3rd $70
- **Total**: $2,000 (9.4% of prize pool)

**Participation Rewards**:
- Complete 7+ days: $3 return (50% of entry fee)
- Complete 10 days + 10 battles: $5 return
- **Eligible**: 50-60% of players (~200 players × $4 avg = $800)

**Total Distributed**: $12,750 + $2,000 + $800 = $15,550 (73% of prize pool)

**Remaining**: $21,250 - $15,550 = $5,700
- **Allocation**: Add to 1st place tribal prize
- **New 1st place**: $8,750 + $5,700 = $14,450 for winning tribe

**1st Place Per Player**: $14,450 / 12 = **$1,204 per player** (48.2x ROI!)

**Adjusted Structure** (Winner-Takes-Most to prevent collusion)

---

## 13. PRIZE SYSTEM

### 13.1 Prize Pool Economics

**Entry Fee**: $25 USDT per player
**Target Players**: 300 (Season 1 realistic), 500-1000 (Season 2+)
**Gross Revenue**: 300 × $25 = $7,500

**Rake**: 15% = $1,125 (platform profit)
**Prize Pool**: 85% = $6,375

**Prize Distribution**:
- 60% Tribal ($3,825)
- 30% Individual ($1,912)
- 10% Participation ($637)

---

### 13.2 Tribal Prize Distribution (60% = $3,825)

| Rank | Prize | Per Player (÷12) | ROI |
|------|-------|------------------|-----|
| 1st | $2,100 | $175 | 7.0x |
| 2nd | $900 | $75 | 3.0x |
| 3rd | $525 | $44 | 1.76x |
| 4th | $200 | $17 | 0.68x |
| 5th | $100 | $8 | 0.32x |

**Why Winner-Takes-Most**:
- 1st place gets 55% of tribal prizes ($2,100 / $3,825)
- 2nd-3rd combined get 37% ($1,425)
- 4th-5th get consolation prizes
- **Prevents collusion**: Betraying ally for 1st vs 2nd = +$1,200 (huge incentive)

---

### 13.3 Individual Prize Distribution (30% = $1,912)

**5 Categories** × ~$382 per category:

**Category A: War Hero** (Most enemy units killed)
- 1st: $200
- 2nd: $120
- 3rd: $60
- **Total**: $380

*Repeat for categories B, C, D, E* (same payout structure):
- **B**: Empire Builder (Most buildings maxed)
- **C**: Economic Master (Most gold earned)
- **D**: Survivor (Highest win rate, min 20 battles)
- **E**: Support Legend (Most assists in tribal victories)

**Total Individual**: 5 categories × $380 = $1,900

---

### 13.4 Participation Rewards (10% = $637)

**Goal**: Reduce feel-bad moments, reward engagement

**Tier 1: Bronze** (Play 7+ days, complete 5+ battles)
- Reward: $3 (12% of entry back)
- Eligible: ~50% of players (150 players)
- Cost: 150 × $3 = $450

**Tier 2: Silver** (Play 10 days, complete 10+ battles)
- Reward: $5 (20% of entry back)
- Eligible: ~25% of players (75 players)
- Additional cost: 75 × $2 = $150 (on top of Bronze)

**Tier 3: Gold** (Play 10 days, 20+ battles, max 1 building)
- Reward: $8 (32% of entry back)
- Eligible: ~10% of players (30 players)
- Additional cost: 30 × $3 = $90

**Total Participation Cost**: $450 + $150 + $90 = $690

**Covers 50%+ of players** (~150-180 people get something back)

---

### 13.5 Expected Value Analysis

**For Average Player** (random placement):
- Chance of top 5 tribe: 5/25 = 20% (assuming 25 tribes of 300 players)
- Expected tribal prize: 0.20 × $44 (avg of top 5) = $8.80
- Chance of individual category top 3: 3/300 = 1%
- Expected individual prize: 0.01 × $130 = $1.30
- Chance of participation reward: 50%
- Expected participation: 0.50 × $4 = $2.00
- **Total Expected Value: $12.10**

**Net EV**: $12.10 - $25 = **-$12.90** (negative EV for average player)

**For Top 20% Skilled Player**:
- Chance of top 5 tribe: 60% (self-organized with good players)
- Expected tribal prize: 0.60 × $60 (weighted avg) = $36
- Chance of individual top 3: 5%
- Expected individual: 0.05 × $130 = $6.50
- Participation reward: $5 (guaranteed)
- **Total Expected Value: $47.50**

**Net EV**: $47.50 - $25 = **+$22.50** (positive EV for skilled players)

**This is GOOD**: Rewards skill, feels fair, top players profit over time

---

### 13.6 Payment Flow

**Entry Fee Collection** (Pre-Season, 7 days before):
1. Player registers for season
2. Connects wallet (MetaMask, WalletConnect)
3. Sends $25 USDT to game contract
4. Transaction confirmed → Player registered
5. Non-refundable (stated clearly in TOS)

**Wallet Requirements** (Anti-Sybil):
- Wallet age: 90+ days old
- Transaction history: 10+ on-chain transactions
- Check via blockchain API (Etherscan, etc.)

**Prize Distribution** (Post-Season, within 48 hours):
1. Season ends Day 10 at 23:59 UTC
2. Manual review of top 3 tribes (check for multi-accounting)
3. If clean, USDT sent to registered wallets (automated script)
4. Winners notified via email + in-game notification
5. Unclaimed prizes returned to treasury after 30 days

**Payment Processor**:
- Stripe for USD (if players prefer)
- Direct USDT transfers (preferred, lower fees)
- Coinbase Commerce (optional)

**Tax Compliance**:
- Winners receive 1099 forms (if >$600 won, US players)
- International players responsible for own taxes
- Clear TOS: "You are responsible for tax reporting"

---

## 14. ANTI-SNOWBALL MECHANICS

### 14.1 The Snowball Problem

**Without anti-snowball**:
- Tribe captures 10 territories Day 2
- Earns 500 gold/hour
- Trains 200 units by Day 4
- Steamrolls everyone
- By Day 6, controls 25 territories
- Game is over, losers quit

**Goal**: Keep competition alive until Day 10

---

### 14.2 Mechanic #1: Diminishing Returns

**Formula**: Territory efficiency drops with quantity

| Territory Count | Efficiency | Rationale |
|----------------|------------|-----------|
| 1-5 | 100% | Full value (early expansion) |
| 6-10 | 80% | Slight penalty (overextending) |
| 11-15 | 60% | Moderate penalty (logistics strain) |
| 16-20 | 40% | Heavy penalty (spread thin) |
| 21+ | 20% | Extreme penalty (unsustainable) |

**Effect**:
- Holding 15 territories is optimal (~$175 gold/hr net)
- Holding 20 territories gives LESS income (~$150 gold/hr net)
- **Natural soft cap at 15-18 territories**

**Why This Works**:
- Leader can't just "grab everything and win"
- Optimal strategy = quality over quantity
- Losing tribes can still compete (8-10 territories is viable)

---

### 14.3 Mechanic #2: Upkeep Costs

**Base Upkeep**: 20 gold/hour per territory

**Army Upkeep**: 1 gold/hour per 10 units
- Example: 200 units = 20 gold/hour additional

**Combined Effect**:
- 15 territories + 200 units = 320 gold/hour upkeep
- Income: 475 gold/hour (before upkeep)
- **Net: 155 gold/hour**

**Larger Armies Drain Economy**:
- 500 units = 50 gold/hour upkeep
- If income is only 200 gold/hour → Bleeding 50/hour
- **Forces strategic choices**: Can't maintain max army + max territories forever

---

### 14.4 Mechanic #3: Leader Penalties

**Rank-Based Upkeep Multiplier**:

| Rank | Penalty | Effect |
|------|---------|--------|
| 1st | +50% upkeep | 15 territories = 300 × 1.5 = 450 gold/hr upkeep |
| 2nd | +25% upkeep | 15 territories = 300 × 1.25 = 375 gold/hr |
| 3rd | +10% upkeep | 15 territories = 300 × 1.10 = 330 gold/hr |
| 4th+ | No penalty | Normal upkeep |

**Example**:
- Rank 1 tribe: 18 territories
  - Income: 550 gold/hr (with diminishing returns)
  - Upkeep: 360 × 1.5 = 540 gold/hr
  - **Net: +10 gold/hr** (barely profitable!)

**Effect**:
- Leader must fight constantly to maintain income (attack for loot)
- OR downsize to 15 territories (more efficient)
- **Prevents runaway snowball**

---

### 14.5 Mechanic #4: Underdog Bonuses

**VP Generation Multipliers**:

| Rank | Bonus | Example (8 territories) |
|------|-------|-------------------------|
| 1-3 | 0% | 200 VP/hr |
| 4-6 | +15% | 230 VP/hr |
| 7-10 | +25% | 250 VP/hr |
| 11+ | +50% | 300 VP/hr |

**Effect**:
- Rank 10 tribe with 8 territories generates 250 VP/hr
- Rank 1 tribe with 15 territories generates 450 VP/hr (after diminishing returns)
- Ratio: 1.8:1 (manageable, not insurmountable)

**Without underdog bonuses**:
- Ratio would be 2.8:1 (much harder to catch up)

---

### 14.6 Mechanic #5: War Declarations

**+50% VP for battles against declared enemy**

**Use Case**: Gang up on the leader
- Rank 2-5 tribes all declare war on Rank 1
- Every battle vs Rank 1 grants +50% VP
- Rank 1 faces coordinated attacks from multiple tribes
- **Incentivizes cooperation against leader**

**Example**:
- Rank 1 tribe loses 5 territories to coordinated attacks
- Attackers gain: 5 × 100 VP (capture) × 1.5 (war bonus) = 750 VP each
- Rank 1 loses: 500 VP/hr (5 territories) = 12,000 VP over 24 hours
- **Gap closes by 13,000 VP per tribe**

---

### 14.7 Mechanic #6: Center Territory PvPvE

**Center territories start with Elite NPC garrisons**

**Day 1-5**: Impossible to capture solo
- NPC garrison: 100 mixed units (~450,000 power)
- With terrain (+50% defense): ~675,000 effective power
- Requires 6-8 coordinated players

**Effect**:
- Early game leader can't rush center
- Everyone fights over edges/ring first
- Center becomes relevant Day 6-8 (when tribes are ready)
- **Delays snowball by 5-6 days**

---

### 14.8 Combined Effect Simulation

**Scenario**: Rank 1 vs Rank 8 on Day 7

**Rank 1 Tribe**:
- Territories: 18
- Income: 550 gold/hr (after diminishing returns)
- Upkeep: 540 gold/hr (with leader penalty)
- Net income: +10 gold/hr
- VP generation: 450 VP/hr

**Rank 8 Tribe**:
- Territories: 8
- Income: 280 gold/hr
- Upkeep: 160 gold/hr
- Net income: +120 gold/hr (MORE than leader!)
- VP generation: 250 VP/hr (with underdog bonus)

**VP Gap**: 450 vs 250 = 1.8:1 ratio

**Economic Gap**: -10 g/hr vs +120 g/hr = **Underdog is richer!**

**Can Rank 8 catch up?**
- Over 72 hours (Days 7-10):
  - Rank 1 generates: 450 × 72 = 32,400 VP
  - Rank 8 generates: 250 × 72 = 18,000 VP
  - Gap widens by: 14,400 VP
- BUT Rank 8 can:
  - Declare war on Rank 1 (+50% VP on attacks)
  - Capture 1 center territory (2400 VP over 24 hours)
  - Win 20 battles (3000 VP)
  - **Close gap by ~8,000 VP** (still behind but competitive)

**Verdict**: Anti-snowball works, but leader still wins if they play well. Comebacks are POSSIBLE but require skill + coordination.

---

## 15. ANTI-CHEAT & SECURITY

### 15.1 Threat Model

**Attack #1: Multi-Accounting** (CRITICAL)
- One person creates 12 accounts
- Forms a tribe with self
- All accounts farm resources, funnel to main
- Wins 1st place easily

**Profitability**: $300 entry → $2,100 prize = 7x ROI (even after splitting across 12 accounts)

---

**Attack #2: Collusion** (HIGH)
- Two tribes agree to avoid each other
- Both stomp other tribes
- Guarantee 1st + 2nd place
- Split prizes

**Profitability**: $2,100 + $900 = $3,000 for 24 players = $125 each (5x ROI with zero risk)

---

**Attack #3: Botting** (MEDIUM)
- Automated scripts farm territories 24/7
- Perfect timing on all actions
- No human limitations (sleep, fatigue)

**Advantage**: 30-50% more efficient than humans

---

**Attack #4: Resource Duplication** (CRITICAL)
- Exploit race conditions
- Duplicate gold via concurrent requests
- Infinite resources

**Impact**: Economy collapses, game unplayable

---

### 15.2 Defense Layer 1: Wallet Age Verification

**Requirement**: Wallet must be 90+ days old with 10+ transactions

**Check**:
- Query blockchain (Etherscan API, Alchemy, etc.)
- Get wallet creation date (first transaction)
- Get transaction count
- If fails: "Your wallet does not meet requirements. Minimum 90 days old and 10+ transactions."

**Effectiveness**:
- Blocks 80-90% of casual multi-accounters
- Costs $0 to implement (blockchain data is public)
- Cannot be bypassed without buying aged wallets ($10-20 each)

**Weakness**:
- Determined cheaters buy aged wallets ($120 for 12 wallets)
- Still profitable ($300 entry + $120 wallets = $420 cost → $2100 prize = 5x ROI)

**Verdict**: Good first layer, not sufficient alone

---

### 15.3 Defense Layer 2: Behavioral Analysis

**Metrics Tracked** (per account):
- Login times (timestamp patterns)
- Action timing (upgrade at 10:00:01, attack at 10:00:03 = 2 second gap)
- Movement patterns (always attacks same sequence of territories)
- Session duration (always exactly 60 minutes)
- IP addresses (same IP for multiple accounts)
- Browser fingerprints (same device ID)

**Flags**:
- If 2+ accounts have >80% identical patterns → Flag for review
- If 12 accounts login within 5 minutes every day → Flag
- If tribe has 6+ flagged accounts → Manual review

**ML Model** (Post-MVP):
- Train on known multi-accounters
- Predict probability of account being multi (0-100%)
- Threshold: >70% = flag for review

**Effectiveness**:
- Detects 60-70% of multi-accounters (if they're sloppy)
- 30-40% false positive rate (legitimate coordinated tribes look similar)
- Requires manual review (can't auto-ban)

**Verdict**: Useful second layer, catches obvious cases

---

### 15.4 Defense Layer 3: Manual Review (Winners)

**Process**:
1. Season ends Day 10 at 23:59 UTC
2. Top 5 tribes flagged for review
3. Admin checks:
   - Behavioral patterns (Layer 2 flags)
   - Battle logs (do any accounts always attack together?)
   - Communication logs (are they coordinating in-game chat?)
   - Wallet links (any shared transaction history?)
4. If suspicious, delay prize distribution pending investigation
5. If confirmed multi-accounting, disqualify tribe + ban accounts

**Manual Review Criteria**:
- 4+ accounts with identical login times (within 1 minute) for >50% of sessions
- 6+ accounts from same IP address
- Battle patterns where accounts always attack sequentially (Account A → B → C like clockwork)
- Zero tribe communication (no in-game chat = suspicious for coordinated team)

**Effectiveness**:
- 80-90% detection rate (human pattern recognition beats bots)
- Low false positive rate (only review top 5 tribes = 60 accounts)
- Time cost: 2-3 hours per season (acceptable)

**Verdict**: Essential final layer, protects prize integrity

---

### 15.5 Defense Layer 4: Community Reporting

**Feature**: "Report Multi-Accounting" button

**Process**:
1. Player suspects Tribe X of multi-accounting
2. Submits report with evidence (screenshots, observations)
3. Admin reviews report
4. If confirmed, tribe disqualified + reporter gets $50 bounty

**Bounty**: $50 per confirmed report (capped at 3 per player per season)

**Effectiveness**:
- Crowdsources detection
- Incentivizes honesty (profitable to report cheaters)
- Creates deterrent (cheaters know community is watching)

**Weakness**:
- False reports (salty losers reporting winners)
- Admin time cost (review every report)

**Verdict**: Useful supplement, community self-policing

---

### 15.6 Defense Layer 5: Economic Design

**Make Multi-Accounting Less Profitable**:

**Change A**: Adjust prize structure (Winner-Takes-Most)
- Old: 1st ($2100) + 2nd ($900) = $3000 for collusion
- New: 1st ($2100), 2nd ($900), but if caught → $0 + lifetime ban
- Risk-adjusted: $3000 × 0.7 (30% chance caught) = $2100 EV (less attractive)

**Change B**: Require Tribal Activity
- If tribe has <3 active chatters (never use in-game chat) → Flagged
- Multi-accounter controlling 12 accounts can't fake realistic conversations
- **Detection heuristic**: Legitimate tribes chat 50+ messages/day, multi-accounters chat 0

**Change C**: KYC for Large Prizes (Future)
- If prize >$500, require ID verification
- 1 ID = 1 account (enforcement)
- **Trade-off**: Reduces anonymity (bad for crypto ethos)

**Verdict**: Economic disincentives help but don't fully solve

---

### 15.7 Defense Layer 6: Race Condition Prevention

**Problem**: Concurrent requests duplicate resources

**Solution**: Optimistic Locking + Transactions

**Example** (Building Upgrade):
```javascript
// Before upgrade
const user = await User.findById(userId);
if (user.gold < cost) return "Insufficient gold";

// Atomic update with version check
const result = await User.updateOne(
  {
    _id: userId,
    gold: { $gte: cost },
    version: user.version
  },
  {
    $inc: { gold: -cost, version: 1 },
    $set: { buildingUpgrading: true }
  }
);

if (result.modifiedCount === 0) {
  return "Update failed (concurrent request or insufficient gold)";
}
```

**Key**: `version` field increments on every update. If another request changes user data, version doesn't match → update fails.

**MongoDB Transactions** (for multi-document updates):
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // 1. Deduct attacker units
  await User.updateOne({ _id: attackerId }, { $inc: { army: -attackArmy } }, { session });

  // 2. Create battle record
  await Battle.create([battleData], { session });

  // 3. Update territory ownership
  await Territory.updateOne({ id: territoryId }, { ownerId: attackerId }, { session });

  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

**Effectiveness**: 100% (eliminates race conditions)

**Verdict**: MANDATORY for MVP, non-negotiable

---

### 15.8 Security Checklist

**Pre-Launch**:
- [ ] Wallet age verification implemented (90+ days, 10+ txns)
- [ ] Behavioral tracking active (login times, IPs, fingerprints)
- [ ] Optimistic locking on all resource updates
- [ ] MongoDB transactions for battles, territory captures
- [ ] Battle queue system (no concurrent attacks on same territory)
- [ ] Rate limiting (100 actions/hour per player)
- [ ] Manual review process defined (who, when, criteria)
- [ ] Community reporting feature (with $50 bounty)

**Post-Launch Monitoring**:
- [ ] Daily review of behavioral flags (check for patterns)
- [ ] Weekly audit of top tribes (ensure fair play)
- [ ] Community reports triaged within 24 hours
- [ ] Prize distribution delayed 48 hours (time for review)

---

## 16. TECHNICAL REQUIREMENTS

### 16.1 Tech Stack

**Backend**:
- **Runtime**: Node.js 18+ (LTS)
- **Framework**: Express.js 4.x
- **Database**: MongoDB 6.x + Mongoose ODM 7.x
- **Queue**: Bull.js (Redis-backed job queue for battles)
- **Cron**: AWS EventBridge OR node-cron (for VP generation, resource updates)
- **WebSocket**: REST + Polling (10-second intervals) for MVP
  - Socket.io (for Season 2+, if needed)

**Frontend**:
- **Framework**: React 18 + Vite
- **State Management**: Zustand OR Context API
- **Wallet**: wagmi + RainbowKit (wallet connection)
- **Map**: Canvas API (50 territory nodes, simple circles/hexes)
- **Styling**: Tailwind CSS
- **Build**: Vite (fast dev server)

**Infrastructure**:
- **Hosting**: VPS (DigitalOcean, Linode, or AWS EC2)
- **Database**: MongoDB Atlas (cloud) OR self-hosted MongoDB
- **Cache**: Redis 7.x (for queue, future caching)
- **CDN**: Cloudflare (static assets, DDoS protection)
- **Monitoring**: Winston (logging) + Sentry (error tracking)

**Payment**:
- **USDT**: Direct wallet transfers (Web3.js / Ethers.js)
- **USD**: Stripe (optional, if players prefer fiat)

---

### 16.2 System Architecture

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  React + Vite + Canvas (Map) + RainbowKit (Wallet) │
└────────────────┬────────────────────────────────────┘
                 │ REST API (polling every 10s)
┌────────────────▼────────────────────────────────────┐
│                  API LAYER                          │
│  Express.js Routes + Middleware (Auth, Validation)  │
└────────┬──────────────────────┬─────────────────────┘
         │                      │
         ▼                      ▼
┌─────────────────┐    ┌────────────────────────────┐
│  GAME SERVICES  │    │   BATTLE QUEUE (Bull.js)   │
│  - Combat       │    │   Redis-backed jobs        │
│  - Resources    │    │   Sequential processing    │
│  - Territory    │    └────────────────────────────┘
│  - VP           │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────────────┐
│              DATABASE (MongoDB)                     │
│  Collections: Users, Tribes, Territories, Battles   │
│  Transactions: Battles, Territory Captures          │
└─────────────────────────────────────────────────────┘
         ▲
         │ Cron Jobs (every 10 min)
┌────────┴────────────────────────────────────────────┐
│           SCHEDULED JOBS (AWS EventBridge)          │
│  - VP Generation (hourly)                           │
│  - Resource Generation (every 10 min)               │
│  - Building/Training Completion (every 10 sec)      │
└─────────────────────────────────────────────────────┘
```

---

### 16.3 Database Schema (Simplified)

**User Collection**:
```javascript
{
  _id: ObjectId,
  walletAddress: String (unique, indexed),
  username: String,
  tribeId: ObjectId (ref: Tribe),
  gold: Number,
  army: {
    militia: Number,
    spearman: Number,
    archer: Number,
    cavalry: Number
  },
  buildings: {
    barracks: { level: Number, upgrading: Boolean, endTime: Date },
    warehouse: { level: Number, upgrading: Boolean, endTime: Date },
    workshop: { level: Number, upgrading: Boolean, endTime: Date }
  },
  trainingQueue: [
    { unitType: String, count: Number, endTime: Date }
  ],
  lastActive: Date,
  createdAt: Date,
  version: Number (for optimistic locking)
}
```

**Tribe Collection**:
```javascript
{
  _id: ObjectId,
  name: String (unique),
  tag: String (unique, 2-5 chars),
  chieftainId: ObjectId (ref: User),
  captains: [ObjectId] (refs: User, max 2),
  members: [
    { userId: ObjectId, role: String, joinedAt: Date }
  ],
  treasury: { gold: Number },
  totalVP: Number,
  territoriesControlled: [Number], // array of territory IDs
  warTarget: ObjectId (ref: Tribe, nullable),
  warUntil: Date (nullable),
  seasonId: Number,
  createdAt: Date
}
```

**Territory Collection**:
```javascript
{
  _id: ObjectId,
  territoryId: Number (1-50, unique),
  name: String,
  tier: String (enum: 'center', 'ring', 'edge'),
  terrain: String (enum: 'plains', 'forest', 'hills'),
  position: { x: Number, y: Number }, // for map rendering
  ownerId: ObjectId (ref: Tribe, nullable),
  garrison: {
    militia: Number,
    spearman: Number,
    archer: Number,
    cavalry: Number
  },
  garrisonContributors: [
    { userId: ObjectId, units: { militia: Number, ... } }
  ],
  npcGarrison: { militia: Number, spearman: Number, ... }, // if not captured yet
  goldPerHour: Number,
  vpPerHour: Number,
  shieldUntil: Date (nullable),
  capturedAt: Date (nullable),
  updatedAt: Date
}
```

**Battle Collection** (History Log):
```javascript
{
  _id: ObjectId,
  attackerId: ObjectId (ref: User),
  defenderId: ObjectId (ref: User, nullable for NPC),
  territoryId: Number,
  attackerArmy: { militia: Number, ... },
  defenderArmy: { militia: Number, ... },
  attackerFormation: String,
  defenderFormation: String,
  terrain: String,
  attackerPower: Number,
  defenderPower: Number,
  winnerId: ObjectId (ref: User),
  casualties: {
    attacker: { militia: Number, ... },
    defender: { militia: Number, ... }
  },
  loot: { gold: Number },
  vpGained: Number,
  timestamp: Date,
  rngSeed: String (for deterministic replays)
}
```

---

### 16.4 API Endpoints (Core Routes)

**Authentication**:
- `POST /api/auth/connect` - Connect wallet, verify signature
- `POST /api/auth/logout` - Logout (clear session)

**User**:
- `GET /api/user/me` - Get current user data
- `GET /api/user/:id` - Get public user profile
- `PUT /api/user/me` - Update username (optional)

**Buildings**:
- `POST /api/buildings/:type/upgrade` - Upgrade building (barracks, warehouse, workshop)
- `GET /api/buildings` - Get all building statuses (levels, timers)

**Units**:
- `POST /api/units/train` - Train units (queue)
- `GET /api/units` - Get army + training queue

**Territories**:
- `GET /api/territories` - List all 50 territories (with owners, garrisons)
- `GET /api/territories/:id` - Get territory details
- `POST /api/territories/:id/attack` - Attack territory (queues battle)
- `POST /api/territories/:id/garrison` - Assign units to garrison
- `POST /api/territories/:id/shield` - Activate personal shield

**Tribes**:
- `POST /api/tribes/create` - Create new tribe
- `POST /api/tribes/:id/join` - Join tribe (via invite)
- `GET /api/tribes/:id` - Get tribe details
- `POST /api/tribes/:id/kick` - Kick member (requires vote)
- `POST /api/tribes/:id/war` - Declare war (requires vote)
- `POST /api/tribes/:id/donate` - Donate gold to treasury

**Battles**:
- `GET /api/battles` - Get battle history (paginated)
- `GET /api/battles/:id` - Get battle details

**Leaderboard**:
- `GET /api/leaderboard` - Get tribal VP rankings

**Admin** (Internal):
- `POST /api/admin/review/:userId` - Flag account for review
- `POST /api/admin/ban/:userId` - Ban account
- `GET /api/admin/flags` - Get behavioral flags

---

### 16.5 Performance Requirements

**Target Metrics** (Season 1: 300 players):

| Metric | Target | Measurement |
|--------|--------|-------------|
| API Response (p95) | <100ms | Load testing (Artillery) |
| Battle Calculation | <50ms | Unit tests (benchmark) |
| Page Load | <2 seconds | Lighthouse |
| Concurrent Users | 200-300 | Stress testing |
| Database Queries | <20ms avg | MongoDB profiler |
| Uptime | 99%+ | Monitoring (UptimeRobot) |
| Error Rate | <0.5% | Sentry alerts |

**Scalability Path**:
- Season 1-3 (300-500 players): Single $100/mo VPS + MongoDB Atlas (shared cluster)
- Season 4-6 (500-1000 players): Add Redis cache ($20/mo), upgrade to $200/mo VPS
- Season 7+ (1000+ players): Load balancer + 3 API servers, MongoDB replica set

---

### 16.6 Development Timeline (MVP)

**Phase 1: Foundation** (Week 1-2, 14 days):
- Database schemas (Users, Tribes, Territories, Battles) - 3 days
- Express API structure + middleware - 2 days
- Wallet authentication (Web3 integration) - 3 days
- Frontend skeleton (React + routing) - 3 days
- Basic UI (login, map placeholder) - 3 days

**Phase 2: Core Economy** (Week 3-4, 14 days):
- Resource management service (gold, generation) - 2 days
- Building system (3 buildings, upgrade logic) - 5 days
- Cron jobs (building completion, resource gen) - 3 days
- Building UI (click to upgrade, timers) - 4 days

**Phase 3: Combat Core** (Week 5-7, 21 days):
- Unit training system (4 types, queue) - 4 days
- Combat service (battle power formula, casualties) - 5 days
- Battle queue (Bull.js, Redis setup) - 3 days
- Territory capture mechanics - 3 days
- Battle UI (select units, see results) - 4 days
- Unit tests for combat (100% coverage) - 2 days

**Phase 4: Tribes & Competition** (Week 8-9, 14 days):
- Tribe system (create, join, roles) - 4 days
- Treasury + voting (war declarations, kicks) - 2 days
- VP system (hourly generation, cron) - 3 days
- Leaderboard (real-time rankings) - 2 days
- Tribe UI (member list, chat, coordination) - 3 days

**Phase 5: Payment & Security** (Week 10-11, 14 days):
- Stripe integration (entry fees) - 3 days
- USDT wallet transfers (prize distribution) - 2 days
- Security hardening (transactions, race conditions) - 4 days
- Manual review dashboard (admin tools) - 2 days
- Load testing (Artillery, 300 concurrent users) - 3 days

**Phase 6: Polish & Launch** (Week 12-13, 14 days):
- Map visualization (Canvas, 50 territories) - 4 days
- Mobile responsiveness - 2 days
- Alpha testing (50 players, 3-day mini-season) - 3 days
- Bug fixes from alpha - 3 days
- Deployment + monitoring setup - 2 days

**TOTAL: 13 weeks (91 days) = ~3 months**

**Assumptions**:
- Solo dev working 40 hours/week (full-time)
- Familiar with MERN stack (no learning curve)
- No major scope changes mid-development

**Reality Check**:
- First-time game dev: Add 30% = 4 months
- Part-time (20 hr/week): Double timeline = 6 months
- Unexpected issues: Add 2-4 weeks buffer

**Realistic MVP Timeline: 4-5 months**

---

## 17. MVP SCOPE

### 17.1 What's IN MVP (Season 1)

**Core Systems**:
- ✅ Wallet-based authentication (MetaMask, WalletConnect)
- ✅ 3 buildings (Barracks, Warehouse, Workshop) with 10 levels each
- ✅ 4 unit types (Militia, Spearman, Archer, Cavalry) with rock-paper-scissors counters
- ✅ Combat system (auto-resolve with power formula, casualties, loot)
- ✅ 50 territories (3 tiers, 3 terrain types)
- ✅ Garrison system (assign units to defend territories)
- ✅ Tribe system (12-person, roles, treasury, voting)
- ✅ VP system (hourly generation, battle rewards, underdog bonuses)
- ✅ Leaderboard (tribal rankings only)
- ✅ Personal shields (4h, 1/day, free)
- ✅ Payment system (Stripe + USDT for entry/prizes)
- ✅ 5 key events (Gold Rush, Fog of War, Raid Boss, Center Rush, Armageddon)
- ✅ Anti-snowball (diminishing returns, upkeep, leader penalties)
- ✅ Anti-cheat (wallet age, behavioral analysis, manual review)

**Total Development Time**: 3-4 months (solo dev, full-time)

---

### 17.2 What's OUT of MVP (Season 2+)

**Removed to Save Time**:
- ❌ Unit veterancy system (Regular → Veteran → Elite → Legendary)
  - **Reason**: Conflicts with seasonal reset, adds 1 week dev time
  - **Future**: Season 3+ with cross-season progression

- ❌ Tech tree (post-building research)
  - **Reason**: Saves 1 week dev time, content not needed for 10-day seasons
  - **Future**: Season 2 (add after validating core loop)

- ❌ Market building (player-to-player trading)
  - **Reason**: No clear use case, enables multi-accounting exploits
  - **Future**: Maybe never (direct transfers simpler if needed)

- ❌ Headquarters building (analytics, map info)
  - **Reason**: QoL only, players will use external tools anyway
  - **Future**: Season 3+ as premium feature

- ❌ Advanced formations (Flanking, Ambush, Counter, Turtle)
  - **Reason**: 3 basic formations sufficient for strategy depth
  - **Future**: Season 2 if players master basics

- ❌ Territorial/Tribal shields (gold-based shields)
  - **Reason**: Personal shields cover core use case
  - **Future**: Season 2 as gold sinks

- ❌ Individual leaderboards (5 categories)
  - **Reason**: Adds complexity, small prizes ($60-200)
  - **Future**: Season 2, keep only "MVP Award"

- ❌ 9 daily events (Plague, Earthquake, Black Market, etc.)
  - **Reason**: Each event = 2-3 days dev time, saves 2 weeks total
  - **Future**: Season 2-3, add 1-2 events per season

- ❌ WebSockets (real-time updates)
  - **Reason**: REST + polling sufficient for 300 players
  - **Future**: Season 4+ if scale demands it

**Total Time Saved**: 5-6 weeks (40% faster to launch)

---

### 17.3 MVP Feature Comparison

| Feature | Full Spec | MVP | Rationale |
|---------|-----------|-----|-----------|
| Buildings | 5 types | 3 types | Market + HQ not essential |
| Unit Veterancy | 4 tiers | None | Conflicts with reset |
| Tech Tree | 6 branches | None | Content for Season 2 |
| Formations | 7 types | 3 types | Basic 3 sufficient |
| Terrain Types | 5 types | 3 types | Simpler balance |
| Shield Types | 3 types | 1 type | Core coverage preserved |
| Daily Events | 14 events | 5 events | Key events only |
| Leaderboards | Tribal + 5 individual | Tribal only | Focus on team competition |
| Season Length | 14 days | 10 days | Better retention |
| Real-time Updates | WebSocket | REST polling | Sufficient for MVP |

**Core Experience Preserved**: 90%+

---

## 18. POST-LAUNCH ROADMAP

### Season 2 Additions (If Season 1 Successful)

**New Features** (pick 2-3):
1. **Tech Tree** (post-building progression)
   - Adds depth for Days 7-10
   - 3 branches per building
   - Dev time: 1 week

2. **Advanced Formations** (4 new formations)
   - Flanking, Ambush, Counter, Turtle
   - Unlocked via Workshop levels
   - Dev time: 3 days

3. **Territorial/Tribal Shields** (gold sinks)
   - 500g for 8-hour shield (1 territory)
   - 2000g for 2-hour shield (all tribal territories)
   - Dev time: 2 days

4. **2-3 New Daily Events**
   - Plague, Black Market, Diplomatic Day
   - Dev time: 4-6 days

5. **Individual Leaderboards** (5 categories)
   - War Hero, Empire Builder, Economic Master, Survivor, Support Legend
   - Dev time: 3 days

**Balance Adjustments** (based on Season 1 data):
- Tune unit costs/stats (if cavalry too strong, nerf 5%)
- Adjust diminishing returns curve (if 15 territories still too dominant)
- Modify VP generation rates (if center territories too valuable)
- Fine-tune upkeep costs (if leaders still snowball)

---

### Season 3+ Vision

**Major Features**:
1. **Unit Veterancy** (cross-season progression)
   - Units carry over XP between seasons (but not raw stats)
   - Cosmetic upgrades (golden armor for veterans)
   - Max +20% power (not +50% as originally spec'd)

2. **Multiple Maps** (variety)
   - Alternate map layouts (different territory positions)
   - Seasonal themes (winter map, desert map)

3. **NFT Integration** (optional)
   - Territory ownership NFTs (hold between seasons for bonus)
   - Tribe banner NFTs (cosmetic prestige)

4. **Mobile App** (iOS/Android)
   - Native apps for better UX
   - Push notifications for battles

5. **Spectator Mode** (streaming)
   - Watch battles live
   - Replay system
   - Leaderboard tracking

6. **DAO Governance** (community-driven)
   - Players vote on balance changes
   - Propose new features
   - Season themes/events

---

### Long-Term Goals (12-24 Months)

**Scale Targets**:
- 5,000-10,000 players per season
- Multiple concurrent seasons (different entry fees: $10 casual, $50 hardcore, $500 pro)
- Regional seasons (NA, EU, Asia)

**Revenue Projections**:
- Season 10: 2,000 players × $25 × 15% = $7,500 profit
- Season 20: 5,000 players × $30 × 15% = $22,500 profit
- Season 30: 10,000 players × $35 × 15% = $52,500 profit

**Team Growth**:
- Hire 1 full-time dev (Season 3-4)
- Hire 1 game designer (Season 6-8)
- Hire 1 community manager (Season 10+)

---

## APPENDIX

### A. Glossary

**VP**: Victory Points - primary metric for determining winners
**Garrison**: Units assigned to defend a territory
**Formation**: Tactical stance (Offensive, Defensive, Balanced) granting bonuses
**Terrain**: Territory type (Plains, Forest, Hills) modifying battle effectiveness
**Counter**: Unit advantage (Cavalry > Archer > Spearman > Cavalry)
**Diminishing Returns**: Efficiency penalty for holding 6+ territories
**Upkeep**: Maintenance cost (20 gold/hr per territory + 1 gold/hr per 10 units)
**Underdog Bonus**: VP generation multiplier for lower-ranked tribes
**PvE**: Player vs Environment (fighting NPC garrisons)
**PvP**: Player vs Player (attacking other players' territories)
**Scouting**: Workshop Lv3+ ability to see enemy garrisons before attacking
**Shield**: Temporary protection preventing attacks on territory (4 hours)
**War Declaration**: Formal conflict granting +50% VP vs target tribe
**Treasury**: Tribal pooled resources for shared expenses
**Rake**: Platform profit (15% of entry fees)
**Season**: 10-day competitive period ending with prize distribution

---

### B. Quick Reference - Unit Stats

| Unit | Cost | HP | DMG | Speed | Counters | Weak To |
|------|------|----|-----|-------|----------|---------|
| Militia | 10g | 100 | 10 | Medium | None | None |
| Spearman | 25g | 120 | 15 | Slow | Cavalry | Archers |
| Archer | 30g | 80 | 20 | Fast | Spearmen | Cavalry |
| Cavalry | 50g | 150 | 25 | V.Fast | Archers | Spearmen |

**Counter Bonus**: +50% damage (exactly 1.5x multiplier)

---

### C. Quick Reference - Territory Values

| Tier | Count | VP/hr | Gold/hr | Upkeep | Net Gold | Difficulty |
|------|-------|-------|---------|--------|----------|------------|
| Center | 5 | 100 | 100 | 20 | +80 | HARD |
| Ring | 15 | 50 | 50 | 20 | +30 | MEDIUM |
| Edge | 30 | 25 | 25 | 20 | +5 | EASY |

**Optimal Portfolio**: 15 territories (10 ring + 5 edges) = +175 gold/hr net

---

### D. Quick Reference - Building Costs

| Building | Total Cost | Total Time | Key Levels |
|----------|------------|------------|------------|
| Barracks | 11,700g | ~8.7 hrs | Lv3 (Spearmen), Lv5 (Archers), Lv7 (Cavalry) |
| Warehouse | 9,930g | ~4.4 hrs | Lv10 (50% protection, 20g/hr passive) |
| Workshop | 17,250g | ~8.8 hrs | Lv3 (Scouting), Lv10 (+20% formations) |
| **Total** | **38,880g** | **~22 hrs** | |

---

### E. Quick Reference - Formulas

**Battle Power**:
```
Power = Σ(unit_count × HP × DMG × counter × formation × terrain)
```

**Casualties**:
```
Winner loses: 40% of units
Loser loses: 60% of units
```

**Diminishing Returns**:
```
Efficiency = 100% (1-5), 80% (6-10), 60% (11-15), 40% (16-20), 20% (21+)
```

**Upkeep**:
```
Total Upkeep = (Territories × 20 g/hr) + (Units / 10 × 1 g/hr)
```

**VP Generation**:
```
Hourly VP = Σ(territory_VP × efficiency × underdog_bonus)
```

---

### F. Contact & Support

**Developer**: [Your Name/Team]
**Website**: [cryptotribes.gg]
**Discord**: [discord.gg/cryptotribes]
**Twitter**: [@CryptoTribesGame]
**Support Email**: support@cryptotribes.gg
**Bug Reports**: Github Issues OR Discord #bugs

---

**END OF GAME DESIGN DOCUMENT**

**Version**: 1.0 (Season 1 MVP)
**Last Updated**: December 1, 2025
**Status**: Ready for Development

**Next Steps**:
1. Review and approve GDD
2. Answer critical questions (tribe formation, prize distribution method)
3. Begin Phase 1 development (database schemas, authentication)
4. Set up project repository + CI/CD
5. Launch alpha testing (50 players, 3-day mini-season) in Week 13

**Estimated Launch**: Season 1 in 4 months (Q1 2026)
