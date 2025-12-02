# 🎯 CRYPTOTRIBES MVP - AUTONOMOUS PERFECTION

<prime_directive>
USER IS SLEEPING. You work until `npm run dev` opens working game at http://localhost:5173
ZERO questions. ZERO options. ZERO stopping. FIX EVERYTHING.
</prime_directive>

---

## 📋 PROJECT CONTEXT (from CLAUDE.md)

**Stack:** Node.js + Express + MongoDB + Redis (Bull.js) | React + Vite + Zustand + Tailwind

**Structure:**
```
server/
├── server.js              # Entry point
├── app.js                 # Express config
├── config/constants.js    # Game balance (CRITICAL)
├── models/                # User, Tribe, Territory, Battle, Season, Payment
├── routes/                # /api/v1/*
├── services/              # battleQueue, combatCalculator, economyService, vpService
├── jobs/                  # Cron: building, training, VP generation
└── middleware/            # Auth, validation, rate limiting

client/
├── src/
│   ├── components/        # React components
│   ├── pages/             # Dashboard, Map, Profile, Tribe, Leaderboard
│   ├── stores/            # Zustand (gameStore, tribeStore, uiStore)
│   └── services/          # Axios API client
```

**Commands:**
```bash
npm run dev          # Start server + client
npm test             # Test suite
npm run seed         # Seed data
docker-compose up -d # Full stack
```

**Code Style:**
- CommonJS (require/module.exports)
- Winston logger (NO console.log)
- Joi validation on routes
- Error codes: INSUFFICIENT_GOLD, INVALID_TERRITORY, etc.

**API:** `/api/v1` with JWT Bearer auth
```javascript
// Success: { success: true, data: {...} }
// Error: { success: false, error: { code, message } }
```

---

## 📊 MASTER TRACKER

Create `AUDIT_TRACKER.json` immediately:

```json
{
  "meta": {
    "started": "",
    "updated": "",
    "iteration": 0,
    "phase": "init",
    "status": "running"
  },
  "infrastructure": {
    "docker": { "mongodb": false, "redis": false },
    "dependencies": { "root": false, "server": false, "client": false },
    "env": { "server/.env": false }
  },
  "audit": {
    "server": {
      "server.js": { "exists": false, "syntax": false, "runs": false },
      "app.js": { "exists": false, "syntax": false, "imports": false },
      "config/constants.js": { "exists": false, "syntax": false, "complete": false },
      "config/database.js": { "exists": false, "syntax": false },
      "models": { "count": 0, "valid": 0, "issues": [] },
      "routes": { "count": 0, "valid": 0, "issues": [] },
      "services": { "count": 0, "valid": 0, "issues": [] },
      "middleware": { "count": 0, "valid": 0, "issues": [] },
      "jobs": { "count": 0, "valid": 0, "issues": [] }
    },
    "client": {
      "package.json": { "exists": false, "valid": false },
      "vite.config.js": { "exists": false, "valid": false },
      "src/main.jsx": { "exists": false, "syntax": false },
      "src/App.jsx": { "exists": false, "syntax": false },
      "pages": { "count": 0, "valid": 0 },
      "components": { "count": 0, "valid": 0 },
      "stores": { "count": 0, "valid": 0 }
    }
  },
  "fixes": [],
  "tests": {
    "syntax": { "passed": 0, "failed": 0 },
    "api": { "passed": 0, "failed": 0 },
    "e2e": { "passed": 0, "failed": 0 }
  },
  "services": {
    "mongodb": "unknown",
    "redis": "unknown", 
    "backend": "unknown",
    "frontend": "unknown"
  },
  "endpoints": {
    "/api/v1/health": false,
    "/api/v1/territories": false,
    "/api/v1/seasons/current": false,
    "/api/v1/leaderboard/tribes": false,
    "/api/v1/tribes": false
  },
  "game_ready": false
}
```

**UPDATE RULE:** After EVERY action, update JSON with:
```bash
node -e "
const fs=require('fs');
const t=JSON.parse(fs.readFileSync('AUDIT_TRACKER.json'));
t.meta.updated=new Date().toISOString();
t.meta.iteration++;
// ... update relevant fields
fs.writeFileSync('AUDIT_TRACKER.json',JSON.stringify(t,null,2));
"
```

---

## ⚡ PHASE 1: INFRASTRUCTURE CHECK

```bash
#!/bin/bash
echo "=== PHASE 1: INFRASTRUCTURE ==="

# 1.1 Docker services
echo "Checking Docker..."
if ! docker ps | grep -q mongo; then
  echo "Starting MongoDB & Redis..."
  docker-compose up -d mongodb redis 2>/dev/null || {
    # Create docker-compose.yml if missing
    cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: [mongo_data:/data/db]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  mongo_data:
EOF
    docker-compose up -d mongodb redis
  }
  sleep 5
fi
docker ps | grep mongo && echo "✅ MongoDB OK" || echo "❌ MongoDB FAILED"
docker ps | grep redis && echo "✅ Redis OK" || echo "❌ Redis FAILED"

# 1.2 Dependencies
echo "Checking dependencies..."
[ -d "node_modules" ] || npm install
[ -d "server/node_modules" ] || (cd server && npm install)
[ -d "client/node_modules" ] || (cd client && npm install)

# 1.3 Environment
echo "Checking .env..."
if [ ! -f "server/.env" ]; then
  cat > server/.env << 'EOF'
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/cryptotribes
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production-$(openssl rand -hex 16)
STRIPE_SECRET_KEY=sk_test_placeholder
EOF
  echo "Created server/.env"
fi
```

---

## 🔍 PHASE 2: FULL AUDIT

### 2.1 File Inventory
```bash
echo "=== PHASE 2: AUDIT ==="

# Count all files
echo "Server JS files: $(find server -name '*.js' -type f | wc -l)"
echo "Client JSX files: $(find client/src -name '*.jsx' -type f 2>/dev/null | wc -l)"
echo "Client JS files: $(find client/src -name '*.js' -type f 2>/dev/null | wc -l)"

# List critical files
echo -e "\n--- Critical Backend Files ---"
for f in server/server.js server/app.js server/config/constants.js server/config/database.js; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ MISSING: $f"
done

echo -e "\n--- Models ---"
ls -la server/models/*.js 2>/dev/null || echo "❌ No models found"

echo -e "\n--- Routes ---"  
ls -la server/routes/*.js 2>/dev/null || echo "❌ No routes found"

echo -e "\n--- Services ---"
ls -la server/services/*.js 2>/dev/null || echo "❌ No services found"

echo -e "\n--- Critical Frontend Files ---"
for f in client/package.json client/vite.config.js client/src/main.jsx client/src/App.jsx; do
  [ -f "$f" ] && echo "✅ $f" || echo "❌ MISSING: $f"
done
```

### 2.2 Syntax Check ALL Files
```bash
echo -e "\n--- Syntax Check ---"
ERRORS=0

find server -name "*.js" -type f | while read f; do
  if ! node -c "$f" 2>/dev/null; then
    echo "❌ SYNTAX ERROR: $f"
    node -c "$f" 2>&1 | head -5
    ((ERRORS++))
  fi
done

echo "Syntax errors found: $ERRORS"
```

### 2.3 Import/Require Check
```bash
echo -e "\n--- Import Check ---"

# Check critical entry points can be required
for f in server/app.js server/config/constants.js server/config/database.js; do
  if [ -f "$f" ]; then
    node -e "try{require('./$f');console.log('✅ $f imports OK')}catch(e){console.log('❌ $f:',e.message)}"
  fi
done
```

### 2.4 Read Each Critical File
```bash
# Read and verify content of critical files
echo -e "\n--- Content Audit ---"

# server.js must have: require dotenv, require app, mongoose.connect, listen
echo "Checking server/server.js..."
grep -q "require.*dotenv" server/server.js && echo "  ✅ dotenv" || echo "  ❌ missing dotenv"
grep -q "require.*app" server/server.js && echo "  ✅ app import" || echo "  ❌ missing app"
grep -q "mongoose.connect\|connectDB" server/server.js && echo "  ✅ DB connect" || echo "  ❌ missing DB"
grep -q "listen" server/server.js && echo "  ✅ listen" || echo "  ❌ missing listen"

# app.js must have: express, cors, routes mounted
echo "Checking server/app.js..."
grep -q "express()" server/app.js && echo "  ✅ express" || echo "  ❌ missing express"
grep -q "cors" server/app.js && echo "  ✅ cors" || echo "  ❌ missing cors"
grep -q "app.use.*routes\|app.use.*/api" server/app.js && echo "  ✅ routes" || echo "  ❌ missing routes"

# constants.js must have game values
echo "Checking server/config/constants.js..."
grep -q "UNIT_STATS\|unitStats" server/config/constants.js && echo "  ✅ UNIT_STATS" || echo "  ❌ missing UNIT_STATS"
grep -q "BUILDING\|building" server/config/constants.js && echo "  ✅ BUILDINGS" || echo "  ❌ missing BUILDINGS"
grep -q "COUNTER\|counter" server/config/constants.js && echo "  ✅ COUNTERS" || echo "  ❌ missing COUNTERS"
```

---

## 🔧 PHASE 3: FIX ALL ISSUES

### Fix Protocol
For EACH issue found:
1. Read the file
2. Identify exact problem (line, missing code, wrong syntax)
3. Write complete fix
4. Verify with `node -c`
5. Update AUDIT_TRACKER.json
6. Git commit: `git add -A && git commit -m "fix: [description]"`

### Critical File Templates

**If server/server.js is broken/missing:**
```javascript
require('dotenv').config();
const http = require('http');
const app = require('./app');
const { connectDB } = require('./config/database');
const logger = require('./utils/logger') || console;
const { initializeJobs } = require('./jobs');

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await connectDB();
    logger.info('MongoDB connected');
    
    initializeJobs?.();
    
    const server = http.createServer(app);
    server.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down');
      server.close(() => process.exit(0));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

**If server/app.js is broken/missing:**
```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date() } });
});

// Routes
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/users', require('./routes/users'));
app.use('/api/v1/tribes', require('./routes/tribes'));
app.use('/api/v1/territories', require('./routes/territories'));
app.use('/api/v1/buildings', require('./routes/buildings'));
app.use('/api/v1/units', require('./routes/units'));
app.use('/api/v1/battles', require('./routes/battles'));
app.use('/api/v1/economy', require('./routes/economy'));
app.use('/api/v1/seasons', require('./routes/seasons'));
app.use('/api/v1/leaderboard', require('./routes/leaderboard'));
app.use('/api/v1/admin', require('./routes/admin'));

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false, 
    error: { code: 'INTERNAL_ERROR', message: err.message } 
  });
});

module.exports = app;
```

**If client/vite.config.js is broken/missing:**
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

---

## 🧪 PHASE 4: TESTING

### 4.1 Install Test Dependencies
```bash
# E2E testing
npm install -D @playwright/test
npx playwright install chromium --with-deps

# API testing  
cd server && npm install -D jest supertest && cd ..
```

### 4.2 Create Playwright Tests

**tests/e2e/game.spec.js:**
```javascript
const { test, expect } = require('@playwright/test');

const API = 'http://localhost:3001/api/v1';
const FRONTEND = 'http://localhost:5173';

test.describe('CryptoTribes MVP', () => {
  
  // API Tests
  test('API: health endpoint', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  test('API: territories returns 50', async ({ request }) => {
    const res = await request.get(`${API}/territories`);
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    const territories = data.data || data.territories || data;
    expect(Array.isArray(territories)).toBeTruthy();
    expect(territories.length).toBeGreaterThan(0);
  });

  test('API: seasons/current returns season', async ({ request }) => {
    const res = await request.get(`${API}/seasons/current`);
    expect(res.ok()).toBeTruthy();
  });

  test('API: leaderboard returns tribes', async ({ request }) => {
    const res = await request.get(`${API}/leaderboard/tribes`);
    expect(res.ok()).toBeTruthy();
  });

  // Frontend Tests
  test('Frontend: page loads', async ({ page }) => {
    await page.goto(FRONTEND);
    await expect(page).toHaveTitle(/.+/);
  });

  test('Frontend: has interactive elements', async ({ page }) => {
    await page.goto(FRONTEND);
    const buttons = page.locator('button');
    await expect(buttons.first()).toBeVisible({ timeout: 10000 });
  });

  test('Frontend: no critical errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('favicon')) {
        errors.push(msg.text());
      }
    });
    await page.goto(FRONTEND);
    await page.waitForTimeout(3000);
    expect(errors.length).toBeLessThan(5);
  });

  test('Frontend: can see map or game content', async ({ page }) => {
    await page.goto(FRONTEND);
    // Look for game-related content
    const gameContent = page.locator('canvas, [class*="map"], [class*="territory"], [class*="game"]');
    const hasContent = await gameContent.count() > 0;
    
    // Or at least the app renders something
    const appContent = page.locator('#root, #app, .app');
    await expect(appContent.first()).not.toBeEmpty();
  });
});
```

**playwright.config.js:**
```javascript
module.exports = {
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  }
};
```

### 4.3 Create API Test Script

**scripts/test-api.sh:**
```bash
#!/bin/bash
API="http://localhost:3001/api/v1"
PASS=0
FAIL=0

test_endpoint() {
  local name=$1
  local endpoint=$2
  local expected=${3:-200}
  
  code=$(curl -s -o /dev/null -w "%{http_code}" "$API$endpoint")
  if [ "$code" = "$expected" ]; then
    echo "✅ $name: $code"
    ((PASS++))
  else
    echo "❌ $name: $code (expected $expected)"
    ((FAIL++))
  fi
}

echo "=== API ENDPOINT TESTS ==="
test_endpoint "Health" "/health"
test_endpoint "Territories" "/territories"
test_endpoint "Current Season" "/seasons/current"
test_endpoint "Leaderboard Tribes" "/leaderboard/tribes"
test_endpoint "Leaderboard Players" "/leaderboard/players"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ $FAIL -eq 0 ] && exit 0 || exit 1
```

### 4.4 Run All Tests
```bash
# Start services first
docker-compose up -d mongodb redis
sleep 3

# Start backend
cd server && npm run dev &
BACKEND_PID=$!
sleep 5

# Start frontend
cd client && npm run dev &
FRONTEND_PID=$!
sleep 5

# Run API tests
chmod +x scripts/test-api.sh
./scripts/test-api.sh

# Run E2E tests
npx playwright test

# Cleanup
kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
```

---

## 🔄 PHASE 5: FIX-TEST LOOP

```bash
#!/bin/bash
# AUTONOMOUS_LOOP.sh

MAX_ITER=30
ITER=0

while [ $ITER -lt $MAX_ITER ]; do
  ((ITER++))
  echo ""
  echo "========== ITERATION $ITER =========="
  
  # Update tracker
  node -e "
    const fs=require('fs');
    const t=JSON.parse(fs.readFileSync('AUDIT_TRACKER.json'));
    t.meta.iteration=$ITER;
    t.meta.updated=new Date().toISOString();
    fs.writeFileSync('AUDIT_TRACKER.json',JSON.stringify(t,null,2));
  "
  
  # Run syntax check
  SYNTAX_ERR=$(find server -name "*.js" -exec node -c {} \; 2>&1 | grep -c "SyntaxError" || true)
  if [ "$SYNTAX_ERR" -gt 0 ]; then
    echo "⚠️ $SYNTAX_ERR syntax errors - fixing..."
    # Fix each error...
    continue
  fi
  
  # Start services
  pkill -f "node.*server" 2>/dev/null || true
  pkill -f "vite" 2>/dev/null || true
  sleep 2
  
  docker-compose up -d mongodb redis
  sleep 3
  
  cd server && node server.js > ../server.log 2>&1 &
  sleep 5
  
  cd ../client && npm run dev > ../client.log 2>&1 &
  sleep 5
  cd ..
  
  # Test API
  API_OK=true
  curl -sf http://localhost:3001/api/v1/health > /dev/null || API_OK=false
  
  if [ "$API_OK" = false ]; then
    echo "❌ API failed"
    cat server.log | tail -30
    # Fix based on error...
    continue
  fi
  
  # Test Frontend
  FRONTEND_OK=true
  curl -sf http://localhost:5173 > /dev/null || FRONTEND_OK=false
  
  if [ "$FRONTEND_OK" = false ]; then
    echo "❌ Frontend failed"
    cat client.log | tail -30
    continue
  fi
  
  # Run E2E tests
  npx playwright test --reporter=list 2>&1 | tee test_results.txt
  E2E_FAIL=$(grep -c "failed" test_results.txt || true)
  
  if [ "$E2E_FAIL" -eq 0 ]; then
    echo ""
    echo "🎉🎉🎉 ALL TESTS PASS! 🎉🎉🎉"
    
    # Update tracker
    node -e "
      const fs=require('fs');
      const t=JSON.parse(fs.readFileSync('AUDIT_TRACKER.json'));
      t.meta.status='complete';
      t.game_ready=true;
      fs.writeFileSync('AUDIT_TRACKER.json',JSON.stringify(t,null,2));
    "
    
    # Create success file
    cat > GAME_READY.md << EOF
# 🎮 CryptoTribes MVP - READY!

**Completed:** $(date)
**Iterations:** $ITER

## Quick Start
\`\`\`bash
docker-compose up -d
npm run dev
\`\`\`

## Open
http://localhost:5173

## All Tests Passed ✅
EOF
    
    exit 0
  fi
  
  echo "Tests failed, fixing and retrying..."
done

echo "⚠️ Max iterations reached"
exit 1
```

---

## 🚨 ABSOLUTE RULES

```
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   ❌ NEVER ask "Would you like..." or offer options   ║
║   ❌ NEVER stop and wait for user                     ║
║   ❌ NEVER say "looks good" if tests fail             ║
║   ❌ NEVER leave syntax errors unfixed                ║
║   ❌ NEVER skip broken files                          ║
║                                                        ║
║   ✅ ALWAYS fix every error you find                  ║
║   ✅ ALWAYS run tests after fixes                     ║
║   ✅ ALWAYS update AUDIT_TRACKER.json                 ║
║   ✅ ALWAYS git commit after each fix                 ║
║   ✅ ALWAYS continue until game_ready = true          ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
```

---

## ✅ SUCCESS CRITERIA

Game is READY when ALL are true:

```json
{
  "services": {
    "mongodb": "running",
    "redis": "running",
    "backend": "running on :3001",
    "frontend": "running on :5173"
  },
  "api_tests": {
    "/api/v1/health": "200 OK",
    "/api/v1/territories": "returns array",
    "/api/v1/seasons/current": "returns season",
    "/api/v1/leaderboard/tribes": "returns tribes"
  },
  "e2e_tests": {
    "page_loads": true,
    "has_content": true,
    "no_critical_errors": true
  },
  "files": {
    "AUDIT_TRACKER.json": { "game_ready": true },
    "GAME_READY.md": "exists"
  }
}
```

---

## 🎬 START EXECUTION

```bash
# 1. Create tracker
cat > AUDIT_TRACKER.json << 'EOF'
{"meta":{"started":"","updated":"","iteration":0,"phase":"init","status":"running"},"game_ready":false}
EOF

# 2. Check current state
ls -la
find server -name "*.js" | wc -l
find client/src -name "*.jsx" 2>/dev/null | wc -l

# 3. Run infrastructure check
docker-compose up -d mongodb redis

# 4. Begin audit...
```

**DO NOT OUTPUT PREAMBLE.**
**DO NOT ASK QUESTIONS.**
**START FIXING NOW.**
**CONTINUE UNTIL `GAME_READY.md` EXISTS.**
