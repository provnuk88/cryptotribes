---
name: CryptoTribes MongoDB & API Developer
description: Design MongoDB schemas, build REST/WebSocket APIs, optimize queries, and manage database operations for CryptoTribes. Use when creating models, API endpoints, database migrations, or optimizing performance. Triggers on "schema", "model", "API", "endpoint", "database", "query optimization".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

# CryptoTribes MongoDB & API Developer

Specialized skill for building robust, performant database schemas and APIs for CryptoTribes multiplayer game.

## Project Context

### Database
- **MongoDB** with Mongoose ODM
- **Connection**: `server/utils/dbConnection.js`
- **Transactions**: `server/utils/dbTransactions.js` for critical operations
- **Indexes**: `server/utils/createIndexes.js` for performance

### API Architecture
- **REST API**: Express.js routes in `server/routes/`
- **WebSocket**: Socket.io for real-time updates
- **Authentication**: Wallet-based auth middleware
- **Validation**: Input validation middleware

### Existing Models
```
models/
├── User.js          - Player accounts
├── Village.js       - Player's base/camp
├── Building.js      - Building instances
├── Troop.js         - Trained units
├── TrainingQueue.js - Unit production queue
├── Payment.js       - Stripe transactions
├── PromoCode.js     - Promotional codes
├── PromoUse.js      - Promo code usage tracking
└── CrystalHistory.js - Resource transaction log
```

## When to Use This Skill

Activate when working on:
- Creating new MongoDB models/schemas
- Building REST API endpoints
- Implementing WebSocket real-time events
- Database query optimization
- Data validation and sanitization
- Transaction management for critical operations
- Migration scripts
- Database indexing for performance
- API security and rate limiting

## MongoDB Schema Patterns

### Standard Model Template
```javascript
const mongoose = require('mongoose');

// Schema definition
const EntitySchema = new mongoose.Schema({
  // Reference to User (most models need this)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Core fields with validation
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [3, 'Name must be at least 3 characters'],
    maxlength: [50, 'Name cannot exceed 50 characters']
  },

  level: {
    type: Number,
    required: true,
    default: 1,
    min: 1,
    max: 10
  },

  resources: {
    gold: { type: Number, default: 0, min: 0 },
    crystals: { type: Number, default: 0, min: 0 }
  },

  // Status fields
  status: {
    type: String,
    enum: ['active', 'inactive', 'upgrading', 'training'],
    default: 'active'
  },

  // Timestamps for time-based mechanics
  startTime: { type: Date },
  endTime: { type: Date },

  // Metadata
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  },

  // Automatic timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true, // Auto-manage createdAt/updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for query performance
EntitySchema.index({ userId: 1, status: 1 });
EntitySchema.index({ endTime: 1 }, { sparse: true });

// Virtual fields (computed properties)
EntitySchema.virtual('isComplete').get(function() {
  return this.endTime && this.endTime <= Date.now();
});

// Instance methods
EntitySchema.methods.complete = async function() {
  if (!this.isComplete) {
    throw new Error('Process not yet complete');
  }
  this.status = 'active';
  this.endTime = null;
  return this.save();
};

// Static methods
EntitySchema.statics.findByUserId = function(userId) {
  return this.find({ userId }).sort({ createdAt: -1 });
};

// Pre-save middleware
EntitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Export model
module.exports = mongoose.model('Entity', EntitySchema);
```

### Game-Specific Models

#### Territory Model
```javascript
const TerritorySchema = new mongoose.Schema({
  territoryId: {
    type: Number,
    required: true,
    unique: true,
    min: 1,
    max: 50
  },

  name: { type: String, required: true },
  tier: { type: String, enum: ['center', 'ring', 'edge'], required: true },
  terrain: { type: String, enum: ['plains', 'forest', 'hills', 'river', 'castle'], required: true },

  // Ownership
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tribe', default: null },
  capturedAt: { type: Date },

  // Garrison (defending units)
  garrison: {
    militia: { type: Number, default: 0, min: 0 },
    spearman: { type: Number, default: 0, min: 0 },
    archer: { type: Number, default: 0, min: 0 },
    cavalry: { type: Number, default: 0, min: 0 }
  },

  // NPC defense for PvPvE
  npcGarrison: {
    militia: { type: Number, default: 0 },
    spearman: { type: Number, default: 0 },
    archer: { type: Number, default: 0 },
    cavalry: { type: Number, default: 0 }
  },

  // Resources
  goldPerHour: { type: Number, default: 25 },
  vpPerHour: { type: Number, default: 25 },

  // Shield protection
  shieldUntil: { type: Date, default: null },

  updatedAt: { type: Date, default: Date.now }
});

TerritorySchema.index({ ownerId: 1, tier: 1 });
TerritorySchema.index({ shieldUntil: 1 }, { sparse: true });
```

#### Battle Model
```javascript
const BattleSchema = new mongoose.Schema({
  // Participants
  attackerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  defenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null if NPC

  // Location
  territoryId: { type: Number, required: true },
  terrain: { type: String, enum: ['plains', 'forest', 'hills', 'river', 'castle'] },

  // Armies
  attackerArmy: {
    militia: { type: Number, default: 0 },
    spearman: { type: Number, default: 0 },
    archer: { type: Number, default: 0 },
    cavalry: { type: Number, default: 0 }
  },

  defenderArmy: {
    militia: { type: Number, default: 0 },
    spearman: { type: Number, default: 0 },
    archer: { type: Number, default: 0 },
    cavalry: { type: Number, default: 0 }
  },

  // Formations
  attackerFormation: { type: String, default: 'balanced' },
  defenderFormation: { type: String, default: 'defensive' },

  // Battle calculations
  attackerPower: { type: Number, required: true },
  defenderPower: { type: Number, required: true },

  // Results
  winnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  attackerCasualties: {
    militia: { type: Number, default: 0 },
    spearman: { type: Number, default: 0 },
    archer: { type: Number, default: 0 },
    cavalry: { type: Number, default: 0 }
  },

  defenderCasualties: {
    militia: { type: Number, default: 0 },
    spearman: { type: Number, default: 0 },
    archer: { type: Number, default: 0 },
    cavalry: { type: Number, default: 0 }
  },

  // Loot
  goldLooted: { type: Number, default: 0 },
  vpGained: { type: Number, default: 0 },

  // Metadata
  duration: { type: Number }, // milliseconds
  timestamp: { type: Date, default: Date.now }
});

BattleSchema.index({ attackerId: 1, timestamp: -1 });
BattleSchema.index({ defenderId: 1, timestamp: -1 });
BattleSchema.index({ territoryId: 1, timestamp: -1 });
BattleSchema.index({ timestamp: -1 }); // For leaderboards
```

#### Tribe Model
```javascript
const TribeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  tag: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 2,
    maxlength: 5
  },

  // Leadership
  chieftainId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  captains: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Members (max 12)
  members: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['chieftain', 'captain', 'warrior'], default: 'warrior' },
    joinedAt: { type: Date, default: Date.now }
  }],

  // Resources
  treasury: {
    gold: { type: Number, default: 0, min: 0 }
  },

  // Statistics
  totalVP: { type: Number, default: 0 },
  territoriesControlled: { type: Number, default: 0 },
  battlesWon: { type: Number, default: 0 },
  battlesLost: { type: Number, default: 0 },

  // Season
  seasonId: { type: Number, required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TribeSchema.index({ seasonId: 1, totalVP: -1 }); // Leaderboard
TribeSchema.index({ 'members.userId': 1 });
TribeSchema.index({ name: 1, seasonId: 1 }, { unique: true });

// Validate max members
TribeSchema.pre('save', function(next) {
  if (this.members.length > 12) {
    next(new Error('Tribe cannot have more than 12 members'));
  }
  next();
});
```

## API Development Patterns

### REST Endpoint Template
```javascript
// server/routes/territoryRoutes.js
const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const { validateObjectId } = require('../middlewares/validators');

// GET /api/territories - List all territories
router.get('/', auth, async (req, res) => {
  try {
    const territories = await Territory.find()
      .populate('ownerId', 'name tag')
      .sort({ territoryId: 1 })
      .lean();

    res.json({
      success: true,
      count: territories.length,
      data: territories
    });
  } catch (error) {
    console.error('Get territories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territories',
      error: error.message
    });
  }
});

// GET /api/territories/:id - Get territory details
router.get('/:id', auth, validateObjectId('id'), async (req, res) => {
  try {
    const territory = await Territory.findOne({ territoryId: req.params.id })
      .populate('ownerId', 'name tag members');

    if (!territory) {
      return res.status(404).json({
        success: false,
        message: 'Territory not found'
      });
    }

    res.json({
      success: true,
      data: territory
    });
  } catch (error) {
    console.error('Get territory error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch territory',
      error: error.message
    });
  }
});

// POST /api/territories/:id/attack - Attack territory
router.post('/:id/attack', auth, async (req, res) => {
  try {
    const { army, formation } = req.body;
    const territoryId = parseInt(req.params.id);

    // Validation
    if (!army || !formation) {
      return res.status(400).json({
        success: false,
        message: 'Army and formation required'
      });
    }

    // Get territory
    const territory = await Territory.findOne({ territoryId });
    if (!territory) {
      return res.status(404).json({
        success: false,
        message: 'Territory not found'
      });
    }

    // Check shield
    if (territory.shieldUntil && territory.shieldUntil > Date.now()) {
      return res.status(403).json({
        success: false,
        message: 'Territory is protected by shield',
        shieldUntil: territory.shieldUntil
      });
    }

    // Execute battle logic (import from gameLogic.js)
    const battleResult = await executeBattle({
      attackerId: req.user.id,
      defenderId: territory.ownerId,
      territoryId,
      attackerArmy: army,
      defenderArmy: territory.garrison,
      attackerFormation: formation,
      defenderFormation: territory.formation || 'defensive',
      terrain: territory.terrain
    });

    // Emit WebSocket event
    req.io.emit('battle_completed', {
      territoryId,
      winner: battleResult.winnerId,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      data: battleResult
    });
  } catch (error) {
    console.error('Attack territory error:', error);
    res.status(500).json({
      success: false,
      message: 'Attack failed',
      error: error.message
    });
  }
});

module.exports = router;
```

### WebSocket Event Patterns
```javascript
// server/server.js - Socket.io setup
const io = require('socket.io')(server, {
  cors: { origin: '*' }
});

// Authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const user = await verifyToken(token);
    socket.userId = user.id;
    next();
  } catch (error) {
    next(new Error('Authentication failed'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);

  // Join user's tribe room
  socket.on('join_tribe', async (tribeId) => {
    socket.join(`tribe-${tribeId}`);
    socket.tribeId = tribeId;
  });

  // Real-time events
  socket.on('garrison_update', async (data) => {
    const { territoryId, units } = data;

    // Update garrison in database
    await Territory.updateOne(
      { territoryId },
      { $set: { garrison: units } }
    );

    // Broadcast to tribe
    io.to(`tribe-${socket.tribeId}`).emit('garrison_updated', {
      territoryId,
      units,
      updatedBy: socket.userId,
      timestamp: Date.now()
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});
```

## Database Optimization

### Indexing Strategy
```javascript
// server/utils/createIndexes.js
const mongoose = require('mongoose');

async function createIndexes() {
  try {
    // User indexes
    await User.collection.createIndex({ walletAddress: 1 }, { unique: true });
    await User.collection.createIndex({ email: 1 }, { sparse: true });

    // Territory indexes (most queried)
    await Territory.collection.createIndex({ territoryId: 1 }, { unique: true });
    await Territory.collection.createIndex({ ownerId: 1, tier: 1 });
    await Territory.collection.createIndex({ shieldUntil: 1 }, { sparse: true });

    // Battle indexes (for history and stats)
    await Battle.collection.createIndex({ attackerId: 1, timestamp: -1 });
    await Battle.collection.createIndex({ defenderId: 1, timestamp: -1 });
    await Battle.collection.createIndex({ territoryId: 1, timestamp: -1 });
    await Battle.collection.createIndex({ timestamp: -1 }); // Recent battles

    // Tribe indexes (leaderboards)
    await Tribe.collection.createIndex({ seasonId: 1, totalVP: -1 });
    await Tribe.collection.createIndex({ 'members.userId': 1 });

    // Building/Troop indexes
    await Building.collection.createIndex({ userId: 1, buildingType: 1 });
    await Troop.collection.createIndex({ userId: 1 });
    await TrainingQueue.collection.createIndex({ userId: 1, endTime: 1 });

    console.log('✅ All indexes created successfully');
  } catch (error) {
    console.error('❌ Index creation failed:', error);
  }
}

module.exports = { createIndexes };
```

### Transaction Management
```javascript
// server/utils/dbTransactions.js
const mongoose = require('mongoose');

async function executeBattleTransaction(battleData) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Create battle record
    const battle = await Battle.create([battleData], { session });

    // 2. Update attacker units (subtract casualties)
    await Troop.updateOne(
      { userId: battleData.attackerId },
      { $inc: {
        militia: -battleData.attackerCasualties.militia,
        spearman: -battleData.attackerCasualties.spearman,
        archer: -battleData.attackerCasualties.archer,
        cavalry: -battleData.attackerCasualties.cavalry
      }},
      { session }
    );

    // 3. Update territory ownership if attacker won
    if (battleData.winnerId.equals(battleData.attackerId)) {
      await Territory.updateOne(
        { territoryId: battleData.territoryId },
        {
          ownerId: battleData.attackerId,
          garrison: battleData.attackerArmy,
          capturedAt: new Date()
        },
        { session }
      );
    }

    // 4. Update VP and stats
    await User.updateOne(
      { _id: battleData.winnerId },
      { $inc: { totalVP: battleData.vpGained } },
      { session }
    );

    // Commit transaction
    await session.commitTransaction();
    return battle[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

module.exports = { executeBattleTransaction };
```

### Query Optimization
```javascript
// BAD: N+1 query problem
const users = await User.find({ tribeId });
for (const user of users) {
  const buildings = await Building.find({ userId: user._id }); // N queries!
}

// GOOD: Use aggregation pipeline
const usersWithBuildings = await User.aggregate([
  { $match: { tribeId } },
  {
    $lookup: {
      from: 'buildings',
      localField: '_id',
      foreignField: 'userId',
      as: 'buildings'
    }
  }
]);

// GOOD: Lean queries for read-only data
const territories = await Territory.find().lean(); // Returns plain objects, faster

// GOOD: Select only needed fields
const users = await User.find().select('name level gold').lean();

// GOOD: Limit results for pagination
const battles = await Battle.find()
  .sort({ timestamp: -1 })
  .limit(50)
  .skip(page * 50);
```

## Validation & Security

### Input Validation Middleware
```javascript
// server/middlewares/validators.js
const { body, param, validationResult } = require('express-validator');

const validateBattle = [
  body('army.militia').isInt({ min: 0, max: 1000 }),
  body('army.spearman').isInt({ min: 0, max: 1000 }),
  body('army.archer').isInt({ min: 0, max: 1000 }),
  body('army.cavalry').isInt({ min: 0, max: 1000 }),
  body('formation').isIn(['offensive', 'defensive', 'balanced']),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  }
];

module.exports = { validateBattle };
```

### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

const battleLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 battles per minute
  message: 'Battle rate limit exceeded'
});

router.post('/territories/:id/attack', auth, battleLimiter, validateBattle, ...);
```

## Migration Scripts

```javascript
// migrations/001-add-terrain-to-territories.js
const mongoose = require('mongoose');
const Territory = require('../models/Territory');

async function up() {
  console.log('Adding terrain field to territories...');

  const terrainMap = {
    1: 'castle', 2: 'castle', 3: 'castle', 4: 'castle', 5: 'castle', // Center
    6: 'hills', 7: 'hills', 8: 'forest', 9: 'forest', 10: 'river', // Ring
    // ... etc
  };

  for (const [territoryId, terrain] of Object.entries(terrainMap)) {
    await Territory.updateOne(
      { territoryId: parseInt(territoryId) },
      { $set: { terrain } }
    );
  }

  console.log('✅ Migration complete');
}

async function down() {
  console.log('Removing terrain field...');
  await Territory.updateMany({}, { $unset: { terrain: '' } });
  console.log('✅ Rollback complete');
}

module.exports = { up, down };
```

## Testing

```javascript
// tests/api/territory.test.js
const request = require('supertest');
const app = require('../../server/server');
const Territory = require('../../models/Territory');

describe('Territory API', () => {
  let authToken;

  beforeAll(async () => {
    // Setup test database
    authToken = await getTestAuthToken();
  });

  it('should list all territories', async () => {
    const res = await request(app)
      .get('/api/territories')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(50);
  });

  it('should attack territory successfully', async () => {
    const res = await request(app)
      .post('/api/territories/21/attack')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        army: { militia: 50, spearman: 20, archer: 10, cavalry: 5 },
        formation: 'offensive'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('winnerId');
  });
});
```

## Quick Commands

```bash
# Create indexes
node server/utils/createIndexes.js

# Run migration
node migrations/001-add-terrain-to-territories.js

# Test API endpoints
npm run test:api

# Check database connection
node -e "require('./server/utils/dbConnection'); console.log('✅ Connected')"

# Seed test data
node scripts/seedDatabase.js
```

## Best Practices Checklist

✅ Use transactions for multi-document operations
✅ Create indexes on frequently queried fields
✅ Use `.lean()` for read-only queries
✅ Validate all user inputs
✅ Implement rate limiting on critical endpoints
✅ Use aggregation pipeline for complex queries
✅ Emit WebSocket events for real-time updates
✅ Log errors with context
✅ Return consistent JSON response format
✅ Handle edge cases (null, undefined, empty arrays)

---

**Remember**: CryptoTribes is a real-time multiplayer game with 1000 concurrent players. Performance, security, and data consistency are critical.
