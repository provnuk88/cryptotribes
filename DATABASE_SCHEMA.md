# CryptoTribes - Database Schema Documentation

**Version**: 1.0
**Last Updated**: 2025-12-01
**Database**: MongoDB 6.0+
**ODM**: Mongoose 7.0+

---

## Table of Contents

1. [Schema Overview](#1-schema-overview)
2. [User Collection](#2-user-collection)
3. [Tribe Collection](#3-tribe-collection)
4. [Territory Collection](#4-territory-collection)
5. [Battle Collection](#5-battle-collection)
6. [Season Collection](#6-season-collection)
7. [Payment Collection](#7-payment-collection)
8. [Indexes & Performance](#8-indexes--performance)
9. [Relationships Diagram](#9-relationships-diagram)
10. [Mongoose Models Implementation](#10-mongoose-models-implementation)
11. [Database Utilities](#11-database-utilities)

---

## 1. Schema Overview

### 1.1 Collections Summary

| Collection | Purpose | Estimated Docs | Size Est. |
|------------|---------|----------------|-----------|
| **users** | Player profiles, resources, armies, buildings | 1,000 per season | ~500KB |
| **tribes** | 12-player groups competing for prizes | ~83 per season | ~50KB |
| **territories** | 50 map territories with garrisons | 50 per season | ~25KB |
| **battles** | Battle history and results | ~10,000 per season | ~5MB |
| **seasons** | Season configuration and winners | 1 per season | ~5KB |
| **payments** | Entry fees and prize payouts | ~1,000 per season | ~100KB |

**Total Storage per Season**: ~6MB
**Expected Growth**: 6MB per 10-day season × 36 seasons/year = ~216MB/year

### 1.2 Database Connection

```javascript
// server/utils/dbConnection.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

---

## 2. User Collection

### 2.1 Schema Definition

```javascript
// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Identity
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: (v) => /^0x[a-fA-F0-9]{40}$/.test(v),
      message: 'Invalid Ethereum address'
    }
  },

  username: {
    type: String,
    trim: true,
    minlength: 3,
    maxlength: 20,
    default: null
  },

  // Season Context
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },

  tribeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe',
    default: null,
    index: true
  },

  tribeRole: {
    type: String,
    enum: ['chieftain', 'captain', 'warrior', null],
    default: null
  },

  // Resources
  gold: {
    type: Number,
    default: 1000,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'Gold must be an integer'
    }
  },

  goldCapacity: {
    type: Number,
    default: 1000,
    min: 1000
  },

  goldProtection: {
    type: Number,
    default: 0,
    min: 0,
    max: 1,
    get: (v) => Math.round(v * 100) / 100
  },

  // Army
  army: {
    militia: {
      type: Number,
      default: 0,
      min: 0
    },
    spearman: {
      type: Number,
      default: 0,
      min: 0
    },
    archer: {
      type: Number,
      default: 0,
      min: 0
    },
    cavalry: {
      type: Number,
      default: 0,
      min: 0
    }
  },

  armyCap: {
    type: Number,
    default: 500,
    min: 500
  },

  // Buildings
  buildings: {
    barracks: {
      level: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
      },
      upgrading: {
        type: Boolean,
        default: false
      },
      upgradeStartTime: {
        type: Date,
        default: null
      },
      upgradeEndTime: {
        type: Date,
        default: null
      }
    },
    warehouse: {
      level: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
      },
      upgrading: {
        type: Boolean,
        default: false
      },
      upgradeStartTime: {
        type: Date,
        default: null
      },
      upgradeEndTime: {
        type: Date,
        default: null
      }
    },
    workshop: {
      level: {
        type: Number,
        default: 1,
        min: 1,
        max: 10
      },
      upgrading: {
        type: Boolean,
        default: false
      },
      upgradeStartTime: {
        type: Date,
        default: null
      },
      upgradeEndTime: {
        type: Date,
        default: null
      }
    }
  },

  // Training Queue
  trainingQueue: [{
    unitType: {
      type: String,
      enum: ['militia', 'spearman', 'archer', 'cavalry'],
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      required: true
    },
    queuePosition: {
      type: Number,
      required: true,
      min: 1
    }
  }],

  // Victory Points
  victoryPoints: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },

  vpRank: {
    type: Number,
    default: null,
    min: 1,
    index: true
  },

  // Anti-Cheat
  walletAge: {
    type: Date,
    default: null
  },

  transactionCount: {
    type: Number,
    default: 0,
    min: 0
  },

  behaviorScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  flagged: {
    type: Boolean,
    default: false
  },

  flagReason: {
    type: String,
    default: null
  },

  // Metadata
  version: {
    type: Number,
    default: 0
  },

  lastActive: {
    type: Date,
    default: Date.now
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes
userSchema.index({ walletAddress: 1 }, { unique: true });
userSchema.index({ seasonId: 1, victoryPoints: -1 });
userSchema.index({ tribeId: 1 });
userSchema.index({ vpRank: 1 });
userSchema.index({ seasonId: 1, walletAddress: 1 });

// Virtual: Total Army Count
userSchema.virtual('totalArmyCount').get(function() {
  return this.army.militia + this.army.spearman + this.army.archer + this.army.cavalry;
});

// Virtual: Total Building Levels
userSchema.virtual('totalBuildingLevels').get(function() {
  return this.buildings.barracks.level +
         this.buildings.warehouse.level +
         this.buildings.workshop.level;
});

// Pre-save: Update armyCap based on building levels
userSchema.pre('save', function(next) {
  this.armyCap = 500 + (this.totalBuildingLevels * 10);
  this.updatedAt = Date.now();
  next();
});

// Pre-save: Update goldCapacity and protection from warehouse
userSchema.pre('save', function(next) {
  const warehouseLevel = this.buildings.warehouse.level;
  this.goldCapacity = 1000 + ((warehouseLevel - 1) * 2000);
  this.goldProtection = Math.min(warehouseLevel * 0.05, 0.5);
  next();
});

module.exports = mongoose.model('User', userSchema);
```

### 2.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **walletAddress** | String | Ethereum wallet (unique identifier) | required |
| **username** | String | Display name (3-20 chars) | null |
| **seasonId** | ObjectId | Current season reference | required |
| **tribeId** | ObjectId | Tribe membership (null if solo) | null |
| **tribeRole** | String | Role in tribe (chieftain/captain/warrior) | null |
| **gold** | Number | Current gold balance | 1000 |
| **goldCapacity** | Number | Max gold storage (from warehouse) | 1000 |
| **goldProtection** | Number | % protected when raided (0-1) | 0 |
| **army.militia** | Number | Militia unit count | 0 |
| **army.spearman** | Number | Spearman unit count | 0 |
| **army.archer** | Number | Archer unit count | 0 |
| **army.cavalry** | Number | Cavalry unit count | 0 |
| **armyCap** | Number | Max army size (500 + building levels × 10) | 500 |
| **buildings.barracks** | Object | Barracks state (level, upgrading, times) | level: 1 |
| **buildings.warehouse** | Object | Warehouse state | level: 1 |
| **buildings.workshop** | Object | Workshop state | level: 1 |
| **trainingQueue** | Array | Active unit training queue | [] |
| **victoryPoints** | Number | Accumulated VP this season | 0 |
| **vpRank** | Number | Current rank in leaderboard | null |
| **walletAge** | Date | Wallet creation date (anti-sybil) | null |
| **transactionCount** | Number | Historical transaction count | 0 |
| **behaviorScore** | Number | Trust score 0-100 | 100 |
| **flagged** | Boolean | Flagged for review | false |
| **version** | Number | Optimistic locking version | 0 |
| **lastActive** | Date | Last API request | now |

### 2.3 Example Document

```json
{
  "_id": "507f1f77bcf86cd799439011",
  "walletAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "username": "WarriorKing",
  "seasonId": "507f1f77bcf86cd799439016",
  "tribeId": "507f1f77bcf86cd799439012",
  "tribeRole": "chieftain",
  "gold": 2500,
  "goldCapacity": 5000,
  "goldProtection": 0.25,
  "army": {
    "militia": 150,
    "spearman": 80,
    "archer": 50,
    "cavalry": 20
  },
  "armyCap": 530,
  "buildings": {
    "barracks": {
      "level": 5,
      "upgrading": false,
      "upgradeStartTime": null,
      "upgradeEndTime": null
    },
    "warehouse": {
      "level": 4,
      "upgrading": true,
      "upgradeStartTime": "2025-12-01T10:00:00.000Z",
      "upgradeEndTime": "2025-12-01T14:00:00.000Z"
    },
    "workshop": {
      "level": 3,
      "upgrading": false,
      "upgradeStartTime": null,
      "upgradeEndTime": null
    }
  },
  "trainingQueue": [
    {
      "unitType": "cavalry",
      "quantity": 10,
      "startTime": "2025-12-01T12:00:00.000Z",
      "endTime": "2025-12-01T12:30:00.000Z",
      "queuePosition": 1
    }
  ],
  "victoryPoints": 1250,
  "vpRank": 42,
  "walletAge": "2023-01-15T00:00:00.000Z",
  "transactionCount": 450,
  "behaviorScore": 95,
  "flagged": false,
  "version": 12,
  "lastActive": "2025-12-01T12:15:00.000Z",
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-12-01T12:15:00.000Z"
}
```

---

## 3. Tribe Collection

### 3.1 Schema Definition

```javascript
// models/Tribe.js
const mongoose = require('mongoose');

const tribeSchema = new mongoose.Schema({
  // Identity
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },

  tag: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    minlength: 2,
    maxlength: 4
  },

  emblem: {
    type: String,
    default: null,
    validate: {
      validator: (v) => !v || /^https?:\/\/.+/.test(v),
      message: 'Invalid URL'
    }
  },

  // Season Context
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },

  // Members (12 max)
  chieftain: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  captains: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  warriors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Performance
  totalVP: {
    type: Number,
    default: 0,
    min: 0,
    index: true
  },

  tribeRank: {
    type: Number,
    default: null,
    min: 1,
    index: true
  },

  territoriesControlled: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Territory'
  }],

  // Prizes (will be filled at season end)
  prizePool: {
    type: Number,
    default: 0,
    min: 0
  },

  prizeDistributed: {
    type: Boolean,
    default: false
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
tribeSchema.index({ seasonId: 1, totalVP: -1 });
tribeSchema.index({ seasonId: 1, name: 1 }, { unique: true });
tribeSchema.index({ chieftain: 1 });

// Validation: Max 12 members
tribeSchema.pre('save', function(next) {
  const memberCount = 1 + this.captains.length + this.warriors.length;
  if (memberCount > 12) {
    return next(new Error('Tribe cannot have more than 12 members'));
  }
  next();
});

// Validation: Max 2 captains
tribeSchema.pre('save', function(next) {
  if (this.captains.length > 2) {
    return next(new Error('Tribe cannot have more than 2 captains'));
  }
  next();
});

// Virtual: Total Member Count
tribeSchema.virtual('memberCount').get(function() {
  return 1 + this.captains.length + this.warriors.length;
});

module.exports = mongoose.model('Tribe', tribeSchema);
```

### 3.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **name** | String | Tribe name (3-30 chars, unique per season) | required |
| **tag** | String | Short tag (2-4 chars, uppercase) | required |
| **emblem** | String | URL to tribe emblem image | null |
| **seasonId** | ObjectId | Season reference | required |
| **chieftain** | ObjectId | Leader (1 required) | required |
| **captains** | Array[ObjectId] | Officers (max 2) | [] |
| **warriors** | Array[ObjectId] | Members (max 9) | [] |
| **totalVP** | Number | Sum of all members' VP | 0 |
| **tribeRank** | Number | Rank in season leaderboard | null |
| **territoriesControlled** | Array[ObjectId] | Territories owned by tribe | [] |
| **prizePool** | Number | USDT allocated to tribe (season end) | 0 |
| **prizeDistributed** | Boolean | Prizes paid out | false |

### 3.3 Example Document

```json
{
  "_id": "507f1f77bcf86cd799439012",
  "name": "Warriors of Winter",
  "tag": "WOW",
  "emblem": "https://cdn.cryptotribes.io/emblems/wow.png",
  "seasonId": "507f1f77bcf86cd799439016",
  "chieftain": "507f1f77bcf86cd799439011",
  "captains": [
    "507f1f77bcf86cd799439013",
    "507f1f77bcf86cd799439014"
  ],
  "warriors": [
    "507f1f77bcf86cd799439015",
    "507f1f77bcf86cd799439016",
    "507f1f77bcf86cd799439017",
    "507f1f77bcf86cd799439018",
    "507f1f77bcf86cd799439019",
    "507f1f77bcf86cd799439020",
    "507f1f77bcf86cd799439021",
    "507f1f77bcf86cd799439022",
    "507f1f77bcf86cd799439023"
  ],
  "totalVP": 18500,
  "tribeRank": 3,
  "territoriesControlled": [
    "507f1f77bcf86cd799439030",
    "507f1f77bcf86cd799439031",
    "507f1f77bcf86cd799439032"
  ],
  "prizePool": 0,
  "prizeDistributed": false,
  "createdAt": "2025-11-25T10:00:00.000Z",
  "updatedAt": "2025-12-01T12:00:00.000Z"
}
```

---

## 4. Territory Collection

### 4.1 Schema Definition

```javascript
// models/Territory.js
const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema({
  // Identity
  territoryId: {
    type: Number,
    required: true,
    min: 1,
    max: 50
  },

  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },

  // Geography
  tier: {
    type: String,
    enum: ['center', 'ring', 'edge'],
    required: true
  },

  terrain: {
    type: String,
    enum: ['castle', 'forest', 'hills', 'river', 'plains'],
    required: true
  },

  coordinates: {
    x: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    },
    y: {
      type: Number,
      required: true,
      min: 0,
      max: 10
    }
  },

  // Ownership
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe',
    default: null,
    index: true
  },

  controlledSince: {
    type: Date,
    default: null
  },

  // Garrison
  garrison: {
    tribeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      default: null
    },
    units: {
      militia: {
        type: Number,
        default: 0,
        min: 0
      },
      spearman: {
        type: Number,
        default: 0,
        min: 0
      },
      archer: {
        type: Number,
        default: 0,
        min: 0
      },
      cavalry: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    formation: {
      type: String,
      enum: ['offensive', 'balanced', 'defensive', null],
      default: null
    },
    lastUpdated: {
      type: Date,
      default: null
    }
  },

  // NPC Defenders (if unclaimed)
  npcDefense: {
    units: {
      militia: {
        type: Number,
        default: 0
      },
      spearman: {
        type: Number,
        default: 0
      },
      archer: {
        type: Number,
        default: 0
      },
      cavalry: {
        type: Number,
        default: 0
      }
    },
    difficulty: {
      type: String,
      enum: ['elite', 'strong', 'weak'],
      default: 'weak'
    }
  },

  // Economy
  goldGeneration: {
    type: Number,
    required: true,
    min: 0
  },

  vpGeneration: {
    type: Number,
    required: true,
    min: 0
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
territorySchema.index({ territoryId: 1, seasonId: 1 }, { unique: true });
territorySchema.index({ ownerId: 1 });
territorySchema.index({ seasonId: 1 });
territorySchema.index({ tier: 1 });

// Virtual: Is Claimed
territorySchema.virtual('isClaimed').get(function() {
  return this.ownerId !== null;
});

// Virtual: Total Garrison Count
territorySchema.virtual('garrisonCount').get(function() {
  if (!this.garrison || !this.garrison.units) return 0;
  return this.garrison.units.militia +
         this.garrison.units.spearman +
         this.garrison.units.archer +
         this.garrison.units.cavalry;
});

module.exports = mongoose.model('Territory', territorySchema);
```

### 4.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **territoryId** | Number | Territory ID (1-50, unique per season) | required |
| **seasonId** | ObjectId | Season reference | required |
| **tier** | String | Territory tier (center/ring/edge) | required |
| **terrain** | String | Terrain type (castle/forest/hills/river/plains) | required |
| **coordinates** | Object | Map position {x, y} | required |
| **ownerId** | ObjectId | Owning tribe (null if unclaimed) | null |
| **controlledSince** | Date | Capture timestamp | null |
| **garrison.tribeId** | ObjectId | Tribe with garrison present | null |
| **garrison.units** | Object | Units stationed {militia, spearman, archer, cavalry} | all 0 |
| **garrison.formation** | String | Formation type (offensive/balanced/defensive) | null |
| **garrison.lastUpdated** | Date | Last garrison change | null |
| **npcDefense.units** | Object | NPC defender units | varies |
| **npcDefense.difficulty** | String | NPC strength (elite/strong/weak) | weak |
| **goldGeneration** | Number | Gold/hour for garrison | 25/50/100 |
| **vpGeneration** | Number | VP/hour for garrison | 25/50/100 |

### 4.3 Territory Tier Configuration

| Tier | IDs | VP/hour | Gold/hour | NPC Difficulty | Count |
|------|-----|---------|-----------|----------------|-------|
| **Center** | 1-5 | 100 | 100 | Elite | 5 |
| **Ring** | 6-20 | 50 | 50 | Strong | 15 |
| **Edge** | 21-50 | 25 | 25 | Weak | 30 |

### 4.4 Example Document

```json
{
  "_id": "507f1f77bcf86cd799439030",
  "territoryId": 1,
  "seasonId": "507f1f77bcf86cd799439016",
  "tier": "center",
  "terrain": "castle",
  "coordinates": {
    "x": 5,
    "y": 5
  },
  "ownerId": "507f1f77bcf86cd799439012",
  "controlledSince": "2025-11-28T10:00:00.000Z",
  "garrison": {
    "tribeId": "507f1f77bcf86cd799439012",
    "units": {
      "militia": 200,
      "spearman": 100,
      "archer": 80,
      "cavalry": 40
    },
    "formation": "defensive",
    "lastUpdated": "2025-12-01T11:30:00.000Z"
  },
  "npcDefense": {
    "units": {
      "militia": 300,
      "spearman": 150,
      "archer": 100,
      "cavalry": 50
    },
    "difficulty": "elite"
  },
  "goldGeneration": 100,
  "vpGeneration": 100,
  "createdAt": "2025-11-25T00:00:00.000Z",
  "updatedAt": "2025-12-01T11:30:00.000Z"
}
```

---

## 5. Battle Collection

### 5.1 Schema Definition

```javascript
// models/Battle.js
const mongoose = require('mongoose');

const battleSchema = new mongoose.Schema({
  // Season Context
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },

  // Battle Type
  battleType: {
    type: String,
    enum: ['pvp', 'pve_npc', 'pve_raid'],
    required: true
  },

  // Participants
  attackerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  attackerTribeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe',
    default: null
  },

  defenderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },

  defenderTribeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tribe',
    default: null
  },

  // Location
  territoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Territory',
    default: null,
    index: true
  },

  terrain: {
    type: String,
    enum: ['castle', 'forest', 'hills', 'river', 'plains'],
    required: true
  },

  // Armies
  attackerArmy: {
    militia: {
      type: Number,
      required: true,
      min: 0
    },
    spearman: {
      type: Number,
      required: true,
      min: 0
    },
    archer: {
      type: Number,
      required: true,
      min: 0
    },
    cavalry: {
      type: Number,
      required: true,
      min: 0
    }
  },

  defenderArmy: {
    militia: {
      type: Number,
      required: true,
      min: 0
    },
    spearman: {
      type: Number,
      required: true,
      min: 0
    },
    archer: {
      type: Number,
      required: true,
      min: 0
    },
    cavalry: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // Battle Mechanics
  attackerFormation: {
    type: String,
    enum: ['offensive', 'balanced', 'defensive'],
    required: true
  },

  defenderFormation: {
    type: String,
    enum: ['offensive', 'balanced', 'defensive'],
    required: true
  },

  attackerPower: {
    type: Number,
    required: true,
    min: 0
  },

  defenderPower: {
    type: Number,
    required: true,
    min: 0
  },

  rngVariance: {
    type: Number,
    default: 0,
    min: -0.1,
    max: 0.1
  },

  rngSeed: {
    type: String,
    required: true
  },

  // Results
  winnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  casualties: {
    attacker: {
      militia: {
        type: Number,
        default: 0
      },
      spearman: {
        type: Number,
        default: 0
      },
      archer: {
        type: Number,
        default: 0
      },
      cavalry: {
        type: Number,
        default: 0
      }
    },
    defender: {
      militia: {
        type: Number,
        default: 0
      },
      spearman: {
        type: Number,
        default: 0
      },
      archer: {
        type: Number,
        default: 0
      },
      cavalry: {
        type: Number,
        default: 0
      }
    }
  },

  // Rewards
  vpAwarded: {
    attacker: {
      type: Number,
      default: 0
    },
    defender: {
      type: Number,
      default: 0
    }
  },

  goldLooted: {
    type: Number,
    default: 0,
    min: 0
  },

  territoryTransferred: {
    type: Boolean,
    default: false
  },

  // Processing
  status: {
    type: String,
    enum: ['queued', 'processing', 'completed', 'failed'],
    default: 'queued'
  },

  battleStartTime: {
    type: Date,
    default: Date.now
  },

  battleEndTime: {
    type: Date,
    default: null
  },

  processingTimeMs: {
    type: Number,
    default: 0
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  }
}, {
  timestamps: false
});

// Indexes
battleSchema.index({ attackerId: 1, createdAt: -1 });
battleSchema.index({ defenderId: 1, createdAt: -1 });
battleSchema.index({ territoryId: 1, createdAt: -1 });
battleSchema.index({ seasonId: 1, createdAt: -1 });
battleSchema.index({ status: 1 });

// Virtual: Battle Duration
battleSchema.virtual('duration').get(function() {
  if (!this.battleEndTime) return null;
  return this.battleEndTime - this.battleStartTime;
});

module.exports = mongoose.model('Battle', battleSchema);
```

### 5.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **seasonId** | ObjectId | Season reference | required |
| **battleType** | String | Type (pvp/pve_npc/pve_raid) | required |
| **attackerId** | ObjectId | Attacking user | required |
| **attackerTribeId** | ObjectId | Attacker's tribe | null |
| **defenderId** | ObjectId | Defending user (null if NPC) | null |
| **defenderTribeId** | ObjectId | Defender's tribe | null |
| **territoryId** | ObjectId | Territory being fought over | null |
| **terrain** | String | Terrain type (affects modifiers) | required |
| **attackerArmy** | Object | Attacker's units {militia, spearman, archer, cavalry} | required |
| **defenderArmy** | Object | Defender's units | required |
| **attackerFormation** | String | Attacker's formation | required |
| **defenderFormation** | String | Defender's formation | required |
| **attackerPower** | Number | Calculated battle power | required |
| **defenderPower** | Number | Calculated battle power | required |
| **rngVariance** | Number | ±10% RNG applied (-0.1 to 0.1) | 0 |
| **rngSeed** | String | Seed for deterministic replay | required |
| **winnerId** | ObjectId | Winner user ID | required |
| **casualties** | Object | Units lost {attacker: {...}, defender: {...}} | all 0 |
| **vpAwarded** | Object | VP gained {attacker, defender} | 0 |
| **goldLooted** | Number | Gold stolen (if raid) | 0 |
| **territoryTransferred** | Boolean | Territory captured | false |
| **status** | String | Processing status | 'queued' |
| **processingTimeMs** | Number | Battle calculation time | 0 |

### 5.3 Example Document

```json
{
  "_id": "507f1f77bcf86cd799439040",
  "seasonId": "507f1f77bcf86cd799439016",
  "battleType": "pvp",
  "attackerId": "507f1f77bcf86cd799439011",
  "attackerTribeId": "507f1f77bcf86cd799439012",
  "defenderId": "507f1f77bcf86cd799439013",
  "defenderTribeId": "507f1f77bcf86cd799439014",
  "territoryId": "507f1f77bcf86cd799439030",
  "terrain": "castle",
  "attackerArmy": {
    "militia": 50,
    "spearman": 30,
    "archer": 20,
    "cavalry": 10
  },
  "defenderArmy": {
    "militia": 80,
    "spearman": 20,
    "archer": 40,
    "cavalry": 5
  },
  "attackerFormation": "offensive",
  "defenderFormation": "defensive",
  "attackerPower": 45300,
  "defenderPower": 42100,
  "rngVariance": 0.05,
  "rngSeed": "a1b2c3d4e5f6",
  "winnerId": "507f1f77bcf86cd799439011",
  "casualties": {
    "attacker": {
      "militia": 18,
      "spearman": 10,
      "archer": 6,
      "cavalry": 3
    },
    "defender": {
      "militia": 48,
      "spearman": 12,
      "archer": 24,
      "cavalry": 3
    }
  },
  "vpAwarded": {
    "attacker": 187,
    "defender": 50
  },
  "goldLooted": 0,
  "territoryTransferred": true,
  "status": "completed",
  "battleStartTime": "2025-12-01T12:00:00.000Z",
  "battleEndTime": "2025-12-01T12:00:05.234Z",
  "processingTimeMs": 5234,
  "createdAt": "2025-12-01T12:00:00.000Z"
}
```

---

## 6. Season Collection

### 6.1 Schema Definition

```javascript
// models/Season.js
const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema({
  // Identity
  seasonNumber: {
    type: Number,
    required: true,
    unique: true,
    min: 1
  },

  name: {
    type: String,
    required: true,
    trim: true
  },

  // Timeline
  registrationStart: {
    type: Date,
    required: true
  },

  registrationEnd: {
    type: Date,
    required: true
  },

  seasonStart: {
    type: Date,
    required: true
  },

  seasonEnd: {
    type: Date,
    required: true
  },

  prizeDistributionDate: {
    type: Date,
    default: null
  },

  // Status
  status: {
    type: String,
    enum: ['registration', 'active', 'ended', 'paid_out'],
    default: 'registration',
    index: true
  },

  // Participants
  registeredPlayers: {
    type: Number,
    default: 0,
    min: 0
  },

  activeTribes: {
    type: Number,
    default: 0,
    min: 0
  },

  // Prize Pool
  entryFee: {
    type: Number,
    required: true,
    default: 25
  },

  totalPrizePool: {
    type: Number,
    default: 0,
    min: 0
  },

  platformFee: {
    type: Number,
    default: 0,
    min: 0
  },

  // Winners
  winningTribes: [{
    rank: {
      type: Number,
      required: true,
      min: 1,
      max: 10
    },
    tribeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tribe',
      required: true
    },
    prizeAmount: {
      type: Number,
      required: true,
      min: 0
    },
    paid: {
      type: Boolean,
      default: false
    }
  }],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
seasonSchema.index({ seasonNumber: 1 }, { unique: true });
seasonSchema.index({ status: 1 });
seasonSchema.index({ seasonStart: 1 });

// Virtual: Duration in Days
seasonSchema.virtual('durationDays').get(function() {
  return Math.ceil((this.seasonEnd - this.seasonStart) / (1000 * 60 * 60 * 24));
});

// Pre-save: Calculate prize pool
seasonSchema.pre('save', function(next) {
  this.totalPrizePool = this.registeredPlayers * 21.25;
  this.platformFee = this.registeredPlayers * 3.75;
  next();
});

module.exports = mongoose.model('Season', seasonSchema);
```

### 6.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **seasonNumber** | Number | Season number (1, 2, 3...) | required |
| **name** | String | Season display name | required |
| **registrationStart** | Date | Registration opens | required |
| **registrationEnd** | Date | Registration closes | required |
| **seasonStart** | Date | Season begins | required |
| **seasonEnd** | Date | Season ends (10 days after start) | required |
| **prizeDistributionDate** | Date | Prizes distributed | null |
| **status** | String | Current status (registration/active/ended/paid_out) | 'registration' |
| **registeredPlayers** | Number | Total players registered | 0 |
| **activeTribes** | Number | Total tribes formed | 0 |
| **entryFee** | Number | Entry fee per player (USDT) | 25 |
| **totalPrizePool** | Number | Total prize pool (registeredPlayers × 21.25) | 0 |
| **platformFee** | Number | Platform revenue (registeredPlayers × 3.75) | 0 |
| **winningTribes** | Array | Top 10 tribes with prizes | [] |

### 6.3 Example Document

```json
{
  "_id": "507f1f77bcf86cd799439016",
  "seasonNumber": 1,
  "name": "Season 1: Winter Conquest",
  "registrationStart": "2025-11-20T00:00:00.000Z",
  "registrationEnd": "2025-11-24T23:59:59.999Z",
  "seasonStart": "2025-11-25T00:00:00.000Z",
  "seasonEnd": "2025-12-04T23:59:59.999Z",
  "prizeDistributionDate": null,
  "status": "active",
  "registeredPlayers": 1000,
  "activeTribes": 83,
  "entryFee": 25,
  "totalPrizePool": 21250,
  "platformFee": 3750,
  "winningTribes": [],
  "createdAt": "2025-11-20T00:00:00.000Z",
  "updatedAt": "2025-12-01T12:00:00.000Z"
}
```

---

## 7. Payment Collection

### 7.1 Schema Definition

```javascript
// models/Payment.js
const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  walletAddress: {
    type: String,
    required: true,
    lowercase: true
  },

  // Transaction
  type: {
    type: String,
    enum: ['entry_fee', 'prize_payout'],
    required: true
  },

  amount: {
    type: Number,
    required: true,
    min: 0
  },

  currency: {
    type: String,
    default: 'USDT',
    uppercase: true
  },

  // Payment Method
  method: {
    type: String,
    enum: ['crypto', 'stripe'],
    required: true
  },

  stripePaymentIntentId: {
    type: String,
    default: null,
    index: true
  },

  cryptoTxHash: {
    type: String,
    default: null,
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    index: true
  },

  errorMessage: {
    type: String,
    default: null
  },

  // Season Context
  seasonId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
    index: true
  },

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ userId: 1, createdAt: -1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ seasonId: 1 });
paymentSchema.index({ stripePaymentIntentId: 1 });
paymentSchema.index({ cryptoTxHash: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
```

### 7.2 Field Descriptions

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| **userId** | ObjectId | User reference | required |
| **walletAddress** | String | User's wallet address | required |
| **type** | String | Transaction type (entry_fee/prize_payout) | required |
| **amount** | Number | Amount in USDT | required |
| **currency** | String | Currency code | 'USDT' |
| **method** | String | Payment method (crypto/stripe) | required |
| **stripePaymentIntentId** | String | Stripe payment intent ID | null |
| **cryptoTxHash** | String | Blockchain transaction hash | null |
| **status** | String | Status (pending/completed/failed/refunded) | 'pending' |
| **errorMessage** | String | Error details if failed | null |
| **seasonId** | ObjectId | Season reference | required |

### 7.3 Example Documents

**Entry Fee Payment:**
```json
{
  "_id": "507f1f77bcf86cd799439050",
  "userId": "507f1f77bcf86cd799439011",
  "walletAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "type": "entry_fee",
  "amount": 25,
  "currency": "USDT",
  "method": "stripe",
  "stripePaymentIntentId": "pi_1J3K4L5M6N7O8P9Q",
  "cryptoTxHash": null,
  "status": "completed",
  "errorMessage": null,
  "seasonId": "507f1f77bcf86cd799439016",
  "createdAt": "2025-11-24T10:00:00.000Z",
  "updatedAt": "2025-11-24T10:00:05.000Z"
}
```

**Prize Payout:**
```json
{
  "_id": "507f1f77bcf86cd799439051",
  "userId": "507f1f77bcf86cd799439011",
  "walletAddress": "0x742d35cc6634c0532925a3b844bc9e7595f0beb",
  "type": "prize_payout",
  "amount": 1275,
  "currency": "USDT",
  "method": "crypto",
  "stripePaymentIntentId": null,
  "cryptoTxHash": "0xabc123def456...",
  "status": "completed",
  "errorMessage": null,
  "seasonId": "507f1f77bcf86cd799439016",
  "createdAt": "2025-12-05T12:00:00.000Z",
  "updatedAt": "2025-12-05T12:05:00.000Z"
}
```

---

## 8. Indexes & Performance

### 8.1 Critical Indexes

```javascript
// server/utils/createIndexes.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const Battle = require('../models/Battle');
const Season = require('../models/Season');
const Payment = require('../models/Payment');

async function createIndexes() {
  console.log('Creating database indexes...');

  try {
    // User indexes
    await User.collection.createIndex({ walletAddress: 1 }, { unique: true });
    await User.collection.createIndex({ seasonId: 1, victoryPoints: -1 });
    await User.collection.createIndex({ tribeId: 1 });
    await User.collection.createIndex({ vpRank: 1 });
    await User.collection.createIndex({ seasonId: 1, walletAddress: 1 });
    console.log('✓ User indexes created');

    // Tribe indexes
    await Tribe.collection.createIndex({ seasonId: 1, totalVP: -1 });
    await Tribe.collection.createIndex({ seasonId: 1, name: 1 }, { unique: true });
    await Tribe.collection.createIndex({ chieftain: 1 });
    console.log('✓ Tribe indexes created');

    // Territory indexes
    await Territory.collection.createIndex({ territoryId: 1, seasonId: 1 }, { unique: true });
    await Territory.collection.createIndex({ ownerId: 1 });
    await Territory.collection.createIndex({ seasonId: 1 });
    await Territory.collection.createIndex({ tier: 1 });
    console.log('✓ Territory indexes created');

    // Battle indexes
    await Battle.collection.createIndex({ attackerId: 1, createdAt: -1 });
    await Battle.collection.createIndex({ defenderId: 1, createdAt: -1 });
    await Battle.collection.createIndex({ territoryId: 1, createdAt: -1 });
    await Battle.collection.createIndex({ seasonId: 1, createdAt: -1 });
    await Battle.collection.createIndex({ status: 1 });
    console.log('✓ Battle indexes created');

    // Season indexes
    await Season.collection.createIndex({ seasonNumber: 1 }, { unique: true });
    await Season.collection.createIndex({ status: 1 });
    await Season.collection.createIndex({ seasonStart: 1 });
    console.log('✓ Season indexes created');

    // Payment indexes
    await Payment.collection.createIndex({ userId: 1, createdAt: -1 });
    await Payment.collection.createIndex({ status: 1 });
    await Payment.collection.createIndex({ seasonId: 1 });
    await Payment.collection.createIndex({ stripePaymentIntentId: 1 });
    await Payment.collection.createIndex({ cryptoTxHash: 1 });
    console.log('✓ Payment indexes created');

    console.log('All indexes created successfully!');
  } catch (error) {
    console.error('Error creating indexes:', error);
    throw error;
  }
}

module.exports = createIndexes;
```

### 8.2 Query Performance Guidelines

| Query Type | Target Time | Index Used |
|------------|-------------|------------|
| Get user by wallet | < 5ms | walletAddress (unique) |
| Get season leaderboard | < 50ms | seasonId + victoryPoints (compound) |
| Get tribe members | < 20ms | tribeId |
| Get territory by ID | < 5ms | territoryId + seasonId (unique) |
| Get user battle history | < 30ms | attackerId/defenderId + createdAt |
| Get active season | < 5ms | status |

### 8.3 Index Size Estimates

```javascript
// Run this to check actual index sizes
db.users.stats().indexSizes
db.tribes.stats().indexSizes
db.territories.stats().indexSizes
db.battles.stats().indexSizes
db.seasons.stats().indexSizes
db.payments.stats().indexSizes
```

**Estimated Index Sizes (1000 users):**
- users: ~150KB
- tribes: ~10KB
- territories: ~5KB
- battles: ~500KB
- seasons: ~1KB
- payments: ~50KB

**Total**: ~716KB indexes per season

---

## 9. Relationships Diagram

```
┌─────────────┐
│   Season    │
│  (1 active) │
└──────┬──────┘
       │
       ├──────────────────────────┬───────────────────┐
       │                          │                   │
       ▼                          ▼                   ▼
┌─────────────┐            ┌─────────────┐    ┌─────────────┐
│    User     │◄───────────│    Tribe    │    │  Territory  │
│  (1000 max) │ members    │  (~83 max)  │    │  (50 fixed) │
└──────┬──────┘            └──────┬──────┘    └──────┬──────┘
       │                          │                   │
       │ participates             │ owns              │ location
       │                          │                   │
       ▼                          ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                      Battle                              │
│  attacker + defender + territory + results              │
└─────────────────────────────────────────────────────────┘

┌─────────────┐
│   Payment   │
│ entry fees  │
│   prizes    │
└──────┬──────┘
       │ belongs to
       ▼
┌─────────────┐
│    User     │
└─────────────┘
```

### 9.1 Relationship Details

| Parent | Child | Type | Cardinality | On Delete |
|--------|-------|------|-------------|-----------|
| Season | User | ref | 1:N | cascade |
| Season | Tribe | ref | 1:N | cascade |
| Season | Territory | ref | 1:N | cascade |
| Season | Battle | ref | 1:N | cascade |
| Tribe | User | ref | 1:12 | set null |
| Tribe | Territory | ref | 1:N | set null |
| User | Battle | ref (attacker) | 1:N | cascade |
| User | Battle | ref (defender) | 1:N | cascade |
| Territory | Battle | ref | 1:N | set null |
| User | Payment | ref | 1:N | cascade |

---

## 10. Mongoose Models Implementation

### 10.1 Model Exports

```javascript
// models/index.js
module.exports = {
  User: require('./User'),
  Tribe: require('./Tribe'),
  Territory: require('./Territory'),
  Battle: require('./Battle'),
  Season: require('./Season'),
  Payment: require('./Payment')
};
```

### 10.2 Common Patterns

**Optimistic Locking:**
```javascript
const mongoose = require('mongoose');
const optimisticLock = require('mongoose-optimistic-lock');

const schema = new mongoose.Schema({
  // fields...
  version: { type: Number, default: 0 }
});

schema.plugin(optimisticLock);

// Usage
async function updateWithLock(userId, updates) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    const result = await User.updateOne(
      { _id: userId, version: user.version },
      { $set: updates, $inc: { version: 1 } }
    ).session(session);

    if (result.modifiedCount === 0) {
      throw new Error('Concurrent modification detected');
    }

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

**Transactions:**
```javascript
async function transferUnits(fromUserId, toTerritoryId, units) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Deduct units from user
    await User.updateOne(
      { _id: fromUserId },
      {
        $inc: {
          'army.militia': -units.militia,
          'army.spearman': -units.spearman,
          'army.archer': -units.archer,
          'army.cavalry': -units.cavalry
        }
      }
    ).session(session);

    // Add units to territory garrison
    await Territory.updateOne(
      { _id: toTerritoryId },
      {
        $inc: {
          'garrison.units.militia': units.militia,
          'garrison.units.spearman': units.spearman,
          'garrison.units.archer': units.archer,
          'garrison.units.cavalry': units.cavalry
        }
      }
    ).session(session);

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

## 11. Database Utilities

### 11.1 Seed Data Script

```javascript
// server/utils/seedData.js
const mongoose = require('mongoose');
const { Season, Territory, User, Tribe } = require('../models');

async function seedDatabase() {
  console.log('Seeding database...');

  try {
    // Create Season
    const season = await Season.create({
      seasonNumber: 1,
      name: 'Season 1: Winter Conquest',
      registrationStart: new Date('2025-11-20'),
      registrationEnd: new Date('2025-11-24'),
      seasonStart: new Date('2025-11-25'),
      seasonEnd: new Date('2025-12-04'),
      status: 'registration'
    });

    console.log('✓ Season created');

    // Create 50 territories
    const territories = [];
    const terrainTypes = ['castle', 'forest', 'hills', 'river', 'plains'];

    // Center territories (1-5)
    for (let i = 1; i <= 5; i++) {
      territories.push({
        territoryId: i,
        seasonId: season._id,
        tier: 'center',
        terrain: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
        coordinates: { x: 5, y: 5 + (i - 3) },
        goldGeneration: 100,
        vpGeneration: 100,
        npcDefense: {
          units: { militia: 300, spearman: 150, archer: 100, cavalry: 50 },
          difficulty: 'elite'
        }
      });
    }

    // Ring territories (6-20)
    for (let i = 6; i <= 20; i++) {
      territories.push({
        territoryId: i,
        seasonId: season._id,
        tier: 'ring',
        terrain: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
        coordinates: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
        goldGeneration: 50,
        vpGeneration: 50,
        npcDefense: {
          units: { militia: 200, spearman: 100, archer: 60, cavalry: 30 },
          difficulty: 'strong'
        }
      });
    }

    // Edge territories (21-50)
    for (let i = 21; i <= 50; i++) {
      territories.push({
        territoryId: i,
        seasonId: season._id,
        tier: 'edge',
        terrain: terrainTypes[Math.floor(Math.random() * terrainTypes.length)],
        coordinates: { x: Math.floor(Math.random() * 10), y: Math.floor(Math.random() * 10) },
        goldGeneration: 25,
        vpGeneration: 25,
        npcDefense: {
          units: { militia: 100, spearman: 50, archer: 30, cavalry: 10 },
          difficulty: 'weak'
        }
      });
    }

    await Territory.insertMany(territories);
    console.log('✓ 50 territories created');

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

module.exports = seedDatabase;
```

### 11.2 Cleanup Script

```javascript
// server/utils/cleanupOldSeasons.js
const { User, Tribe, Territory, Battle, Season, Payment } = require('../models');

async function cleanupOldSeasons(daysOld = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);

  console.log(`Cleaning up seasons older than ${daysOld} days...`);

  try {
    // Find old seasons
    const oldSeasons = await Season.find({
      seasonEnd: { $lt: cutoffDate },
      status: 'paid_out'
    });

    console.log(`Found ${oldSeasons.length} old seasons to archive`);

    for (const season of oldSeasons) {
      // Archive to S3 or backup database
      // await archiveSeasonData(season._id);

      // Delete data
      await User.deleteMany({ seasonId: season._id });
      await Tribe.deleteMany({ seasonId: season._id });
      await Territory.deleteMany({ seasonId: season._id });
      await Battle.deleteMany({ seasonId: season._id });
      await Payment.deleteMany({ seasonId: season._id });
      await Season.deleteOne({ _id: season._id });

      console.log(`✓ Cleaned up Season ${season.seasonNumber}`);
    }

    console.log('Cleanup complete!');
  } catch (error) {
    console.error('Error during cleanup:', error);
    throw error;
  }
}

module.exports = cleanupOldSeasons;
```

---

## Appendix A: Migration Guide

### Creating Season 2

```javascript
async function createNewSeason(seasonNumber) {
  const previousSeason = await Season.findOne({ seasonNumber: seasonNumber - 1 });

  const newSeason = await Season.create({
    seasonNumber,
    name: `Season ${seasonNumber}: [Theme Name]`,
    registrationStart: new Date(previousSeason.seasonEnd.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days later
    registrationEnd: new Date(previousSeason.seasonEnd.getTime() + 11 * 24 * 60 * 60 * 1000),
    seasonStart: new Date(previousSeason.seasonEnd.getTime() + 12 * 24 * 60 * 60 * 1000),
    seasonEnd: new Date(previousSeason.seasonEnd.getTime() + 22 * 24 * 60 * 60 * 1000),
    status: 'registration'
  });

  // Create territories for new season
  await seedTerritoriesForSeason(newSeason._id);

  console.log(`Season ${seasonNumber} created!`);
}
```

---

**End of Database Schema Documentation**

This document provides complete MongoDB schema definitions with Mongoose models, validation, indexes, relationships, and utility scripts for CryptoTribes game development.
