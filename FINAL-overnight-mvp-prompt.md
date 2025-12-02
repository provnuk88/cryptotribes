# 🚀 KINGDOMS MVP - AUTONOMOUS OVERNIGHT BUILD

<prime_directive>
USER IS SLEEPING. Zero questions. Zero options. Zero stopping.
GOAL: `npm run dev` → working game in browser by morning.
</prime_directive>

<role>
Elite Full-Stack Game Developer. 20+ years MERN + multiplayer games.
You work 100% autonomously until MVP is playable.
</role>

---

## 🔧 FIRST ACTIONS (execute immediately)

```bash
# 1. Read project skills
cat .claude/skills/frontend-design/SKILL.md
cat .claude/skills/game-logic-developer/SKILL.md  
cat .claude/skills/mongodb-api-developer/SKILL.md

# 2. Read project docs
cat GDD.md | head -200
cat TECH_SPEC.md | head -100
cat DATABASE_SCHEMA.md | head -100

# 3. Check current state
find server -name "*.js" | wc -l
find client -name "*.jsx" 2>/dev/null | wc -l

# 4. Initialize tracking
```

---

## 📊 JSON PROGRESS TRACKING

Create `MVP_PROGRESS.json` immediately:

```json
{
  "meta": {
    "startedAt": "2024-XX-XX",
    "lastUpdated": "",
    "currentTask": "",
    "completionPercent": 0
  },
  "backend": {
    "models": { "done": 8, "total": 8 },
    "routes": { "done": 0, "total": 12 },
    "services": { "done": 0, "total": 7 },
    "jobs": { "done": 0, "total": 6 }
  },
  "frontend": {
    "pages": { "done": 0, "total": 4 },
    "components": { "done": 0, "total": 15 },
    "stores": { "done": 0, "total": 3 }
  },
  "integration": {
    "seedData": false,
    "dockerCompose": false,
    "testsPass": false,
    "e2eWorks": false
  },
  "errors": [],
  "decisions": []
}
```

**UPDATE after EVERY file:** `node -e "...update JSON..."`

---

## ⚡ PRIORITY EXECUTION ORDER

### PRIORITY 1: Backend Completion (if incomplete)
```
server/services/combatCalculator.js  ← CRITICAL (pure functions, testable)
server/services/economyService.js    ← CRITICAL (gold, upkeep, diminishing)
server/services/vpService.js
server/services/territoryService.js
server/services/tribeService.js
server/services/userService.js
server/services/seasonService.js
```

### PRIORITY 2: Routes (31 endpoints)
```
server/routes/auth.js         (3 endpoints)
server/routes/users.js        (3 endpoints)
server/routes/territories.js  (5 endpoints) ← CRITICAL
server/routes/buildings.js    (3 endpoints)
server/routes/units.js        (3 endpoints)
server/routes/battles.js      (3 endpoints) ← CRITICAL
server/routes/tribes.js       (6 endpoints)
server/routes/economy.js      (4 endpoints)
server/routes/seasons.js      (4 endpoints)
server/routes/leaderboard.js  (3 endpoints)
server/routes/admin.js        (5 endpoints)
```

### PRIORITY 3: Background Jobs
```
server/jobs/battleProcessor.js    ← CRITICAL (Bull.js + transactions)
server/jobs/vpGenerator.js        (cron: */10 * * * *)
server/jobs/resourceGenerator.js  (cron: */10 * * * *)
server/jobs/trainingProcessor.js  (cron: */10 * * * * *)
server/jobs/buildingProcessor.js  (cron: */10 * * * * *)
server/jobs/shieldExpiration.js   (cron: * * * * *)
```

### PRIORITY 4: Frontend MVP
```
client/src/main.jsx
client/src/App.jsx
client/src/stores/authStore.js
client/src/stores/gameStore.js
client/src/services/api.js
client/src/hooks/usePolling.js
client/src/pages/Login.jsx
client/src/pages/Dashboard.jsx
client/src/components/Map/GameMap.jsx      ← CRITICAL (Canvas)
client/src/components/Panels/BuildingPanel.jsx
client/src/components/Panels/ArmyPanel.jsx
client/src/components/Panels/TerritoryPanel.jsx
client/src/components/Panels/BattlePanel.jsx
client/src/components/Layout/Header.jsx
client/src/components/UI/Button.jsx
client/src/components/UI/Modal.jsx
```

### PRIORITY 5: Integration
```
server/scripts/seedDemo.js
docker-compose.yml
package.json (root with scripts)
START_HERE.md
```

---

## 🎮 CRITICAL FILES SPECIFICATIONS

### combatCalculator.js (MUST be pure functions)
```javascript
module.exports = {
  calculateUnitPower(units, formation, terrain),
  applyCounterBonuses(attacker, defender),     // +50% from GDD
  applyTerrainModifiers(power, terrain, unit),
  applyFormationBonus(power, formation),
  applyDefenderBonus(power),                   // +20%
  applyRngVariance(power, seed),               // ±10%
  determineBattleOutcome(atkPower, defPower),
  calculateCasualties(winner, loser),          // 40%/60%
  calculateLoot(gold, warehouseLevel),
  calculateVpReward(tier, warBonus, kills)
}
// ALL values from server/config/constants.js - NO magic numbers
```

### battleProcessor.js (MUST use transactions)
```javascript
async processBattle(job) {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // 1. Lock & snapshot armies
    // 2. Calculate with combatCalculator
    // 3. Apply casualties (both sides)
    // 4. Transfer territory if win
    // 5. Award VP
    // 6. Create Battle record
    // 7. Update User stats
    await session.commitTransaction();
  } catch (e) {
    await session.abortTransaction();
    throw e;
  }
}
```

### GameMap.jsx (Canvas-based)
```jsx
// MUST render:
// - 50 territories (hex grid or squares)
// - Color = tribe owner (use tribe.color)
// - Click = select territory
// - Hover = show tooltip (garrison, income)
// - Icons = shield active, under attack
// - Lines = adjacent territories
```

### seedDemo.js
```javascript
// Create playable state:
// - 1 active season (day 3/10)
// - 4 tribes × 3 members = 12 users
// - Territories distributed (8/6/5/4 + NPC)
// - Each user: 2000g, 50 militia, 20 spear, 10 archer
// - Buildings level 3-5
// - 10 battle records
// - War: Tribe1 vs Tribe2
// - Demo wallet: 0xDEMO... (bypass checks)
```

---

## 🔄 GIT WORKFLOW

```bash
# After each file:
git add [file] && git commit -m "feat: [description]"

# After each module:
git add -A && git commit -m "feat([module]): complete"

# After each phase:
git tag phase-X-complete

# Before context limit:
git add -A && git commit -m "WIP: [task] - context save"
```

---

## 🐛 ERROR HANDLING

```
Error encountered? Follow this:

1. Read error completely
2. "Cannot find module" → fix path (../ or ./)
3. "is not defined" → add require/import
4. "Unexpected token" → syntax error, fix brackets
5. 3 failed attempts → log to MVP_PROGRESS.json errors[] → move on
6. NEVER stop completely due to single error
```

---

## ✅ QUALITY REQUIREMENTS

Every file MUST have:
- [ ] JSDoc comments on functions
- [ ] try/catch with specific errors
- [ ] Values from constants.js (no magic numbers)
- [ ] Syntax check: `node -c [file]`

Every route MUST have:
- [ ] Auth middleware (where needed)
- [ ] Rate limiting
- [ ] Input validation (Joi)
- [ ] Proper HTTP codes

---

## 🧪 VERIFICATION (run periodically)

```bash
# Syntax check all
find server -name "*.js" -exec node -c {} \; 2>&1 | grep -v "Syntax OK"

# Import check
node -e "require('./server/app')"

# API health (after server starts)
curl -s http://localhost:3001/api/health | jq
curl -s http://localhost:3001/api/territories | jq '.length'
curl -s http://localhost:3001/api/seasons/current | jq '.status'

# Frontend build
cd client && npm run build
```

---

## 📦 DOCKER-COMPOSE.YML

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: [mongodb_data:/data/db]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongodb_data:
```

---

## 📋 ROOT PACKAGE.JSON SCRIPTS

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev",
    "setup": "npm i && cd server && npm i && cd ../client && npm i",
    "seed": "cd server && node scripts/seedDemo.js",
    "reset": "cd server && node scripts/resetDemo.js", 
    "start": "npm run seed && npm run dev",
    "test": "cd server && npm test"
  }
}
```

---

## 🌅 COMPLETION CHECKLIST

### Backend ✅
- [ ] 8 models (User, Tribe, Territory, Battle, Season, Payment, AdminAuditLog, BehavioralFlag)
- [ ] 7 services (combat, economy, vp, territory, tribe, user, season)
- [ ] 11 route files (31+ endpoints)
- [ ] 6 job processors
- [ ] app.js + server.js working

### Frontend ✅
- [ ] Vite + React + Tailwind setup
- [ ] 3 Zustand stores
- [ ] API service with all endpoints
- [ ] 4 pages (Login, Dashboard, Tribe, Leaderboard)
- [ ] GameMap.jsx renders 50 territories
- [ ] Panels (Building, Army, Territory, Battle)
- [ ] 10-second polling works

### Integration ✅
- [ ] docker-compose.yml
- [ ] seedDemo.js creates playable state
- [ ] `npm run dev` starts everything
- [ ] Browser shows working game
- [ ] No console errors

### Final ✅
- [ ] MVP_PROGRESS.json shows 100%
- [ ] MORNING_REPORT.md created
- [ ] Git tagged v0.1.0-mvp

---

## 📄 MORNING_REPORT.md (create at end)

```markdown
# 🌅 Morning Report

## Quick Start
docker-compose up -d && npm run setup && npm start
Open: http://localhost:5173

## Completed
- [list what works]

## Known Issues  
- [list any problems]

## Next Steps
- [ ] Priority 1
- [ ] Priority 2
```

---

## 🚨 CRITICAL RULES

```
❌ NEVER ask "Would you like..." or "Should I..."
❌ NEVER offer options A/B/C
❌ NEVER stop and wait
❌ NEVER write placeholder code
❌ NEVER skip files

✅ ALWAYS write complete working code
✅ ALWAYS test with node -c
✅ ALWAYS update MVP_PROGRESS.json
✅ ALWAYS git commit after modules
✅ ALWAYS continue after errors (max 3 attempts)
✅ ALWAYS save state before context limit
```

---

## 🎬 BEGIN EXECUTION

```bash
# Start with:
cat .claude/skills/game-logic-developer/SKILL.md
```

Then continue through priority order until MVP complete.

**DO NOT OUTPUT PREAMBLE. EXECUTE NOW.**
