/**
 * SEED DEMO SCRIPT
 * Creates a playable demo state with:
 * - 4 tribes with distinct identities
 * - 12 demo users (3 per tribe)
 * - Season initialized with 50 territories
 * - Territories distributed among tribes
 * - Initial battles in history
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const Season = require('../models/Season');
const Battle = require('../models/Battle');

const { connectDB } = require('../config/database');
const { initializeSeasonTerritories } = require('../services/territoryService');
const logger = require('../utils/logger');

// Demo data
const TRIBES = [
  {
    name: 'Iron Wolves',
    tag: 'WOLF',
    banner: '🐺',
    description: 'Fierce warriors from the northern mountains. Honor through strength.',
  },
  {
    name: 'Golden Eagles',
    tag: 'EAGL',
    banner: '🦅',
    description: 'Swift and cunning, masters of aerial reconnaissance.',
  },
  {
    name: 'Stone Bears',
    tag: 'BEAR',
    banner: '🐻',
    description: 'Unstoppable defenders. Once we dig in, none shall pass.',
  },
  {
    name: 'Shadow Serpents',
    tag: 'SERP',
    banner: '🐍',
    description: 'Strike from the shadows. Patience is our greatest weapon.',
  },
];

const USERS_PER_TRIBE = [
  // Wolves
  [
    { username: 'WolfLeader', role: 'chieftain' },
    { username: 'NorthernHowl', role: 'captain' },
    { username: 'SilverFang', role: 'warrior' },
  ],
  // Eagles
  [
    { username: 'SkyCommander', role: 'chieftain' },
    { username: 'WindRider', role: 'captain' },
    { username: 'TalonStrike', role: 'warrior' },
  ],
  // Bears
  [
    { username: 'StoneGuard', role: 'chieftain' },
    { username: 'IronWall', role: 'captain' },
    { username: 'MountainMight', role: 'warrior' },
  ],
  // Serpents
  [
    { username: 'ShadowMaster', role: 'chieftain' },
    { username: 'NightViper', role: 'captain' },
    { username: 'SilentFang', role: 'warrior' },
  ],
];

// Territory distribution (roughly equal)
const TERRITORY_DISTRIBUTION = {
  WOLF: [1, 6, 7, 8, 21, 22, 23, 24, 25],
  EAGL: [2, 9, 10, 11, 26, 27, 28, 29, 30],
  BEAR: [3, 12, 13, 14, 31, 32, 33, 34, 35],
  SERP: [4, 15, 16, 17, 36, 37, 38, 39, 40],
  // Territories 5, 18, 19, 20, 41-50 remain NPC
};

async function seedDemo() {
  try {
    logger.info('Starting demo seed...');

    // Connect to database
    await connectDB();

    // Clear existing data
    logger.info('Clearing existing data...');
    await Promise.all([
      User.deleteMany({}),
      Tribe.deleteMany({}),
      Territory.deleteMany({}),
      Season.deleteMany({}),
      Battle.deleteMany({}),
    ]);

    // Create season
    logger.info('Creating season...');
    const seasonStart = new Date();
    const seasonEnd = new Date(seasonStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const season = await Season.create({
      seasonNumber: 1,
      name: 'The Awakening',
      status: 'active',
      isActive: true,
      startDate: seasonStart,
      endDate: seasonEnd,
      prizePool: 5000,
      entryFeeDollars: 25,
      playerCount: 12,
      tribeCount: 4,
      adaptiveRingConfig: {
        centerCount: 5,
        innerRingCount: 15,
        outerRingCount: 30,
        totalTerritories: 50
      }
    });

    logger.info(`Season created: ${season.name}`);

    // First create leader users for each tribe (without tribeId - we'll update later)
    logger.info('Creating leader users...');
    const leaders = [];
    for (let i = 0; i < TRIBES.length; i++) {
      const leaderData = USERS_PER_TRIBE[i][0]; // First user is always leader
      const walletAddress = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`;

      const leader = await User.create({
        walletAddress: walletAddress.toLowerCase(),
        seasonId: season._id,
        username: leaderData.username,
        tribeRole: leaderData.role,
        gold: 5000,
        army: {
          militia: 50,
          spearman: 30,
          archer: 20,
          cavalry: 15,
        },
        buildings: {
          barracks: { level: 3, upgrading: false },
          warehouse: { level: 2, upgrading: false },
          workshop: { level: 1, upgrading: false },
        },
      });
      leaders.push(leader);
      logger.info(`Leader created: ${leader.username}`);
    }

    // Create tribes with chieftains
    logger.info('Creating tribes...');
    const tribes = [];
    for (let i = 0; i < TRIBES.length; i++) {
      const tribeData = TRIBES[i];
      const leader = leaders[i];

      const tribe = await Tribe.create({
        name: tribeData.name,
        tag: tribeData.tag,
        description: tribeData.description,
        seasonId: season._id,
        chieftainId: leader._id,
        status: 'active',
        memberCount: 3,
        territoryCount: 0,
        totalVP: Math.floor(Math.random() * 500) + 100,
        treasury: 1000,
      });

      // Update leader with tribe info
      await User.updateOne(
        { _id: leader._id },
        { tribeId: tribe._id }
      );

      tribes.push(tribe);
      logger.info(`Tribe created: ${tribe.name} [${tribe.tag}]`);
    }

    // Create remaining users (officers and members)
    logger.info('Creating additional users...');
    const users = [...leaders];
    for (let i = 0; i < tribes.length; i++) {
      const tribe = tribes[i];
      const tribeUsers = USERS_PER_TRIBE[i].slice(1); // Skip leader (already created)

      for (const userData of tribeUsers) {
        const walletAddress = `0x${Math.random().toString(16).slice(2, 42).padEnd(40, '0')}`;

        const user = await User.create({
          walletAddress: walletAddress.toLowerCase(),
          seasonId: season._id,
          tribeId: tribe._id,
          username: userData.username,
          tribeRole: userData.role,
          gold: Math.floor(Math.random() * 5000) + 1000,
          army: {
            militia: Math.floor(Math.random() * 50) + 20,
            spearman: Math.floor(Math.random() * 30) + 10,
            archer: Math.floor(Math.random() * 20) + 5,
            cavalry: Math.floor(Math.random() * 15) + 5,
          },
          buildings: {
            barracks: { level: Math.floor(Math.random() * 3) + 1, upgrading: false },
            warehouse: { level: Math.floor(Math.random() * 3) + 1, upgrading: false },
            workshop: { level: 1, upgrading: false },
          },
        });

        users.push(user);
        logger.info(`User created: ${user.username} (${tribe.tag})`);
      }
    }

    // Initialize territories
    logger.info('Initializing territories...');
    await initializeSeasonTerritories(season._id);

    // Assign territories to tribes
    logger.info('Assigning territories to tribes...');
    for (const [tag, territoryIds] of Object.entries(TERRITORY_DISTRIBUTION)) {
      const tribe = tribes.find((t) => t.tag === tag);
      if (!tribe) continue;

      // Refetch leaders with updated tribeId
      const updatedLeaders = await User.find({
        seasonId: season._id,
        tribeRole: 'chieftain',
        tribeId: tribe._id
      });

      const tribeUsers = users.filter(
        (u) => u.tribeId && u.tribeId.toString() === tribe._id.toString()
      ).concat(updatedLeaders);

      for (const territoryId of territoryIds) {
        const territory = await Territory.findOne({
          territoryId,
          seasonId: season._id,
        });
        if (!territory) continue;

        // Assign random user from tribe as capturer
        const capturer = tribeUsers[Math.floor(Math.random() * tribeUsers.length)];
        if (!capturer) continue;

        // Create garrison using correct schema
        const garrisonUnits = {
          militia: Math.floor(Math.random() * 20) + 5,
          spearman: Math.floor(Math.random() * 10) + 3,
          archer: Math.floor(Math.random() * 8) + 2,
          cavalry: Math.floor(Math.random() * 5) + 1,
        };

        // Update territory with correct schema
        territory.ownerId = tribe._id;
        territory.capturedAt = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

        territory.garrison = {
          tribeId: tribe._id,
          units: garrisonUnits,
          formation: 'balanced',
          lastUpdated: new Date(),
        };

        territory.garrisonContributors = [
          {
            userId: capturer._id,
            units: garrisonUnits,
            addedAt: new Date(),
          },
        ];

        // Deactivate NPC garrison
        territory.npcGarrison.active = false;

        await territory.save();
      }

      // Update tribe territory count
      tribe.territoryCount = territoryIds.length;
      await tribe.save();
    }

    logger.info('Territory assignment complete');

    // Create some battle history
    logger.info('Creating battle history...');
    const battleScenarios = [
      { attacker: 'WOLF', defender: 'EAGL', territory: 26, tier: 'edge', terrain: 'plains', attackerWins: false },
      { attacker: 'BEAR', defender: 'SERP', territory: 36, tier: 'edge', terrain: 'plains', attackerWins: true },
      { attacker: 'SERP', defender: 'WOLF', territory: 8, tier: 'ring', terrain: 'plains', attackerWins: false },
      { attacker: 'EAGL', defender: 'BEAR', territory: 31, tier: 'edge', terrain: 'plains', attackerWins: false },
    ];

    // Refetch all users with updated tribeIds
    const allUsers = await User.find({ seasonId: season._id });

    for (const scenario of battleScenarios) {
      const attackerTribe = tribes.find((t) => t.tag === scenario.attacker);
      const defenderTribe = tribes.find((t) => t.tag === scenario.defender);
      const attackerUser = allUsers.find(
        (u) => u.tribeId && u.tribeId.toString() === attackerTribe._id.toString()
      );
      const defenderUser = allUsers.find(
        (u) => u.tribeId && u.tribeId.toString() === defenderTribe._id.toString()
      );

      if (!attackerUser || !defenderUser) continue;

      const winnerId = scenario.attackerWins ? attackerUser._id : defenderUser._id;
      const winnerUsername = scenario.attackerWins ? attackerUser.username : defenderUser.username;

      await Battle.create({
        seasonId: season._id,
        battleType: 'pvp',
        attackerId: attackerUser._id,
        attackerUsername: attackerUser.username,
        attackerTribeId: attackerTribe._id,
        attackerTribeName: attackerTribe.name,
        defenderId: defenderUser._id,
        defenderUsername: defenderUser.username,
        defenderTribeId: defenderTribe._id,
        defenderTribeName: defenderTribe.name,
        territoryId: scenario.territory,
        territoryName: `Territory ${scenario.territory}`,
        territoryTier: scenario.tier,
        terrain: scenario.terrain,
        attackerArmy: { militia: 20, spearman: 10, archer: 5, cavalry: 3 },
        defenderArmy: { militia: 15, spearman: 8, archer: 6, cavalry: 4 },
        attackerFormation: 'offensive',
        defenderFormation: 'defensive',
        attackerPower: 1500,
        defenderPower: 1400,
        rngSeed: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        rngVariance: 1.0,
        winnerId: winnerId,
        winnerUsername: winnerUsername,
        casualties: {
          attacker: { militia: 8, spearman: 4, archer: 2, cavalry: 1, total: 15, percentage: 39 },
          defender: { militia: 6, spearman: 3, archer: 2, cavalry: 1, total: 12, percentage: 36 },
        },
        loot: {
          gold: scenario.attackerWins ? 100 : 0,
          stolenFrom: 'defender',
        },
        vpGained: {
          attacker: scenario.attackerWins ? 50 : 10,
          defender: scenario.attackerWins ? 10 : 30,
        },
        territoryTransferred: scenario.attackerWins,
        status: 'completed',
      });
    }

    logger.info('Battle history created');

    // Summary
    const territoryCounts = await Territory.aggregate([
      { $match: { ownerId: { $ne: null } } },
      { $group: { _id: '$ownerId', count: { $sum: 1 } } },
    ]);

    logger.info('========================================');
    logger.info('DEMO SEED COMPLETE');
    logger.info('========================================');
    logger.info(`Season: ${season.name} (${season.status})`);
    logger.info(`Tribes: ${tribes.length}`);
    logger.info(`Users: ${users.length}`);
    logger.info(`Territories: 50 total`);
    logger.info('');
    logger.info('Territory Distribution:');
    for (const tc of territoryCounts) {
      const tribe = tribes.find((t) => t._id.toString() === tc._id.toString());
      logger.info(`  ${tribe?.tag || 'Unknown'}: ${tc.count} territories`);
    }
    const npcCount = 50 - territoryCounts.reduce((a, b) => a + b.count, 0);
    logger.info(`  NPC: ${npcCount} territories`);
    logger.info('');
    logger.info('Demo Accounts (use MetaMask with these wallets):');
    for (const user of users.slice(0, 4)) {
      logger.info(`  ${user.username}: ${user.walletAddress}`);
    }
    logger.info('========================================');

    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedDemo();
}

module.exports = { seedDemo };
