# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CryptoTribes is a competitive 10-day seasonal browser-based strategy MMO where 12-person tribes battle for territory control with real money prizes ($25 entry, $21,250 prize pool per season).

**Tech Stack**: Node.js + Express + MongoDB + Redis (Bull.js) | React + Vite + Zustand + Tailwind

## Commands

```bash
# Development
npm run dev              # Start server + client with hot reload

# Production
npm start                # Production server

# Testing
npm test                 # Full test suite
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage
npm test -- battleService.test.js  # Single test file

# Linting
npm run lint             # Check lint errors
npm run lint:fix         # Auto-fix lint errors

# Database
npm run seed             # Seed development data
npm run migrate          # Run migrations
npm run reset-season     # Reset season data

# Docker
docker-compose up -d     # Start full stack (MongoDB, Redis, Backend, Frontend)
docker-compose logs -f   # View logs
docker-compose down      # Stop stack
```

## Architecture

```
server/                         # Node.js backend (Express)
├── server.js                   # Entry point with graceful shutdown
├── app.js                      # Express config + middleware
├── config/constants.js         # Game constants (unit stats, costs, formulas)
├── models/                     # Mongoose schemas (User, Tribe, Territory, Battle, Season, Payment)
├── routes/                     # REST API endpoints (/api/v1/*)
├── services/                   # Business logic
│   ├── battleQueue.js          # Bull.js queue for sequential battle processing
│   ├── combatCalculator.js     # Battle power formula + casualties
│   ├── economyService.js       # Resource generation, upkeep
│   └── vpService.js            # Victory point calculation
├── jobs/                       # Cron jobs (building completion, training, VP generation)
└── middleware/                 # Auth, validation, rate limiting, error handling

client/                         # React frontend (Vite)
├── src/
│   ├── components/             # Reusable React components
│   ├── pages/                  # Page components (Dashboard, Map, Profile, Tribe, Leaderboard)
│   ├── stores/                 # Zustand stores (gameStore, tribeStore, uiStore)
│   └── services/               # API client services (Axios)
```

## Key Game Systems

**Combat**: Auto-resolve battles with rock-paper-scissors counters (Cavalry > Archer > Spearman > Cavalry). Battle power = units × HP × DMG × counter × formation × terrain. Defender gets 1.2x bonus. ±10% RNG variance.

**Economy**: Gold is the single resource. Generated from territories (25-100g/hr) and Warehouse (up to 20g/hr). Diminishing returns above 15 territories. Upkeep: 20g/hr per territory + 1g/hr per 10 units.

**VP System**: Victory Points determine winners. Generated hourly from territory control. Underdog bonuses for rank 11+. Leader penalties for rank 1-2.

**Anti-Snowball**: Diminishing returns (16+ territories = inefficient), leader upkeep penalties, underdog VP bonuses, war declarations (+50% VP when ganging up on leader).

## Database Patterns

- **Optimistic locking**: User model has `version` field to prevent race conditions
- **Transactions**: MongoDB sessions for multi-document updates (battles, territory captures)
- **Indexes**: `seasonId + victoryPoints`, `walletAddress`, `territoryId + seasonId`

## Critical Files

- `server/config/constants.js` - All game balance numbers (unit stats, building costs, formulas)
- `server/services/combatCalculator.js` - Battle resolution logic
- `server/services/battleQueue.js` - Sequential battle processing with Bull.js
- `GDD.md` - Complete game design document (canonical reference)
- `TECH_SPEC.md` - Technical specification with formulas

## Environment Variables

Copy `.env.example` to `.env` and configure:
- `MONGODB_URI` - MongoDB connection string
- `REDIS_URL` - Redis for Bull.js queue
- `JWT_SECRET` - JWT signing key
- `STRIPE_SECRET_KEY` - Stripe payment processing

## Code Style

- CommonJS modules (require/module.exports)
- Winston logger (never console.log in production)
- Joi for input validation on routes
- Error responses use specific codes (INSUFFICIENT_GOLD, INVALID_TERRITORY, etc.)

## API Structure

Base URL: `/api/v1`

Authentication: Wallet-based (sign message → JWT token in `Authorization: Bearer <token>` header)

Response format:
```javascript
// Success
{ success: true, data: {...}, meta: { timestamp, requestId } }

// Error
{ success: false, error: { code, message, details }, meta: { timestamp, requestId } }
```

Rate limits: 100 req/hr global, 20 attacks/min, 10 auth attempts/15min
