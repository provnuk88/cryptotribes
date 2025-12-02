# 🤖 AUTONOMOUS PERFECTION ENGINE

<mission>
USER IS SLEEPING. You have ONE job:
Make `npm start` → open browser → WORKING GAME.

DO NOT STOP until this is TRUE.
</mission>

---

## ⚡ IMMEDIATE ACTIONS (copy-paste and run)

```bash
# STEP 1: Create master control script
cat > FIX_EVERYTHING.sh << 'SCRIPT'
#!/bin/bash
set -e

LOG="AUTONOMOUS_LOG.md"
JSON="MASTER_TRACKER.json"

log() { echo "[$(date +%H:%M:%S)] $1" | tee -a $LOG; }

# Initialize tracker
cat > $JSON << 'EOF'
{
  "started": "'$(date -Iseconds)'",
  "phase": "init",
  "issues": [],
  "fixed": [],
  "tests": {"passed":0,"failed":0},
  "status": "running"
}
EOF

log "🚀 AUTONOMOUS FIX ENGINE STARTED"

#################################################
# PHASE 1: INFRASTRUCTURE
#################################################
log "📦 Phase 1: Infrastructure"

# Docker
if ! docker ps | grep -q mongo; then
  log "Starting MongoDB..."
  docker-compose up -d mongodb redis 2>/dev/null || {
    cat > docker-compose.yml << 'DC'
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
DC
    docker-compose up -d
  }
  sleep 5
fi

log "✅ Docker OK"

#################################################
# PHASE 2: DEPENDENCIES
#################################################
log "📦 Phase 2: Dependencies"

# Root package.json
if [ ! -f "package.json" ]; then
  cat > package.json << 'PJ'
{
  "name": "cryptotribes",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "cd server && npm run dev",
    "client": "cd client && npm run dev",
    "start": "npm run dev",
    "install:all": "npm i && cd server && npm i && cd ../client && npm i",
    "seed": "cd server && node scripts/seedDemo.js",
    "test": "cd server && npm test",
    "test:e2e": "npx playwright test"
  },
  "devDependencies": {
    "concurrently": "^8.2.0",
    "@playwright/test": "^1.40.0"
  }
}
PJ
fi

npm install 2>/dev/null || true
cd server && npm install 2>/dev/null || true && cd ..
cd client && npm install 2>/dev/null || true && cd ..

log "✅ Dependencies OK"

#################################################
# PHASE 3: SYNTAX CHECK ALL FILES
#################################################
log "🔍 Phase 3: Syntax Check"

ERRORS=0
find server -name "*.js" -type f 2>/dev/null | while read f; do
  if ! node -c "$f" 2>/dev/null; then
    log "❌ SYNTAX ERROR: $f"
    echo "$f" >> .syntax_errors
    ((ERRORS++))
  fi
done

if [ -f .syntax_errors ]; then
  log "⚠️ Found syntax errors - will fix"
else
  log "✅ Syntax OK"
fi

#################################################
# PHASE 4: ENV FILES
#################################################
log "📝 Phase 4: Environment"

if [ ! -f "server/.env" ]; then
  cat > server/.env << 'ENV'
PORT=3001
MONGODB_URI=mongodb://localhost:27017/cryptotribes
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
NODE_ENV=development
ENV
  log "Created server/.env"
fi

log "✅ Env OK"

#################################################
# PHASE 5: START SERVICES
#################################################
log "🖥️ Phase 5: Start Services"

# Kill existing
pkill -f "node.*server" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 2

# Start backend
cd server
if [ -f "server.js" ]; then
  node server.js > ../server.log 2>&1 &
  BACKEND_PID=$!
  sleep 3
  if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    log "✅ Backend running (PID: $BACKEND_PID)"
  else
    log "❌ Backend failed to start"
    cat ../server.log | tail -20
  fi
else
  log "❌ server.js not found!"
fi
cd ..

# Start frontend
cd client
if [ -f "package.json" ]; then
  npm run dev > ../client.log 2>&1 &
  FRONTEND_PID=$!
  sleep 5
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    log "✅ Frontend running (PID: $FRONTEND_PID)"
  else
    log "❌ Frontend failed to start"
    cat ../client.log | tail -20
  fi
fi
cd ..

#################################################
# PHASE 6: SEED DATA
#################################################
log "🌱 Phase 6: Seed Data"

if [ -f "server/scripts/seedDemo.js" ]; then
  cd server && node scripts/seedDemo.js 2>&1 | tee -a ../seed.log && cd ..
  log "✅ Data seeded"
else
  log "⚠️ seedDemo.js not found"
fi

#################################################
# PHASE 7: VERIFY
#################################################
log "✅ Phase 7: Verification"

echo ""
echo "=== FINAL STATUS ==="
curl -s http://localhost:3001/api/health && echo " ← Backend OK" || echo "❌ Backend DOWN"
curl -s http://localhost:3001/api/territories | head -c 100 && echo "... ← Territories OK" || echo "❌ No territories"
curl -s http://localhost:5173 | head -c 100 && echo "... ← Frontend OK" || echo "❌ Frontend DOWN"

log "🏁 SCRIPT COMPLETE"
echo ""
echo "🎮 Open: http://localhost:5173"
SCRIPT

chmod +x FIX_EVERYTHING.sh
```

---

## 📊 MASTER_TRACKER.json Structure

```json
{
  "meta": {
    "started": "ISO-DATE",
    "updated": "ISO-DATE",
    "phase": "current_phase",
    "iteration": 0,
    "status": "running|complete|failed"
  },
  "infrastructure": {
    "docker": {"mongodb": false, "redis": false},
    "node_modules": {"root": false, "server": false, "client": false},
    "env_files": {"server": false, "client": false}
  },
  "audit": {
    "total_files": 0,
    "checked": 0,
    "errors_found": 0,
    "errors_fixed": 0,
    "files": {}
  },
  "services": {
    "mongodb": {"status": "unknown", "port": 27017},
    "redis": {"status": "unknown", "port": 6379},
    "backend": {"status": "unknown", "port": 3001, "pid": null},
    "frontend": {"status": "unknown", "port": 5173, "pid": null}
  },
  "api_tests": {
    "health": false,
    "territories": false,
    "seasons": false,
    "leaderboard": false,
    "tribes": false
  },
  "e2e_tests": {
    "page_loads": false,
    "map_renders": false,
    "can_interact": false
  },
  "game_ready": false
}
```

---

## 🔧 AUTONOMOUS FIX PROTOCOL

### For Each Error Type:

**1. Missing File**
```bash
# Detect
[ ! -f "$FILE" ] && echo "MISSING: $FILE"

# Fix: Create the file with proper content
# Use templates from GDD.md and existing patterns
```

**2. Syntax Error**
```bash
# Detect
node -c "$FILE" 2>&1 | grep -i "error"

# Fix: Read error, identify line, fix syntax
# Common: missing }, missing ;, typo in require
```

**3. Import Error**
```bash
# Detect
node -e "require('$FILE')" 2>&1 | grep "Cannot find"

# Fix: Check path, add ../,  install missing npm package
```

**4. Runtime Error**
```bash
# Detect
node "$FILE" 2>&1 | grep -i "error\|undefined\|null"

# Fix: Add null checks, fix variable names, add try-catch
```

**5. API Error**
```bash
# Detect
curl -s http://localhost:3001/api/X | grep -i "error"

# Fix: Check route, check controller, check service, check model
```

---

## 🧪 PLAYWRIGHT E2E TESTS

### Create: tests/e2e/game.spec.js

```javascript
const { test, expect } = require('@playwright/test');

test.describe('CryptoTribes MVP', () => {
  
  test('1. Page loads', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await expect(page).toHaveTitle(/.+/);
    console.log('✅ Page loads');
  });

  test('2. Has connect button', async ({ page }) => {
    await page.goto('http://localhost:5173');
    const btn = page.locator('button').filter({ hasText: /connect|wallet|login|enter/i });
    await expect(btn.first()).toBeVisible({ timeout: 10000 });
    console.log('✅ Connect button visible');
  });

  test('3. API health', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/health');
    expect(res.ok()).toBeTruthy();
    console.log('✅ API healthy');
  });

  test('4. API has territories', async ({ request }) => {
    const res = await request.get('http://localhost:3001/api/territories');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(Array.isArray(data) ? data.length : data.territories?.length).toBeGreaterThan(0);
    console.log('✅ Territories exist');
  });

  test('5. Map renders', async ({ page }) => {
    await page.goto('http://localhost:5173');
    // Try to find canvas or map container
    const map = page.locator('canvas, [class*="map"], #map, .game-map').first();
    await expect(map).toBeVisible({ timeout: 15000 });
    console.log('✅ Map renders');
  });

  test('6. No console errors', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(3000);
    expect(errors.length).toBeLessThan(3); // Allow minor errors
    console.log('✅ Console clean');
  });
});
```

### Create: playwright.config.js

```javascript
module.exports = {
  testDir: './tests/e2e',
  timeout: 60000,
  retries: 1,
  reporter: [['list'], ['json', { outputFile: 'test-results.json' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure'
  }
};
```

---

## 🔄 MASTER EXECUTION LOOP

```bash
#!/bin/bash
# AUTONOMOUS_LOOP.sh - Run until perfect

MAX_ITERATIONS=50
ITERATION=0

update_json() {
  node -e "
    const fs = require('fs');
    const j = JSON.parse(fs.readFileSync('MASTER_TRACKER.json'));
    j.meta.updated = new Date().toISOString();
    j.meta.iteration = $ITERATION;
    j.meta.phase = '$1';
    fs.writeFileSync('MASTER_TRACKER.json', JSON.stringify(j, null, 2));
  "
}

while [ $ITERATION -lt $MAX_ITERATIONS ]; do
  ((ITERATION++))
  echo ""
  echo "========== ITERATION $ITERATION =========="
  
  # Phase 1: Check infrastructure
  update_json "infrastructure"
  docker ps | grep -q mongo || docker-compose up -d mongodb redis
  
  # Phase 2: Check syntax errors
  update_json "syntax_check"
  SYNTAX_ERRORS=$(find server -name "*.js" -exec node -c {} \; 2>&1 | grep -c "error" || true)
  if [ "$SYNTAX_ERRORS" -gt 0 ]; then
    echo "Found $SYNTAX_ERRORS syntax errors - fixing..."
    # Claude will read and fix each error
    continue
  fi
  
  # Phase 3: Start services
  update_json "start_services"
  ./FIX_EVERYTHING.sh
  sleep 5
  
  # Phase 4: Test API
  update_json "api_tests"
  API_OK=true
  curl -sf http://localhost:3001/api/health > /dev/null || API_OK=false
  curl -sf http://localhost:3001/api/territories > /dev/null || API_OK=false
  
  if [ "$API_OK" = false ]; then
    echo "API tests failed - investigating..."
    cat server.log | tail -30
    continue
  fi
  
  # Phase 5: Run E2E tests
  update_json "e2e_tests"
  npx playwright test 2>&1 | tee e2e_results.txt
  E2E_FAILED=$(grep -c "failed" e2e_results.txt || true)
  
  if [ "$E2E_FAILED" -gt 0 ]; then
    echo "E2E tests failed - fixing..."
    continue
  fi
  
  # Phase 6: Success check
  update_json "verification"
  if curl -sf http://localhost:5173 > /dev/null && \
     curl -sf http://localhost:3001/api/health > /dev/null; then
    echo ""
    echo "🎉🎉🎉 ALL TESTS PASS! GAME IS READY! 🎉🎉🎉"
    echo ""
    echo "Open: http://localhost:5173"
    
    # Update final status
    node -e "
      const fs = require('fs');
      const j = JSON.parse(fs.readFileSync('MASTER_TRACKER.json'));
      j.meta.status = 'complete';
      j.game_ready = true;
      fs.writeFileSync('MASTER_TRACKER.json', JSON.stringify(j, null, 2));
    "
    
    # Create success report
    cat > GAME_READY.md << EOF
# 🎮 GAME IS READY!

**Completed:** $(date)
**Iterations:** $ITERATION

## Start Command
\`\`\`bash
docker-compose up -d
npm run dev
\`\`\`

## Open
http://localhost:5173

## Status
- ✅ MongoDB running
- ✅ Redis running  
- ✅ Backend API working
- ✅ Frontend serving
- ✅ All E2E tests pass
EOF
    
    exit 0
  fi
  
  echo "Not ready yet, continuing..."
done

echo "⚠️ Max iterations reached"
```

---

## 📝 EXECUTION INSTRUCTIONS

### Step 1: Create All Scripts
```bash
# Create and run main fix script
./FIX_EVERYTHING.sh

# If errors, Claude reads logs and fixes
cat server.log
cat client.log
cat AUTONOMOUS_LOG.md
```

### Step 2: Fix Any Errors Found
For each error in logs:
1. Identify file and line
2. Read the file
3. Fix the issue
4. Save file
5. Re-run script

### Step 3: Run Tests
```bash
# Install playwright
npm install -D @playwright/test
npx playwright install chromium

# Run tests
npx playwright test
```

### Step 4: Fix Test Failures
For each failed test:
1. Read error message
2. Identify component
3. Fix issue
4. Re-run test

### Step 5: Repeat Until All Pass

---

## 🚨 ABSOLUTE RULES

```
██████████████████████████████████████████████████
█                                                █
█   ❌ NEVER ask "Would you like..."             █
█   ❌ NEVER offer options A/B/C                 █
█   ❌ NEVER stop and wait                       █
█   ❌ NEVER say "looks good" if tests fail      █
█   ❌ NEVER leave errors unfixed                █
█                                                █
█   ✅ FIX every error immediately               █
█   ✅ RUN tests after every fix                 █
█   ✅ UPDATE MASTER_TRACKER.json always         █
█   ✅ CONTINUE until game_ready = true          █
█   ✅ CREATE missing files completely           █
█                                                █
██████████████████████████████████████████████████
```

---

## 🎯 SUCCESS CRITERIA

Game is READY when ALL true:

```javascript
{
  "services": {
    "mongodb": "running",      // docker ps | grep mongo
    "redis": "running",        // docker ps | grep redis
    "backend": "running",      // curl localhost:3001/api/health
    "frontend": "running"      // curl localhost:5173
  },
  "api_tests": {
    "health": true,           // 200 OK
    "territories": true,      // returns 50 items
    "seasons": true,          // returns current season
    "leaderboard": true       // returns tribes
  },
  "e2e_tests": {
    "page_loads": true,       // playwright test 1
    "map_renders": true,      // playwright test 5
    "no_errors": true         // playwright test 6
  },
  "game_ready": true          // ALL above = true
}
```

---

## 🎬 START NOW

```bash
# First command - check current state
ls -la && find server -name "*.js" | wc -l && find client -name "*.jsx" | wc -l

# Then create and run FIX_EVERYTHING.sh
# Then fix any errors found
# Then run tests
# Then fix test failures
# Repeat until GAME_READY.md exists
```

**BEGIN. DO NOT STOP UNTIL http://localhost:5173 SHOWS WORKING GAME.**
