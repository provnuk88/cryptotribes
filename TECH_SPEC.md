# CryptoTribes - Technical Specification

**Version**: 1.0
**Last Updated**: 2025-12-01
**Status**: Season 1 MVP

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Technology Stack](#2-technology-stack)
3. [Database Design](#3-database-design)
4. [API Specification](#4-api-specification)
5. [Authentication & Security](#5-authentication--security)
6. [Real-Time Systems](#6-real-time-systems)
7. [Background Jobs](#7-background-jobs)
8. [Payment Integration](#8-payment-integration)
9. [Performance Requirements](#9-performance-requirements)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Development Workflow](#11-development-workflow)
12. [Testing Strategy](#12-testing-strategy)

---

## 1. System Architecture

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React 18 + Vite (SPA)                                    │  │
│  │  - wagmi + RainbowKit (Wallet Auth)                       │  │
│  │  - TanStack Query (State Management)                      │  │
│  │  - Socket.io Client (Real-time)                           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS / WSS
┌─────────────────────────────────────────────────────────────────┐
│                       APPLICATION TIER                           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Node.js 18+ / Express.js                                 │  │
│  │  ┌────────────┬────────────┬────────────┬──────────────┐ │  │
│  │  │   REST API │  WebSocket │   Auth     │   Payment    │ │  │
│  │  │ Controllers│  Handlers  │ Middleware │   Gateway    │ │  │
│  │  └────────────┴────────────┴────────────┴──────────────┘ │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │          Business Logic Layer                       │  │  │
│  │  │  - Battle Calculation Engine                        │  │  │
│  │  │  - Territory Management Service                     │  │  │
│  │  │  - Resource Generation Service                      │  │  │
│  │  │  - Tribe Coordination Service                       │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────────┐
│                         DATA TIER                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   MongoDB    │  │    Redis     │  │   AWS S3     │          │
│  │  (Primary)   │  │  (Queue/     │  │  (Backups)   │          │
│  │              │  │   Cache)     │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Service Components

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **API Server** | Express.js | RESTful endpoints for game actions |
| **WebSocket Server** | Socket.io | Real-time updates (battles, territories) |
| **Battle Engine** | Node.js module | Deterministic combat calculations |
| **Job Queue** | Bull.js + Redis | Sequential battle processing |
| **Cron Jobs** | AWS EventBridge | VP generation, resource updates |
| **Payment Service** | Stripe API | Entry fees, prize distribution |
| **Auth Service** | JWT + wagmi | Wallet-based authentication |

---

## 2. Technology Stack

### 2.1 Backend

```json
{
  "runtime": "Node.js 18+",
  "framework": "Express.js 4.18+",
  "database": "MongoDB 6.0+ (Mongoose 7.0+)",
  "cache": "Redis 7.0+ (ioredis 5.3+)",
  "queue": "Bull.js 4.10+",
  "websocket": "Socket.io 4.6+",
  "validation": "Joi 17.9+",
  "testing": "Jest 29+ + Supertest",
  "security": "helmet, express-rate-limit, express-mongo-sanitize"
}
```

**Package.json Dependencies:**
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.0.0",
    "socket.io": "^4.6.0",
    "bull": "^4.10.4",
    "ioredis": "^5.3.1",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "joi": "^17.9.0",
    "helmet": "^7.0.0",
    "express-rate-limit": "^6.7.0",
    "express-mongo-sanitize": "^2.2.0",
    "stripe": "^12.0.0",
    "ethers": "^6.3.0",
    "dotenv": "^16.0.3",
    "winston": "^3.8.2",
    "cors": "^2.8.5"
  }
}
```

### 2.2 Frontend

```json
{
  "framework": "React 18.2+",
  "buildTool": "Vite 4.3+",
  "stateManagement": "TanStack Query 4.29+",
  "web3": "wagmi 1.0+ + RainbowKit 1.0+",
  "styling": "TailwindCSS 3.3+",
  "websocket": "socket.io-client 4.6+",
  "testing": "Vitest + React Testing Library"
}
```

### 2.3 Infrastructure

| Service | Provider | Purpose |
|---------|----------|---------|
| **Hosting** | AWS EC2 / DigitalOcean | Application servers |
| **Database** | MongoDB Atlas | Managed database cluster |
| **Cache** | AWS ElastiCache | Managed Redis cluster |
| **CDN** | Cloudflare | Static assets, DDoS protection |
| **Monitoring** | Datadog / AWS CloudWatch | Performance metrics |
| **Logging** | AWS CloudWatch Logs | Centralized logging |
| **Backups** | AWS S3 | Database snapshots |
| **Scheduler** | AWS EventBridge | Cron job triggers |

---

## 3. Database Design

### 3.1 MongoDB Collections

#### 3.1.1 Users Collection

```javascript
{
  _id: ObjectId,
  walletAddress: String,           // Unique, indexed
  username: String,                 // Optional display name
  tribeId: ObjectId,                // ref: Tribe
  seasonId: ObjectId,               // ref: Season

  // Resources
  gold: Number,                     // Current gold balance
  goldCapacity: Number,             // From warehouse level
  goldProtection: Number,           // % protected when raided

  // Army
  army: {
    militia: Number,
    spearman: Number,
    archer: Number,
    cavalry: Number
  },
  armyCap: Number,                  // Max army size

  // Buildings
  buildings: {
    barracks: {
      level: Number,                // 1-10
      upgrading: Boolean,
      upgradeStartTime: Date,
      upgradeEndTime: Date
    },
    warehouse: {
      level: Number,
      upgrading: Boolean,
      upgradeStartTime: Date,
      upgradeEndTime: Date
    },
    workshop: {
      level: Number,
      upgrading: Boolean,
      upgradeStartTime: Date,
      upgradeEndTime: Date
    }
  },

  // Training Queues
  trainingQueue: [{
    unitType: String,               // 'militia' | 'spearman' | 'archer' | 'cavalry'
    quantity: Number,
    startTime: Date,
    endTime: Date,
    queuePosition: Number
  }],

  // Victory Points
  victoryPoints: Number,
  vpRank: Number,                   // Cached rank in season

  // Anti-Cheat
  walletAge: Date,                  // Wallet creation date
  transactionCount: Number,         // Historical tx count
  behaviorScore: Number,            // 0-100 trustworthiness
  flagged: Boolean,
  flagReason: String,

  // Metadata
  version: Number,                  // For optimistic locking
  lastActive: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.users.createIndex({ walletAddress: 1 }, { unique: true })
db.users.createIndex({ tribeId: 1 })
db.users.createIndex({ seasonId: 1, victoryPoints: -1 })
db.users.createIndex({ vpRank: 1 })
```

#### 3.1.2 Tribes Collection

```javascript
{
  _id: ObjectId,
  seasonId: ObjectId,               // ref: Season

  // Identity
  name: String,                     // Tribe name
  tag: String,                      // 3-letter tag (e.g., "WAR")
  emblem: String,                   // URL to emblem image

  // Members (12 players)
  chieftain: ObjectId,              // ref: User (leader)
  captains: [ObjectId],             // ref: User (2 captains)
  warriors: [ObjectId],             // ref: User (9 warriors)

  // Performance
  totalVP: Number,                  // Sum of all members' VP
  tribeRank: Number,                // Cached rank in season
  territoriesControlled: [ObjectId], // ref: Territory

  // Prizes
  prizePool: Number,                // USDT allocated to tribe
  prizeDistributed: Boolean,

  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.tribes.createIndex({ seasonId: 1, totalVP: -1 })
db.tribes.createIndex({ chieftain: 1 })
db.tribes.createIndex({ name: 1, seasonId: 1 }, { unique: true })
```

#### 3.1.3 Territories Collection

```javascript
{
  _id: ObjectId,
  territoryId: Number,              // 1-50 (unique per season)
  seasonId: ObjectId,               // ref: Season

  // Geography
  tier: String,                     // 'center' | 'ring' | 'edge'
  terrain: String,                  // 'castle' | 'forest' | 'hills' | 'river' | 'plains'
  coordinates: {
    x: Number,
    y: Number
  },

  // Ownership
  ownerId: ObjectId,                // ref: Tribe (null if NPC)
  controlledSince: Date,

  // Garrison
  garrison: {
    tribeId: ObjectId,              // ref: Tribe
    units: {
      militia: Number,
      spearman: Number,
      archer: Number,
      cavalry: Number
    },
    formation: String,              // 'offensive' | 'balanced' | 'defensive'
    lastUpdated: Date
  },

  // NPC Defenders
  npcDefense: {
    units: {
      militia: Number,
      spearman: Number,
      archer: Number,
      cavalry: Number
    },
    difficulty: String              // 'elite' | 'strong' | 'weak'
  },

  // Economy
  goldGeneration: Number,           // Gold/hour
  vpGeneration: Number,             // VP/hour

  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.territories.createIndex({ territoryId: 1, seasonId: 1 }, { unique: true })
db.territories.createIndex({ ownerId: 1 })
db.territories.createIndex({ seasonId: 1 })
```

#### 3.1.4 Battles Collection

```javascript
{
  _id: ObjectId,
  seasonId: ObjectId,               // ref: Season
  battleType: String,               // 'pvp' | 'pve_npc' | 'pve_raid'

  // Participants
  attackerId: ObjectId,             // ref: User
  attackerTribeId: ObjectId,        // ref: Tribe
  defenderId: ObjectId,             // ref: User or null (NPC)
  defenderTribeId: ObjectId,        // ref: Tribe or null

  // Location
  territoryId: ObjectId,            // ref: Territory (if territory battle)
  terrain: String,

  // Armies
  attackerArmy: {
    militia: Number,
    spearman: Number,
    archer: Number,
    cavalry: Number
  },
  defenderArmy: {
    militia: Number,
    spearman: Number,
    archer: Number,
    cavalry: Number
  },

  // Battle Mechanics
  attackerFormation: String,
  defenderFormation: String,
  attackerPower: Number,            // Calculated power
  defenderPower: Number,
  rngVariance: Number,              // ±10% applied
  rngSeed: String,                  // For deterministic replays

  // Results
  winnerId: ObjectId,               // ref: User
  casualties: {
    attacker: {
      militia: Number,
      spearman: Number,
      archer: Number,
      cavalry: Number
    },
    defender: {
      militia: Number,
      spearman: Number,
      archer: Number,
      cavalry: Number
    }
  },

  // Rewards
  vpAwarded: {
    attacker: Number,
    defender: Number
  },
  goldLooted: Number,               // If raid
  territoryTransferred: Boolean,    // If territory captured

  // Metadata
  battleStartTime: Date,
  battleEndTime: Date,
  processingTimeMs: Number,         // Performance tracking
  createdAt: Date
}

// Indexes
db.battles.createIndex({ attackerId: 1, createdAt: -1 })
db.battles.createIndex({ defenderId: 1, createdAt: -1 })
db.battles.createIndex({ territoryId: 1, createdAt: -1 })
db.battles.createIndex({ seasonId: 1, createdAt: -1 })
```

#### 3.1.5 Seasons Collection

```javascript
{
  _id: ObjectId,

  // Identity
  seasonNumber: Number,             // 1, 2, 3...
  name: String,                     // "Season 1: Winter Conquest"

  // Timeline
  registrationStart: Date,
  registrationEnd: Date,
  seasonStart: Date,
  seasonEnd: Date,                  // 10 days after start
  prizeDistributionDate: Date,

  // Status
  status: String,                   // 'registration' | 'active' | 'ended' | 'paid_out'

  // Participants
  registeredPlayers: Number,
  activeTribes: Number,

  // Prize Pool
  entryFee: Number,                 // 25 USDT
  totalPrizePool: Number,           // registeredPlayers * 21.25
  platformFee: Number,              // registeredPlayers * 3.75

  // Winners
  winningTribes: [{
    rank: Number,
    tribeId: ObjectId,
    prizeAmount: Number,
    paid: Boolean
  }],

  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.seasons.createIndex({ seasonNumber: 1 }, { unique: true })
db.seasons.createIndex({ status: 1 })
db.seasons.createIndex({ seasonStart: 1 })
```

#### 3.1.6 Payments Collection

```javascript
{
  _id: ObjectId,

  // User
  userId: ObjectId,                 // ref: User
  walletAddress: String,

  // Transaction
  type: String,                     // 'entry_fee' | 'prize_payout'
  amount: Number,                   // In USDT
  currency: String,                 // 'USDT'

  // Payment Method
  method: String,                   // 'crypto' | 'stripe'
  stripePaymentIntentId: String,    // If Stripe
  cryptoTxHash: String,             // If crypto transfer

  // Status
  status: String,                   // 'pending' | 'completed' | 'failed' | 'refunded'

  // Season Context
  seasonId: ObjectId,               // ref: Season

  // Metadata
  createdAt: Date,
  updatedAt: Date
}

// Indexes
db.payments.createIndex({ userId: 1, createdAt: -1 })
db.payments.createIndex({ status: 1 })
db.payments.createIndex({ seasonId: 1 })
db.payments.createIndex({ stripePaymentIntentId: 1 })
db.payments.createIndex({ cryptoTxHash: 1 })
```

### 3.2 Database Configuration

**MongoDB Atlas Cluster Specifications (MVP):**
```yaml
Cluster Tier: M10 (for 1000 concurrent users)
Storage: 10GB SSD
RAM: 2GB
vCPU: Shared
Backup: Daily snapshots (7-day retention)
Replica Set: 3 nodes (Primary + 2 Secondaries)
Region: US-EAST-1 (or closest to majority of players)
```

**Connection String:**
```javascript
mongodb+srv://<username>:<password>@cluster0.mongodb.net/cryptotribes?retryWrites=true&w=majority
```

**Mongoose Configuration:**
```javascript
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,              // Max concurrent connections
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Optimistic locking plugin
const optimisticLock = require('mongoose-optimistic-lock');
mongoose.plugin(optimisticLock);
```

---

## 4. API Specification

### 4.1 Base URL

```
Production:  https://api.cryptotribes.io/v1
Development: http://localhost:3000/v1
```

### 4.2 Authentication

All authenticated endpoints require JWT token in header:
```http
Authorization: Bearer <JWT_TOKEN>
```

### 4.3 Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { /* response data */ },
  "meta": {
    "timestamp": "2025-12-01T12:00:00Z",
    "requestId": "uuid-v4"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "message": "Not enough gold to train units",
    "details": {
      "required": 500,
      "available": 350
    }
  },
  "meta": {
    "timestamp": "2025-12-01T12:00:00Z",
    "requestId": "uuid-v4"
  }
}
```

### 4.4 Endpoints

#### 4.4.1 Authentication

**POST /auth/connect**
```http
POST /v1/auth/connect
Content-Type: application/json

{
  "walletAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "signature": "0x...",
  "message": "Sign this message to authenticate with CryptoTribes: <nonce>"
}

Response 200:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "walletAddress": "0x742d35Cc...",
      "tribeId": null,
      "gold": 1000,
      "victoryPoints": 0
    }
  }
}
```

**POST /auth/refresh**
```http
POST /v1/auth/refresh
Authorization: Bearer <OLD_TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### 4.4.2 User Profile

**GET /users/me**
```http
GET /v1/users/me
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439011",
    "walletAddress": "0x742d35Cc...",
    "username": "WarriorKing",
    "tribeId": "507f1f77bcf86cd799439012",
    "gold": 2500,
    "goldCapacity": 5000,
    "goldProtection": 0.25,
    "army": {
      "militia": 150,
      "spearman": 80,
      "archer": 50,
      "cavalry": 20
    },
    "armyCap": 500,
    "buildings": {
      "barracks": { "level": 5, "upgrading": false },
      "warehouse": { "level": 4, "upgrading": true, "upgradeEndTime": "2025-12-01T14:30:00Z" },
      "workshop": { "level": 3, "upgrading": false }
    },
    "victoryPoints": 1250,
    "vpRank": 42,
    "trainingQueue": [
      {
        "unitType": "cavalry",
        "quantity": 10,
        "startTime": "2025-12-01T12:00:00Z",
        "endTime": "2025-12-01T12:35:00Z",
        "queuePosition": 1
      }
    ]
  }
}
```

**PATCH /users/me**
```http
PATCH /v1/users/me
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "username": "WarriorKing"
}

Response 200:
{
  "success": true,
  "data": {
    "username": "WarriorKing"
  }
}
```

#### 4.4.3 Buildings

**POST /buildings/upgrade**
```http
POST /v1/buildings/upgrade
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "buildingType": "barracks"
}

Response 200:
{
  "success": true,
  "data": {
    "buildingType": "barracks",
    "level": 6,
    "upgrading": true,
    "upgradeStartTime": "2025-12-01T12:00:00Z",
    "upgradeEndTime": "2025-12-01T14:00:00Z",
    "costPaid": 1500,
    "remainingGold": 1000
  }
}

Response 400 (Insufficient Resources):
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_RESOURCES",
    "message": "Not enough gold to upgrade building",
    "details": {
      "required": 1500,
      "available": 1000
    }
  }
}
```

**POST /buildings/complete-upgrade**
```http
POST /v1/buildings/complete-upgrade
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "buildingType": "barracks"
}

Response 200:
{
  "success": true,
  "data": {
    "buildingType": "barracks",
    "level": 6,
    "upgrading": false
  }
}
```

#### 4.4.4 Training

**POST /training/start**
```http
POST /v1/training/start
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "unitType": "cavalry",
  "quantity": 10
}

Response 200:
{
  "success": true,
  "data": {
    "queueId": "507f1f77bcf86cd799439013",
    "unitType": "cavalry",
    "quantity": 10,
    "startTime": "2025-12-01T12:00:00Z",
    "endTime": "2025-12-01T12:35:00Z",
    "costPaid": 500,
    "remainingGold": 1500,
    "queuePosition": 1
  }
}
```

**POST /training/complete**
```http
POST /v1/training/complete
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "queueId": "507f1f77bcf86cd799439013"
}

Response 200:
{
  "success": true,
  "data": {
    "unitType": "cavalry",
    "quantity": 10,
    "newArmyCount": {
      "militia": 150,
      "spearman": 80,
      "archer": 50,
      "cavalry": 30
    }
  }
}
```

**DELETE /training/cancel**
```http
DELETE /v1/training/cancel/:queueId
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "refundedGold": 250,
    "remainingGold": 1750
  }
}
```

#### 4.4.5 Battles

**POST /battles/attack-territory**
```http
POST /v1/battles/attack-territory
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "territoryId": "507f1f77bcf86cd799439014",
  "army": {
    "militia": 50,
    "spearman": 30,
    "archer": 20,
    "cavalry": 10
  },
  "formation": "offensive"
}

Response 202 (Battle Queued):
{
  "success": true,
  "data": {
    "battleId": "507f1f77bcf86cd799439015",
    "status": "queued",
    "estimatedProcessingTime": "10s"
  }
}
```

**GET /battles/:battleId**
```http
GET /v1/battles/507f1f77bcf86cd799439015
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "battleId": "507f1f77bcf86cd799439015",
    "battleType": "pvp",
    "status": "completed",
    "attacker": {
      "userId": "507f1f77bcf86cd799439011",
      "username": "WarriorKing",
      "army": { "militia": 50, "spearman": 30, "archer": 20, "cavalry": 10 },
      "formation": "offensive",
      "power": 45300
    },
    "defender": {
      "userId": "507f1f77bcf86cd799439012",
      "username": "DefenderPro",
      "army": { "militia": 80, "spearman": 20, "archer": 40, "cavalry": 5 },
      "formation": "defensive",
      "power": 42100
    },
    "results": {
      "winner": "attacker",
      "casualties": {
        "attacker": { "militia": 18, "spearman": 10, "archer": 6, "cavalry": 3 },
        "defender": { "militia": 48, "spearman": 12, "archer": 24, "cavalry": 3 }
      },
      "vpAwarded": {
        "attacker": 187,
        "defender": 50
      },
      "territoryTransferred": true
    },
    "battleStartTime": "2025-12-01T12:00:00Z",
    "battleEndTime": "2025-12-01T12:00:05Z"
  }
}
```

**GET /battles/history**
```http
GET /v1/battles/history?limit=20&offset=0
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "battles": [
      {
        "battleId": "507f1f77bcf86cd799439015",
        "battleType": "pvp",
        "result": "victory",
        "opponent": "DefenderPro",
        "vpGained": 187,
        "createdAt": "2025-12-01T12:00:00Z"
      },
      // ... more battles
    ],
    "pagination": {
      "total": 45,
      "limit": 20,
      "offset": 0,
      "hasMore": true
    }
  }
}
```

#### 4.4.6 Territories

**GET /territories**
```http
GET /v1/territories?seasonId=507f1f77bcf86cd799439016
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "territories": [
      {
        "id": "507f1f77bcf86cd799439014",
        "territoryId": 1,
        "tier": "center",
        "terrain": "castle",
        "coordinates": { "x": 5, "y": 5 },
        "owner": {
          "tribeId": "507f1f77bcf86cd799439012",
          "tribeName": "Warriors of Winter",
          "controlledSince": "2025-11-28T10:00:00Z"
        },
        "garrison": {
          "units": { "militia": 200, "spearman": 100, "archer": 80, "cavalry": 40 },
          "formation": "defensive"
        },
        "goldGeneration": 100,
        "vpGeneration": 100
      },
      // ... 49 more territories
    ]
  }
}
```

**GET /territories/:territoryId**
```http
GET /v1/territories/507f1f77bcf86cd799439014
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439014",
    "territoryId": 1,
    "tier": "center",
    "terrain": "castle",
    "coordinates": { "x": 5, "y": 5 },
    "owner": {
      "tribeId": "507f1f77bcf86cd799439012",
      "tribeName": "Warriors of Winter",
      "controlledSince": "2025-11-28T10:00:00Z"
    },
    "garrison": {
      "units": { "militia": 200, "spearman": 100, "archer": 80, "cavalry": 40 },
      "formation": "defensive",
      "lastUpdated": "2025-12-01T11:30:00Z"
    },
    "npcDefense": null,
    "goldGeneration": 100,
    "vpGeneration": 100,
    "recentBattles": [
      {
        "battleId": "507f1f77bcf86cd799439015",
        "result": "defended",
        "attacker": "EnemyTribe",
        "createdAt": "2025-12-01T10:00:00Z"
      }
    ]
  }
}
```

**POST /territories/:territoryId/garrison**
```http
POST /v1/territories/507f1f77bcf86cd799439014/garrison
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "units": {
    "militia": 50,
    "spearman": 30,
    "archer": 20,
    "cavalry": 10
  },
  "formation": "balanced"
}

Response 200:
{
  "success": true,
  "data": {
    "territoryId": 1,
    "garrison": {
      "units": { "militia": 50, "spearman": 30, "archer": 20, "cavalry": 10 },
      "formation": "balanced",
      "lastUpdated": "2025-12-01T12:00:00Z"
    },
    "remainingArmy": {
      "militia": 100,
      "spearman": 50,
      "archer": 30,
      "cavalry": 10
    }
  }
}
```

#### 4.4.7 Tribes

**GET /tribes/:tribeId**
```http
GET /v1/tribes/507f1f77bcf86cd799439012
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "id": "507f1f77bcf86cd799439012",
    "name": "Warriors of Winter",
    "tag": "WOW",
    "emblem": "https://cdn.cryptotribes.io/emblems/wow.png",
    "members": {
      "chieftain": {
        "userId": "507f1f77bcf86cd799439011",
        "username": "WarriorKing",
        "victoryPoints": 2500
      },
      "captains": [
        {
          "userId": "507f1f77bcf86cd799439013",
          "username": "Captain1",
          "victoryPoints": 1800
        },
        {
          "userId": "507f1f77bcf86cd799439014",
          "username": "Captain2",
          "victoryPoints": 1600
        }
      ],
      "warriors": [
        // ... 9 warriors
      ]
    },
    "totalVP": 18500,
    "tribeRank": 3,
    "territoriesControlled": 12,
    "prizePool": 1700,
    "createdAt": "2025-11-25T10:00:00Z"
  }
}
```

**POST /tribes/create**
```http
POST /v1/tribes/create
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "name": "Warriors of Winter",
  "tag": "WOW"
}

Response 200:
{
  "success": true,
  "data": {
    "tribeId": "507f1f77bcf86cd799439012",
    "name": "Warriors of Winter",
    "tag": "WOW",
    "chieftain": "507f1f77bcf86cd799439011"
  }
}
```

**POST /tribes/:tribeId/invite**
```http
POST /v1/tribes/507f1f77bcf86cd799439012/invite
Authorization: Bearer <TOKEN>
Content-Type: application/json

{
  "userId": "507f1f77bcf86cd799439015",
  "role": "warrior"
}

Response 200:
{
  "success": true,
  "data": {
    "inviteId": "507f1f77bcf86cd799439016",
    "expiresAt": "2025-12-02T12:00:00Z"
  }
}
```

#### 4.4.8 Leaderboards

**GET /leaderboard/players**
```http
GET /v1/leaderboard/players?seasonId=507f1f77bcf86cd799439016&limit=100
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "players": [
      {
        "rank": 1,
        "userId": "507f1f77bcf86cd799439011",
        "username": "WarriorKing",
        "tribeId": "507f1f77bcf86cd799439012",
        "tribeName": "Warriors of Winter",
        "victoryPoints": 5200
      },
      // ... 99 more
    ],
    "userRank": {
      "rank": 42,
      "victoryPoints": 1250
    }
  }
}
```

**GET /leaderboard/tribes**
```http
GET /v1/leaderboard/tribes?seasonId=507f1f77bcf86cd799439016&limit=50
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "tribes": [
      {
        "rank": 1,
        "tribeId": "507f1f77bcf86cd799439012",
        "tribeName": "Warriors of Winter",
        "tag": "WOW",
        "totalVP": 42500,
        "memberCount": 12,
        "territoriesControlled": 18
      },
      // ... 49 more
    ]
  }
}
```

#### 4.4.9 Seasons

**GET /seasons/current**
```http
GET /v1/seasons/current
Authorization: Bearer <TOKEN>

Response 200:
{
  "success": true,
  "data": {
    "seasonId": "507f1f77bcf86cd799439016",
    "seasonNumber": 1,
    "name": "Season 1: Winter Conquest",
    "status": "active",
    "timeline": {
      "registrationStart": "2025-11-20T00:00:00Z",
      "registrationEnd": "2025-11-24T23:59:59Z",
      "seasonStart": "2025-11-25T00:00:00Z",
      "seasonEnd": "2025-12-04T23:59:59Z"
    },
    "participants": {
      "registeredPlayers": 1000,
      "activeTribes": 83
    },
    "prizePool": {
      "total": 21250,
      "breakdown": {
        "rank1": 6375,
        "rank2": 4250,
        "rank3": 2125,
        "rank4_10": 1214.29
      }
    }
  }
}
```

---

## 5. Authentication & Security

### 5.1 Wallet Authentication Flow

```javascript
// Client-side (wagmi + RainbowKit)
import { useAccount, useSignMessage } from 'wagmi';

const { address } = useAccount();
const { signMessage } = useSignMessage();

async function authenticate() {
  // 1. Request nonce from server
  const { nonce } = await fetch('/v1/auth/nonce', {
    method: 'POST',
    body: JSON.stringify({ walletAddress: address })
  }).then(r => r.json());

  // 2. Sign message with wallet
  const message = `Sign this message to authenticate with CryptoTribes: ${nonce}`;
  const signature = await signMessage({ message });

  // 3. Send signature to server
  const { token } = await fetch('/v1/auth/connect', {
    method: 'POST',
    body: JSON.stringify({
      walletAddress: address,
      signature,
      message
    })
  }).then(r => r.json());

  // 4. Store JWT token
  localStorage.setItem('auth_token', token);
}

// Server-side (Express + ethers)
const { ethers } = require('ethers');
const jwt = require('jsonwebtoken');

app.post('/v1/auth/nonce', async (req, res) => {
  const { walletAddress } = req.body;

  // Generate random nonce
  const nonce = ethers.hexlify(ethers.randomBytes(32));

  // Store nonce with expiration (5 minutes)
  await redis.setex(`nonce:${walletAddress}`, 300, nonce);

  res.json({ nonce });
});

app.post('/v1/auth/connect', async (req, res) => {
  const { walletAddress, signature, message } = req.body;

  // 1. Verify nonce exists and matches
  const nonce = await redis.get(`nonce:${walletAddress}`);
  if (!message.includes(nonce)) {
    return res.status(401).json({ error: 'Invalid nonce' });
  }

  // 2. Verify signature
  const recoveredAddress = ethers.verifyMessage(message, signature);
  if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 3. Delete used nonce
  await redis.del(`nonce:${walletAddress}`);

  // 4. Check if user exists
  let user = await User.findOne({ walletAddress });
  if (!user) {
    // Create new user
    user = await User.create({
      walletAddress,
      gold: 1000,
      army: { militia: 0, spearman: 0, archer: 0, cavalry: 0 },
      buildings: {
        barracks: { level: 1, upgrading: false },
        warehouse: { level: 1, upgrading: false },
        workshop: { level: 1, upgrading: false }
      }
    });
  }

  // 5. Generate JWT token
  const token = jwt.sign(
    { userId: user._id, walletAddress },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({ token, user });
});
```

### 5.2 JWT Middleware

```javascript
const jwt = require('jsonwebtoken');

async function authenticate(req, res, next) {
  try {
    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.slice(7);

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach to request
    req.user = user;
    req.userId = user._id;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = authenticate;
```

### 5.3 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limit (per IP)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 1000,                  // Max 1000 requests per window
  message: 'Too many requests from this IP'
});

// Auth endpoint rate limit (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many auth attempts'
});

// Battle endpoint rate limit (prevent spam)
const battleLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 10,                    // Max 10 battles per minute
  message: 'Too many battle requests'
});

app.use('/v1', globalLimiter);
app.use('/v1/auth', authLimiter);
app.use('/v1/battles/attack', battleLimiter);
```

### 5.4 Input Validation

```javascript
const Joi = require('joi');

// Example: Validate battle attack request
const attackTerritorySchema = Joi.object({
  territoryId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required(),
  army: Joi.object({
    militia: Joi.number().integer().min(0).max(10000).required(),
    spearman: Joi.number().integer().min(0).max(10000).required(),
    archer: Joi.number().integer().min(0).max(10000).required(),
    cavalry: Joi.number().integer().min(0).max(10000).required()
  }).required(),
  formation: Joi.string().valid('offensive', 'balanced', 'defensive').required()
});

app.post('/v1/battles/attack-territory', authenticate, async (req, res) => {
  // Validate input
  const { error, value } = attackTerritorySchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  // Continue with battle logic...
});
```

### 5.5 Anti-Cheat Measures

**Wallet Age Verification:**
```javascript
const { ethers } = require('ethers');
const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);

async function checkWalletAge(walletAddress) {
  // Get first transaction
  const history = await provider.getHistory(walletAddress, 0, 'latest');

  if (history.length === 0) {
    return { valid: false, reason: 'No transaction history' };
  }

  const firstTx = history[0];
  const firstBlock = await provider.getBlock(firstTx.blockNumber);
  const walletAge = Date.now() - (firstBlock.timestamp * 1000);

  const MIN_AGE = 90 * 24 * 60 * 60 * 1000; // 90 days
  const MIN_TX_COUNT = 10;

  if (walletAge < MIN_AGE) {
    return { valid: false, reason: `Wallet too new (${Math.floor(walletAge / (24*60*60*1000))} days)` };
  }

  if (history.length < MIN_TX_COUNT) {
    return { valid: false, reason: `Insufficient tx history (${history.length} txs)` };
  }

  return { valid: true };
}
```

**Optimistic Locking (Prevent Race Conditions):**
```javascript
const mongoose = require('mongoose');

// User schema with version field
const userSchema = new mongoose.Schema({
  walletAddress: String,
  gold: Number,
  version: { type: Number, default: 0 }
});

// Update with optimistic locking
async function deductGold(userId, amount) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    if (user.gold < amount) {
      throw new Error('Insufficient gold');
    }

    // Update with version check
    const result = await User.updateOne(
      { _id: userId, version: user.version },
      {
        $inc: { gold: -amount, version: 1 }
      }
    ).session(session);

    if (result.modifiedCount === 0) {
      throw new Error('Concurrent modification detected');
    }

    await session.commitTransaction();
    return true;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}
```

---

## 6. Real-Time Systems

### 6.1 WebSocket Events

**Server-side (Socket.io):**
```javascript
const socketio = require('socket.io');
const jwt = require('jsonwebtoken');

const io = socketio(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    credentials: true
  }
});

// Authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return next(new Error('Authentication error'));
    }

    socket.userId = user._id;
    socket.tribeId = user.tribeId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Join personal room
  socket.join(`user-${socket.userId}`);

  // Join tribe room
  if (socket.tribeId) {
    socket.join(`tribe-${socket.tribeId}`);
  }

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

// Emit events
function emitBattleCompleted(battleId, battle) {
  // Notify attacker
  io.to(`user-${battle.attackerId}`).emit('battle_completed', {
    battleId,
    result: 'You attacked',
    winner: battle.winnerId.toString() === battle.attackerId.toString() ? 'you' : 'opponent',
    casualties: battle.casualties.attacker,
    vpGained: battle.vpAwarded.attacker
  });

  // Notify defender
  if (battle.defenderId) {
    io.to(`user-${battle.defenderId}`).emit('battle_completed', {
      battleId,
      result: 'You were attacked',
      winner: battle.winnerId.toString() === battle.defenderId.toString() ? 'you' : 'opponent',
      casualties: battle.casualties.defender,
      vpGained: battle.vpAwarded.defender
    });
  }

  // Notify tribes
  io.to(`tribe-${battle.attackerTribeId}`).emit('tribe_battle', {
    member: battle.attackerId,
    action: 'attacked',
    territoryId: battle.territoryId
  });

  if (battle.defenderTribeId) {
    io.to(`tribe-${battle.defenderTribeId}`).emit('tribe_battle', {
      member: battle.defenderId,
      action: 'defended',
      territoryId: battle.territoryId
    });
  }
}
```

**Client-side (socket.io-client):**
```javascript
import { io } from 'socket.io-client';

const socket = io(process.env.VITE_API_URL, {
  auth: {
    token: localStorage.getItem('auth_token')
  }
});

// Listen for battle completed
socket.on('battle_completed', (data) => {
  console.log('Battle completed:', data);
  // Update UI, show notification
  showNotification(`Battle ${data.result}! VP gained: ${data.vpGained}`);
});

// Listen for territory captured
socket.on('territory_captured', (data) => {
  console.log('Territory captured:', data);
  // Update territory map
  updateTerritoryOwner(data.territoryId, data.newOwner);
});

// Listen for training completed
socket.on('training_completed', (data) => {
  console.log('Training completed:', data);
  // Update army count
  updateArmyCount(data.unitType, data.quantity);
});
```

### 6.2 WebSocket Event Types

| Event | Direction | Purpose |
|-------|-----------|---------|
| `battle_completed` | Server → Client | Battle results (attacker/defender) |
| `territory_captured` | Server → All | Territory ownership changed |
| `territory_lost` | Server → Tribe | Your tribe lost a territory |
| `training_completed` | Server → Client | Unit training finished |
| `building_upgraded` | Server → Client | Building upgrade completed |
| `tribe_member_joined` | Server → Tribe | New member joined tribe |
| `tribe_member_left` | Server → Tribe | Member left tribe |
| `vp_updated` | Server → Client | VP changed (hourly update) |
| `gold_updated` | Server → Client | Gold changed (passive income) |
| `season_started` | Server → All | New season began |
| `season_ending_soon` | Server → All | Season ends in 1 hour |
| `season_ended` | Server → All | Season finished |

---

## 7. Background Jobs

### 7.1 Bull.js Queue Setup

```javascript
const Queue = require('bull');
const redis = require('ioredis');

const redisClient = new redis(process.env.REDIS_URL);

// Battle queue (sequential processing)
const battleQueue = new Queue('battles', {
  redis: {
    client: redisClient
  },
  settings: {
    maxStalledCount: 3,
    stalledInterval: 5000
  }
});

// VP generation queue (hourly)
const vpQueue = new Queue('vp-generation', {
  redis: {
    client: redisClient
  }
});

// Resource generation queue (every 10 minutes)
const resourceQueue = new Queue('resource-generation', {
  redis: {
    client: redisClient
  }
});

module.exports = { battleQueue, vpQueue, resourceQueue };
```

### 7.2 Battle Processing Worker

```javascript
const { battleQueue } = require('./queues');
const { calculateBattle } = require('./services/battleService');

battleQueue.process(async (job) => {
  const { battleId, attackerId, defenderId, territoryId } = job.data;

  console.log(`Processing battle ${battleId}`);

  try {
    // Calculate battle results
    const results = await calculateBattle(battleId);

    // Update database
    await Battle.findByIdAndUpdate(battleId, {
      status: 'completed',
      winnerId: results.winnerId,
      casualties: results.casualties,
      vpAwarded: results.vpAwarded,
      battleEndTime: new Date()
    });

    // Update users
    await updateUsersAfterBattle(results);

    // Update territory if captured
    if (results.territoryTransferred) {
      await transferTerritory(territoryId, results.winnerId);
    }

    // Emit WebSocket events
    emitBattleCompleted(battleId, results);

    return { success: true, battleId };
  } catch (error) {
    console.error(`Battle ${battleId} failed:`, error);
    throw error;
  }
});

// Add battle to queue
async function queueBattle(battleData) {
  const job = await battleQueue.add(battleData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });

  return job.id;
}
```

### 7.3 VP Generation Cron Job

```javascript
const { vpQueue } = require('./queues');

// AWS EventBridge triggers this endpoint hourly
app.post('/internal/cron/vp-generation', async (req, res) => {
  // Verify request is from AWS EventBridge
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await vpQueue.add({}, {
    attempts: 3,
    timeout: 60000 // 1 minute timeout
  });

  res.json({ success: true });
});

// Worker
vpQueue.process(async (job) => {
  const currentSeason = await Season.findOne({ status: 'active' });
  if (!currentSeason) return;

  // Get all territories with owners
  const territories = await Territory.find({
    seasonId: currentSeason._id,
    ownerId: { $ne: null }
  }).populate('garrison.tribeId');

  // Calculate VP for each garrison
  const updates = [];

  for (const territory of territories) {
    if (!territory.garrison || !territory.garrison.tribeId) continue;

    const vpGenerated = territory.vpGeneration; // 25, 50, or 100 per hour

    // Get all users in garrison
    const tribeMembers = await User.find({ tribeId: territory.garrison.tribeId });

    // Split VP among garrison (if user has units there)
    const garrisonUsers = tribeMembers.filter(user => {
      // Check if user has units in this territory's garrison
      return hasUnitsInGarrison(user._id, territory._id);
    });

    const vpPerUser = Math.floor(vpGenerated / garrisonUsers.length);

    for (const user of garrisonUsers) {
      updates.push({
        updateOne: {
          filter: { _id: user._id },
          update: { $inc: { victoryPoints: vpPerUser } }
        }
      });
    }
  }

  // Bulk update users
  if (updates.length > 0) {
    await User.bulkWrite(updates);
  }

  console.log(`VP generation completed: ${updates.length} users updated`);

  return { usersUpdated: updates.length };
});
```

### 7.4 Resource Generation Cron Job

```javascript
const { resourceQueue } = require('./queues');

// AWS EventBridge triggers every 10 minutes
app.post('/internal/cron/resource-generation', async (req, res) => {
  if (req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  await resourceQueue.add({}, {
    attempts: 3,
    timeout: 60000
  });

  res.json({ success: true });
});

// Worker
resourceQueue.process(async (job) => {
  const currentSeason = await Season.findOne({ status: 'active' });
  if (!currentSeason) return;

  const users = await User.find({ seasonId: currentSeason._id });
  const updates = [];

  for (const user of users) {
    // Calculate passive income
    let hourlyIncome = 10; // Base generation

    // Warehouse bonus
    const warehouseLevel = user.buildings.warehouse.level;
    hourlyIncome += warehouseLevel * 2;

    // Territory share (if in garrison)
    const territoriesWithGarrison = await Territory.find({
      seasonId: currentSeason._id,
      'garrison.tribeId': user.tribeId
    });

    for (const territory of territoriesWithGarrison) {
      if (hasUnitsInGarrison(user._id, territory._id)) {
        hourlyIncome += territory.goldGeneration * 0.5;
      }
    }

    // Calculate 10-minute share
    const goldGained = Math.floor(hourlyIncome / 6);

    // Apply cap
    const goldCapacity = user.goldCapacity || 1000;
    const newGold = Math.min(user.gold + goldGained, goldCapacity);

    updates.push({
      updateOne: {
        filter: { _id: user._id },
        update: { $set: { gold: newGold } }
      }
    });
  }

  // Bulk update
  if (updates.length > 0) {
    await User.bulkWrite(updates);
  }

  console.log(`Resource generation completed: ${updates.length} users updated`);

  return { usersUpdated: updates.length };
});
```

---

## 8. Payment Integration

### 8.1 Stripe Setup

```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Create payment intent for entry fee
app.post('/v1/payments/create-entry-fee', authenticate, async (req, res) => {
  const { seasonId } = req.body;

  // Check if user already paid for this season
  const existingPayment = await Payment.findOne({
    userId: req.userId,
    seasonId,
    type: 'entry_fee',
    status: 'completed'
  });

  if (existingPayment) {
    return res.status(400).json({ error: 'Already paid for this season' });
  }

  // Create Stripe payment intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: 2500, // $25.00
    currency: 'usd',
    metadata: {
      userId: req.userId.toString(),
      seasonId: seasonId.toString(),
      type: 'entry_fee'
    }
  });

  // Create payment record
  await Payment.create({
    userId: req.userId,
    seasonId,
    type: 'entry_fee',
    amount: 25,
    currency: 'USD',
    method: 'stripe',
    stripePaymentIntentId: paymentIntent.id,
    status: 'pending'
  });

  res.json({
    clientSecret: paymentIntent.client_secret
  });
});

// Stripe webhook handler
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  try {
    const event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;

      // Update payment record
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        { status: 'completed' }
      );

      // Update season participant count
      const { seasonId } = paymentIntent.metadata;
      await Season.findByIdAndUpdate(seasonId, {
        $inc: { registeredPlayers: 1 }
      });

      console.log(`Payment succeeded: ${paymentIntent.id}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
});
```

### 8.2 Prize Distribution

```javascript
// End season and calculate prizes
async function endSeason(seasonId) {
  const season = await Season.findById(seasonId);

  // Get top 10 tribes
  const topTribes = await Tribe.find({ seasonId })
    .sort({ totalVP: -1 })
    .limit(10);

  const totalPrizePool = season.totalPrizePool; // e.g., 21,250 USDT

  // Prize breakdown
  const prizeBreakdown = [
    totalPrizePool * 0.30,  // Rank 1: 30% = 6,375
    totalPrizePool * 0.20,  // Rank 2: 20% = 4,250
    totalPrizePool * 0.10,  // Rank 3: 10% = 2,125
    ...Array(7).fill(totalPrizePool * 0.40 / 7) // Ranks 4-10: 5.71% each
  ];

  // Update season with winners
  const winningTribes = topTribes.map((tribe, index) => ({
    rank: index + 1,
    tribeId: tribe._id,
    prizeAmount: prizeBreakdown[index],
    paid: false
  }));

  await Season.findByIdAndUpdate(seasonId, {
    status: 'ended',
    winningTribes
  });

  // Distribute prizes to each tribe member
  for (let i = 0; i < topTribes.length; i++) {
    const tribe = topTribes[i];
    const tribePrize = prizeBreakdown[i];

    // Distribution: Chieftain 20%, Captains 15% each, Warriors split remaining
    const chieftainShare = tribePrize * 0.20;
    const captainShare = tribePrize * 0.15;
    const warriorsTotalShare = tribePrize * 0.50;
    const warriorShare = warriorsTotalShare / 9; // 9 warriors

    // Create payout records
    await createPayout(tribe.chieftain, chieftainShare, seasonId);

    for (const captain of tribe.captains) {
      await createPayout(captain, captainShare, seasonId);
    }

    for (const warrior of tribe.warriors) {
      await createPayout(warrior, warriorShare, seasonId);
    }
  }

  console.log(`Season ${seasonId} ended. Prizes distributed to ${topTribes.length} tribes.`);
}

async function createPayout(userId, amount, seasonId) {
  const user = await User.findById(userId);

  // Create payment record
  await Payment.create({
    userId,
    walletAddress: user.walletAddress,
    seasonId,
    type: 'prize_payout',
    amount,
    currency: 'USDT',
    method: 'crypto',
    status: 'pending'
  });

  // TODO: Trigger USDT transfer via smart contract or manual process
  console.log(`Payout created: ${user.walletAddress} → ${amount} USDT`);
}
```

---

## 9. Performance Requirements

### 9.1 Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **API Response Time** | < 200ms (p95) | All REST endpoints |
| **WebSocket Latency** | < 100ms | Event delivery |
| **Battle Processing** | < 5 seconds | Queue to completion |
| **Database Queries** | < 50ms (p95) | With indexes |
| **Concurrent Users** | 1000 | Simultaneous connections |
| **Uptime** | 99.5% | During season (10 days) |

### 9.2 Optimization Strategies

**Database Indexing:**
```javascript
// Critical indexes for performance
db.users.createIndex({ walletAddress: 1 }, { unique: true });
db.users.createIndex({ seasonId: 1, victoryPoints: -1 });
db.users.createIndex({ tribeId: 1 });

db.territories.createIndex({ territoryId: 1, seasonId: 1 }, { unique: true });
db.territories.createIndex({ ownerId: 1 });
db.territories.createIndex({ seasonId: 1 });

db.battles.createIndex({ attackerId: 1, createdAt: -1 });
db.battles.createIndex({ defenderId: 1, createdAt: -1 });
db.battles.createIndex({ territoryId: 1, createdAt: -1 });
db.battles.createIndex({ seasonId: 1, createdAt: -1 });

db.tribes.createIndex({ seasonId: 1, totalVP: -1 });
db.tribes.createIndex({ chieftain: 1 });
```

**Redis Caching:**
```javascript
const redis = require('ioredis');
const client = new redis(process.env.REDIS_URL);

// Cache leaderboard (5 minute TTL)
async function getCachedLeaderboard(seasonId) {
  const cacheKey = `leaderboard:players:${seasonId}`;
  const cached = await client.get(cacheKey);

  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const players = await User.find({ seasonId })
    .sort({ victoryPoints: -1 })
    .limit(100)
    .lean();

  // Cache for 5 minutes
  await client.setex(cacheKey, 300, JSON.stringify(players));

  return players;
}

// Invalidate cache when VP changes
async function invalidateLeaderboardCache(seasonId) {
  await client.del(`leaderboard:players:${seasonId}`);
  await client.del(`leaderboard:tribes:${seasonId}`);
}
```

**Connection Pooling:**
```javascript
// MongoDB connection pool
mongoose.connect(process.env.MONGODB_URI, {
  maxPoolSize: 50,
  minPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
});

// Redis connection pool
const redisClient = new redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectionPoolSize: 10
});
```

---

## 10. Deployment Architecture

### 10.1 Infrastructure Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE CDN                           │
│  - Static assets (React build)                                 │
│  - DDoS protection                                              │
│  - SSL/TLS termination                                          │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                      AWS ELASTIC LOAD BALANCER                  │
│  - Health checks                                                │
│  - SSL certificate                                              │
│  - Sticky sessions (WebSocket)                                  │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────┬──────────────────┬──────────────────────────┐
│   EC2 Instance   │   EC2 Instance   │    EC2 Instance          │
│    (API Server)  │    (API Server)  │     (API Server)         │
│   Node.js + PM2  │   Node.js + PM2  │    Node.js + PM2         │
└──────────────────┴──────────────────┴──────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                       MONGODB ATLAS                             │
│  - M10 Cluster (3-node replica set)                            │
│  - Auto-scaling                                                 │
│  - Daily backups                                                │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    AWS ELASTICACHE (REDIS)                      │
│  - 2-node cluster                                               │
│  - Automatic failover                                           │
└────────────────────────────────────────────────────────────────┘
```

### 10.2 Environment Configuration

**Production (.env.production):**
```bash
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.cryptotribes.io

# Database
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.mongodb.net/cryptotribes
REDIS_URL=redis://elasticache.amazonaws.com:6379

# Auth
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d

# Blockchain
ETH_RPC_URL=https://mainnet.infura.io/v3/<project-id>
WALLET_AGE_DAYS=90
MIN_TX_COUNT=10

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Cron
CRON_SECRET=<strong-random-secret>

# Monitoring
DATADOG_API_KEY=<api-key>
SENTRY_DSN=<sentry-dsn>

# CORS
CLIENT_URL=https://cryptotribes.io
```

### 10.3 Deployment Process

**CI/CD Pipeline (GitHub Actions):**
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to EC2
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          username: ubuntu
          key: ${{ secrets.EC2_SSH_KEY }}
          script: |
            cd /var/www/cryptotribes
            git pull origin main
            npm install --production
            pm2 reload ecosystem.config.js
```

**PM2 Ecosystem:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'cryptotribes-api',
    script: './server/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
};
```

---

## 11. Development Workflow

### 11.1 Project Structure

```
cryptotribes/
├── server/
│   ├── server.js                  # Express app entry point
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── buildings.js
│   │   ├── training.js
│   │   ├── battles.js
│   │   ├── territories.js
│   │   ├── tribes.js
│   │   └── seasons.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── battleController.js
│   │   └── ...
│   ├── services/
│   │   ├── battleService.js       # Battle calculation engine
│   │   ├── resourceService.js     # Resource generation
│   │   ├── vpService.js           # VP calculations
│   │   └── paymentService.js      # Stripe integration
│   ├── middlewares/
│   │   ├── auth.js                # JWT authentication
│   │   ├── validate.js            # Joi validation
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── utils/
│   │   ├── constants.js           # Game constants (unit stats, costs)
│   │   ├── formulas.js            # Battle formulas
│   │   └── logger.js              # Winston logger
│   └── queues/
│       ├── battleQueue.js
│       ├── vpQueue.js
│       └── resourceQueue.js
├── models/
│   ├── User.js
│   ├── Tribe.js
│   ├── Territory.js
│   ├── Battle.js
│   ├── Season.js
│   └── Payment.js
├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.jsx
│   ├── public/
│   └── vite.config.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
├── GDD.md
├── TECH_SPEC.md
└── README.md
```

### 11.2 Development Commands

```bash
# Install dependencies
npm install

# Run development server (with hot reload)
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Build frontend
npm run build

# Start production server
npm start

# Database seed (development)
npm run seed

# Create database indexes
npm run create-indexes
```

---

## 12. Testing Strategy

### 12.1 Unit Tests (Jest)

```javascript
// tests/unit/battleService.test.js
const { calculateBattlePower } = require('../../server/services/battleService');

describe('Battle Service', () => {
  describe('calculateBattlePower', () => {
    it('should calculate base power correctly', () => {
      const army = {
        militia: 100,
        spearman: 0,
        archer: 0,
        cavalry: 0
      };

      const power = calculateBattlePower(army, 'balanced', 'plains', {});

      // 100 * 100 HP * 10 DMG * 1.0 (no bonuses) = 100,000
      expect(power).toBe(100000);
    });

    it('should apply counter bonus correctly', () => {
      const cavalry = { militia: 0, spearman: 0, archer: 0, cavalry: 50 };
      const archers = { militia: 0, spearman: 0, archer: 100, cavalry: 0 };

      const power = calculateBattlePower(cavalry, 'offensive', 'plains', archers);

      // Should have 1.5x counter bonus against archers
      // 50 * 150 HP * 25 DMG * 1.5 (counter) * 1.15 (offensive) = 323,437
      expect(power).toBeCloseTo(323437);
    });

    it('should apply terrain modifiers', () => {
      const cavalry = { militia: 0, spearman: 0, archer: 0, cavalry: 50 };

      const powerPlains = calculateBattlePower(cavalry, 'balanced', 'plains', {});
      const powerForest = calculateBattlePower(cavalry, 'balanced', 'forest', {});

      // Cavalry has -25% in forest
      expect(powerForest).toBe(powerPlains * 0.75);
    });
  });
});
```

### 12.2 Integration Tests

```javascript
// tests/integration/battles.test.js
const request = require('supertest');
const app = require('../../server/server');
const User = require('../../models/User');
const Battle = require('../../models/Battle');

describe('Battle Endpoints', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    // Create test user
    const user = await User.create({
      walletAddress: '0xtest',
      gold: 10000,
      army: { militia: 100, spearman: 50, archer: 30, cavalry: 10 }
    });

    userId = user._id;
    authToken = generateTestToken(userId);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Battle.deleteMany({});
  });

  describe('POST /v1/battles/attack-territory', () => {
    it('should queue a battle successfully', async () => {
      const response = await request(app)
        .post('/v1/battles/attack-territory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          territoryId: 'test-territory-id',
          army: {
            militia: 50,
            spearman: 25,
            archer: 15,
            cavalry: 5
          },
          formation: 'offensive'
        });

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.data.battleId).toBeDefined();
      expect(response.body.data.status).toBe('queued');
    });

    it('should reject battle with insufficient units', async () => {
      const response = await request(app)
        .post('/v1/battles/attack-territory')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          territoryId: 'test-territory-id',
          army: {
            militia: 1000, // More than user has
            spearman: 0,
            archer: 0,
            cavalry: 0
          },
          formation: 'offensive'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INSUFFICIENT_UNITS');
    });
  });
});
```

### 12.3 E2E Tests (Playwright)

```javascript
// tests/e2e/battle-flow.spec.js
const { test, expect } = require('@playwright/test');

test.describe('Battle Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.click('text=Connect Wallet');
    // Mock wallet connection
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test-token');
    });
  });

  test('should attack territory and see results', async ({ page }) => {
    // Navigate to territories page
    await page.click('text=Territories');
    await expect(page).toHaveURL('/territories');

    // Select unclaimed territory
    await page.click('[data-territory-id="1"]');

    // Open attack modal
    await page.click('text=Attack');

    // Select army
    await page.fill('[name="militia"]', '50');
    await page.fill('[name="spearman"]', '25');
    await page.fill('[name="archer"]', '15');
    await page.fill('[name="cavalry"]', '5');

    // Select formation
    await page.click('[data-formation="offensive"]');

    // Submit attack
    await page.click('text=Confirm Attack');

    // Wait for battle to process
    await page.waitForSelector('text=Battle Complete', { timeout: 10000 });

    // Check results
    const result = await page.textContent('[data-battle-result]');
    expect(['Victory', 'Defeat']).toContain(result);
  });
});
```

---

## Appendices

### A. Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_TOKEN` | 401 | JWT token is invalid or expired |
| `INSUFFICIENT_RESOURCES` | 400 | Not enough gold/units |
| `BUILDING_ALREADY_UPGRADING` | 400 | Building upgrade in progress |
| `UNIT_NOT_UNLOCKED` | 400 | Unit requires higher barracks level |
| `ARMY_CAP_EXCEEDED` | 400 | Army size exceeds capacity |
| `TERRITORY_NOT_FOUND` | 404 | Territory does not exist |
| `ALREADY_IN_TRIBE` | 400 | User already belongs to a tribe |
| `TRIBE_FULL` | 400 | Tribe has 12/12 members |
| `SEASON_NOT_ACTIVE` | 400 | Season registration closed or ended |
| `PAYMENT_FAILED` | 402 | Payment processing failed |
| `CONCURRENT_MODIFICATION` | 409 | Optimistic locking conflict |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |

### B. Game Constants

```javascript
// server/utils/constants.js
module.exports = {
  UNIT_STATS: {
    militia: { hp: 100, damage: 10, cost: 10, speed: 'medium', trainTime: 60 },
    spearman: { hp: 120, damage: 15, cost: 25, speed: 'slow', trainTime: 120 },
    archer: { hp: 80, damage: 20, cost: 30, speed: 'fast', trainTime: 90 },
    cavalry: { hp: 150, damage: 25, cost: 50, speed: 'very_fast', trainTime: 180 }
  },

  COUNTER_BONUSES: {
    cavalry_vs_archer: 1.5,
    archer_vs_spearman: 1.5,
    spearman_vs_cavalry: 1.5
  },

  TERRAIN_MODIFIERS: {
    castle: { defenseBonus: 1.5, garrisonHpBonus: 1.3 },
    forest: { defenseBonus: 1.25, spearmanHp: 1.1, cavalryPenalty: 0.75 },
    hills: { defenseBonus: 1.15, archerDamage: 1.25, cavalryPenalty: 0.9 },
    river: { defenseBonus: 1.2, attackPenalty: 0.9, cavalryPenalty: 0.5 },
    plains: {}
  },

  BUILDING_COSTS: {
    barracks: [100, 200, 400, 800, 1500, 2000, 2500, 3000, 3000],
    warehouse: [80, 150, 300, 600, 1000, 1500, 1800, 2000, 2000],
    workshop: [150, 300, 600, 1200, 2000, 3000, 3500, 4000, 4000]
  },

  BUILDING_TIMES: {
    barracks: [300, 600, 1200, 2400, 3600, 7200, 10800, 14400, 18000],
    warehouse: [240, 480, 960, 1920, 2880, 5760, 8640, 11520, 14400],
    workshop: [360, 720, 1440, 2880, 4320, 8640, 12960, 17280, 21600]
  },

  TERRITORY_TIERS: {
    center: { vp: 100, gold: 100, ids: [1, 2, 3, 4, 5] },
    ring: { vp: 50, gold: 50, ids: Array.from({length: 15}, (_, i) => i + 6) },
    edge: { vp: 25, gold: 25, ids: Array.from({length: 30}, (_, i) => i + 21) }
  },

  SEASON_CONFIG: {
    duration: 10, // days
    entryFee: 25, // USDT
    platformFee: 3.75,
    prizePoolShare: 21.25
  }
};
```

---

**End of Technical Specification**

For questions or clarifications, refer to:
- [GDD.md](./GDD.md) - Complete game design document
- [spec.md](./spec.md) - Original game specification
- [README.md](./README.md) - Project overview
