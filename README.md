# CryptoTribes

A competitive 14-day seasonal strategy game with real money prizes.

## Overview

CryptoTribes is a browser-based PvPvE multiplayer strategy game where players compete in 14-day seasons to control territories, build armies, and lead their tribes to victory.

## Game Features

- **50 Territories**: Center (5), Ring (15), Edges (30)
- **4 Unit Types**: Militia, Spearman, Archer, Cavalry with counter-bonus system
- **5 Buildings**: Barracks, Warehouse, Workshop, Market, Headquarters
- **12-Player Tribes**: Chieftain, Captains, Warriors
- **Real-time Battles**: WebSocket-powered live updates
- **Victory Points System**: Territory control and battle victories
- **Prize Pool**: $25 entry fee, $21,250 prize distribution

## Tech Stack

- **Backend**: Node.js + Express + MongoDB
- **Real-time**: Socket.io (WebSocket)
- **Payment**: Stripe integration
- **Auth**: Wallet-based authentication
- **Frontend**: React + Vite

## Development Status

🚧 **Season 1 MVP in Development**

See [spec.md](./spec.md) for complete game specification.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env

# Run development server
npm run dev

# Run tests
npm test
```

## Project Structure

```
cryptotribes/
├── models/          # MongoDB schemas
├── server/          # Backend logic
│   ├── gameLogic.js
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── utils/
├── public/          # Frontend assets
├── tests/           # Test suites
└── spec.md          # Complete game specification
```

## Contributing

This project is currently in active development for Season 1 MVP.

## License

MIT
