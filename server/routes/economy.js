/**
 * ECONOMY ROUTES
 * Gold management, transfers, and resource overview
 */

const express = require('express');
const router = express.Router();

const User = require('../models/User');
const Tribe = require('../models/Tribe');
const Territory = require('../models/Territory');
const logger = require('../utils/logger');
const {
  UPKEEP_COSTS,
  LEADER_UPKEEP_PENALTIES,
  BASE_GENERATION,
  DIMINISHING_RETURNS,
  getDiminishingReturnsEfficiency,
} = require('../config/constants');
const {
  authenticate,
  requireTribe,
  requireTribeLeader,
} = require('../middleware/auth');
const {
  asyncHandler,
  InsufficientResourcesError,
  ForbiddenError,
  NotFoundError,
  GameError,
} = require('../middleware/errorHandler');
const { validate, economySchemas } = require('../middleware/validator');
const { withTransaction } = require('../config/database');

/**
 * @route   GET /api/v1/economy/overview
 * @desc    Get user's economy overview
 * @access  Private
 */
router.get('/overview',
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id)
      .select('gold premiumCurrency army buildings currentSeason')
      .lean();

    // Calculate army upkeep
    const totalUnits = (user.army.militia || 0) +
      (user.army.spearman || 0) +
      (user.army.archer || 0) +
      (user.army.cavalry || 0);
    const armyUpkeepPerHour = totalUnits * UPKEEP_COSTS.armyPerHour;

    // Get territories for income calculation
    let territoryIncome = 0;
    let territoryUpkeep = 0;
    let territoryCount = 0;

    if (user.currentSeason?.tribeId) {
      const territories = await Territory.find({
        'controlledBy.tribeId': user.currentSeason.tribeId,
        'garrison.contributors.userId': req.user.id,
      }).lean();

      territoryCount = territories.length;
      territoryUpkeep = territoryCount * UPKEEP_COSTS.territoryPerHour;

      for (const territory of territories) {
        // Find user's share
        const contributor = territory.garrison.contributors.find(
          c => c.userId.equals(req.user.id)
        );
        if (contributor) {
          const sharePercentage = contributor.percentage / 100;
          territoryIncome += territory.generation.goldPerHour * sharePercentage;
        }
      }
    }

    // Base generation
    const baseIncome = BASE_GENERATION.goldPerHour;

    // Calculate warehouse passive income
    const warehouseLevel = user.buildings?.warehouse?.level || 1;
    const warehouseConfig = require('../config/constants').BUILDING_COSTS.warehouse.levels
      .find(l => l.level === warehouseLevel);
    const warehouseIncome = warehouseConfig?.passiveIncome || 0;

    res.json({
      success: true,
      data: {
        balances: {
          gold: user.gold,
          premiumCurrency: user.premiumCurrency,
        },
        income: {
          base: baseIncome,
          territories: Math.floor(territoryIncome),
          warehouse: warehouseIncome,
          total: baseIncome + Math.floor(territoryIncome) + warehouseIncome,
        },
        expenses: {
          armyUpkeep: armyUpkeepPerHour,
          territoryUpkeep,
          total: armyUpkeepPerHour + territoryUpkeep,
        },
        netPerHour: baseIncome + Math.floor(territoryIncome) + warehouseIncome -
          armyUpkeepPerHour - territoryUpkeep,
        army: {
          total: totalUnits,
          upkeepPerHour: armyUpkeepPerHour,
        },
        territories: {
          count: territoryCount,
          upkeepPerHour: territoryUpkeep,
          incomePerHour: Math.floor(territoryIncome),
        },
      },
    });
  })
);

/**
 * @route   GET /api/v1/economy/transactions
 * @desc    Get transaction history
 * @access  Private
 */
router.get('/transactions',
  authenticate,
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 50, type } = req.query;

    const user = await User.findById(req.user.id)
      .select('transactions')
      .lean();

    let transactions = user.transactions || [];

    if (type) {
      transactions = transactions.filter(t => t.type === type);
    }

    // Sort by date descending
    transactions.sort((a, b) => b.timestamp - a.timestamp);

    // Paginate
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedTransactions = transactions.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions: paginatedTransactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.length,
          pages: Math.ceil(transactions.length / parseInt(limit)),
        },
      },
    });
  })
);

/**
 * @route   POST /api/v1/economy/transfer
 * @desc    Transfer gold to another player
 * @access  Private
 */
router.post('/transfer',
  authenticate,
  validate(economySchemas.transfer),
  asyncHandler(async (req, res) => {
    const { recipientId, amount, note } = req.body;

    if (recipientId === req.user.id) {
      throw new GameError('Cannot transfer to yourself', 'SELF_TRANSFER');
    }

    // 5% transfer fee
    const fee = Math.ceil(amount * 0.05);
    const totalCost = amount + fee;

    await withTransaction(async (session) => {
      const sender = await User.findById(req.user.id).session(session);
      const recipient = await User.findById(recipientId).session(session);

      if (!recipient) {
        throw new NotFoundError('Recipient');
      }

      if (sender.gold < totalCost) {
        throw new InsufficientResourcesError('gold');
      }

      // Deduct from sender
      sender.gold -= totalCost;
      sender.transactions.push({
        type: 'transfer_out',
        amount: -amount,
        fee,
        balance: sender.gold,
        description: `Transfer to ${recipient.profile.displayName}`,
        metadata: { recipientId, note },
        timestamp: new Date(),
      });
      await sender.save({ session });

      // Add to recipient
      recipient.gold += amount;
      recipient.transactions.push({
        type: 'transfer_in',
        amount,
        balance: recipient.gold,
        description: `Transfer from ${sender.profile.displayName}`,
        metadata: { senderId: req.user.id, note },
        timestamp: new Date(),
      });
      await recipient.save({ session });

      logger.info('Gold transferred', {
        from: req.user.id,
        to: recipientId,
        amount,
        fee,
      });
    });

    res.json({
      success: true,
      message: `Transferred ${amount} gold (fee: ${fee})`,
      data: {
        amount,
        fee,
        total: totalCost,
      },
    });
  })
);

/**
 * @route   GET /api/v1/economy/tribe/treasury
 * @desc    Get tribe treasury details
 * @access  Private (Members)
 */
router.get('/tribe/treasury',
  authenticate,
  requireTribe,
  asyncHandler(async (req, res) => {
    const tribe = await Tribe.findById(req.user.tribeId)
      .select('treasury name')
      .lean();

    if (!tribe) {
      throw new NotFoundError('Tribe');
    }

    res.json({
      success: true,
      data: {
        tribeName: tribe.name,
        balance: tribe.treasury.balance,
        transactions: tribe.treasury.history?.slice(-50),
        income: tribe.treasury.income,
        expenses: tribe.treasury.expenses,
      },
    });
  })
);

/**
 * @route   POST /api/v1/economy/tribe/treasury/withdraw
 * @desc    Withdraw from tribe treasury (Leadership)
 * @access  Private (Chieftain only)
 */
router.post('/tribe/treasury/withdraw',
  authenticate,
  requireTribeLeader,
  validate(economySchemas.tribeTreasuryWithdraw),
  asyncHandler(async (req, res) => {
    const { amount, reason } = req.body;
    const tribe = req.tribe;

    if (!req.isChieftain) {
      throw new ForbiddenError('Only chieftain can withdraw from treasury');
    }

    if (tribe.treasury.balance < amount) {
      throw new InsufficientResourcesError('treasury balance');
    }

    await withTransaction(async (session) => {
      // Deduct from treasury
      tribe.treasury.balance -= amount;
      tribe.treasury.history.push({
        type: 'withdrawal',
        amount: -amount,
        balance: tribe.treasury.balance,
        description: reason,
        initiatedBy: req.user.id,
        timestamp: new Date(),
      });
      await tribe.save({ session });

      // Add to chieftain
      const user = await User.findById(req.user.id).session(session);
      user.gold += amount;
      user.transactions.push({
        type: 'treasury_withdrawal',
        amount,
        balance: user.gold,
        description: `Treasury withdrawal: ${reason}`,
        timestamp: new Date(),
      });
      await user.save({ session });

      logger.info('Treasury withdrawal', {
        tribeId: tribe._id,
        userId: req.user.id,
        amount,
        reason,
      });
    });

    res.json({
      success: true,
      message: `Withdrew ${amount} gold from treasury`,
      data: {
        amount,
        newBalance: tribe.treasury.balance,
      },
    });
  })
);

/**
 * @route   POST /api/v1/economy/tribe/treasury/deposit
 * @desc    Deposit gold to tribe treasury
 * @access  Private (Members)
 */
router.post('/tribe/treasury/deposit',
  authenticate,
  requireTribe,
  asyncHandler(async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      throw new GameError('Invalid amount', 'INVALID_AMOUNT');
    }

    await withTransaction(async (session) => {
      const user = await User.findById(req.user.id).session(session);
      const tribe = await Tribe.findById(req.user.tribeId).session(session);

      if (user.gold < amount) {
        throw new InsufficientResourcesError('gold');
      }

      // Deduct from user
      user.gold -= amount;
      user.transactions.push({
        type: 'treasury_deposit',
        amount: -amount,
        balance: user.gold,
        description: `Treasury deposit to ${tribe.name}`,
        timestamp: new Date(),
      });
      await user.save({ session });

      // Add to treasury
      tribe.treasury.balance += amount;
      tribe.treasury.history.push({
        type: 'deposit',
        amount,
        balance: tribe.treasury.balance,
        description: `Deposit from ${user.profile.displayName}`,
        initiatedBy: req.user.id,
        timestamp: new Date(),
      });
      await tribe.save({ session });

      logger.info('Treasury deposit', {
        tribeId: tribe._id,
        userId: req.user.id,
        amount,
      });
    });

    res.json({
      success: true,
      message: `Deposited ${amount} gold to treasury`,
    });
  })
);

/**
 * @route   GET /api/v1/economy/diminishing-returns
 * @desc    Get diminishing returns info
 * @access  Private
 */
router.get('/diminishing-returns',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        brackets: DIMINISHING_RETURNS.brackets,
        explanation: 'Holding more territories decreases income efficiency per territory',
      },
    });
  })
);

/**
 * @route   GET /api/v1/economy/upkeep-rates
 * @desc    Get upkeep rate info
 * @access  Private
 */
router.get('/upkeep-rates',
  authenticate,
  asyncHandler(async (req, res) => {
    res.json({
      success: true,
      data: {
        territoryPerHour: UPKEEP_COSTS.territoryPerHour,
        armyPerHour: UPKEEP_COSTS.armyPerHour,
        leaderPenalties: LEADER_UPKEEP_PENALTIES,
        explanation: 'Higher ranked tribes pay increased upkeep as a catch-up mechanic',
      },
    });
  })
);

module.exports = router;
