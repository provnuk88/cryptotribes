/**
 * VALIDATION MIDDLEWARE
 * Request validation using Joi
 */

const Joi = require('joi');
const { ValidationError } = require('./errorHandler');

/**
 * Validate request against schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Request property to validate ('body', 'query', 'params')
 */
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true, // Convert types where possible
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
      }));

      return next(new ValidationError('Validation failed', errors));
    }

    // Replace request data with validated/sanitized value
    req[source] = value;
    next();
  };
};

// ===========================================
// COMMON VALIDATION SCHEMAS
// ===========================================

/**
 * MongoDB ObjectId validation
 */
const objectId = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('Invalid ID format');

/**
 * Wallet address validation (Ethereum-style)
 */
const walletAddress = Joi.string()
  .pattern(/^0x[a-fA-F0-9]{40}$/)
  .message('Invalid wallet address format');

/**
 * Pagination schema
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().pattern(/^-?[\w.]+$/),
});

/**
 * ID params schema
 */
const idParamSchema = Joi.object({
  id: objectId.required(),
});

// ===========================================
// AUTH VALIDATION SCHEMAS
// ===========================================

const authSchemas = {
  register: Joi.object({
    walletAddress: walletAddress.required(),
    signature: Joi.string().required(),
    nonce: Joi.string().required(),
    displayName: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/),
    referralCode: Joi.string().optional(),
  }),

  login: Joi.object({
    walletAddress: walletAddress.required(),
    signature: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};

// ===========================================
// USER VALIDATION SCHEMAS
// ===========================================

const userSchemas = {
  updateProfile: Joi.object({
    displayName: Joi.string().min(3).max(30).pattern(/^[a-zA-Z0-9_]+$/),
    bio: Joi.string().max(500),
    avatar: Joi.string().uri(),
    settings: Joi.object({
      notifications: Joi.object({
        email: Joi.boolean(),
        push: Joi.boolean(),
        battleAlerts: Joi.boolean(),
        tribeMessages: Joi.boolean(),
      }),
      privacy: Joi.object({
        showProfile: Joi.boolean(),
        showStats: Joi.boolean(),
      }),
    }),
  }),
};

// ===========================================
// TRIBE VALIDATION SCHEMAS
// ===========================================

const tribeSchemas = {
  create: Joi.object({
    name: Joi.string().min(3).max(30).required()
      .pattern(/^[a-zA-Z0-9_\s]+$/)
      .message('Tribe name can only contain letters, numbers, underscores and spaces'),
    description: Joi.string().max(500),
    tag: Joi.string().min(2).max(5).pattern(/^[A-Z0-9]+$/),
    isPublic: Joi.boolean().default(true),
  }),

  update: Joi.object({
    description: Joi.string().max(500),
    banner: Joi.string().uri(),
    isPublic: Joi.boolean(),
    recruitmentMessage: Joi.string().max(200),
  }),

  invite: Joi.object({
    userId: objectId.required(),
    message: Joi.string().max(200),
  }),

  kick: Joi.object({
    userId: objectId.required(),
    reason: Joi.string().max(200),
  }),

  promote: Joi.object({
    userId: objectId.required(),
    role: Joi.string().valid('captain', 'member').required(),
  }),

  declareWar: Joi.object({
    targetTribeId: objectId.required(),
    declaration: Joi.string().max(500),
  }),

  createVote: Joi.object({
    type: Joi.string().valid(
      'war_declaration',
      'peace_treaty',
      'alliance',
      'treasury_spend',
      'kick_member',
      'promote_captain',
      'custom'
    ).required(),
    targetId: objectId,
    amount: Joi.number().positive(),
    description: Joi.string().max(500).required(),
    options: Joi.array().items(Joi.string().max(100)).max(5),
    duration: Joi.number().integer().min(3600).max(172800).default(86400), // 1h - 48h
  }),

  castVote: Joi.object({
    voteId: objectId.required(),
    choice: Joi.string().valid('approve', 'reject', 'abstain').required(),
  }),

  announcement: Joi.object({
    title: Joi.string().max(100).required(),
    content: Joi.string().max(2000).required(),
    priority: Joi.string().valid('normal', 'important', 'urgent').default('normal'),
    isPinned: Joi.boolean().default(false),
  }),
};

// ===========================================
// TERRITORY VALIDATION SCHEMAS
// ===========================================

const territorySchemas = {
  attack: Joi.object({
    territoryId: Joi.number().integer().min(1).max(50).required(),
    units: Joi.object({
      militia: Joi.number().integer().min(0).default(0),
      spearman: Joi.number().integer().min(0).default(0),
      archer: Joi.number().integer().min(0).default(0),
      cavalry: Joi.number().integer().min(0).default(0),
    }).required().custom((value, helpers) => {
      const totalUnits = value.militia + value.spearman + value.archer + value.cavalry;
      if (totalUnits === 0) {
        return helpers.error('custom', { message: 'Must send at least one unit' });
      }
      return value;
    }),
    formation: Joi.string().valid('offensive', 'defensive', 'balanced').default('balanced'),
  }),

  reinforce: Joi.object({
    territoryId: Joi.number().integer().min(1).max(50).required(),
    units: Joi.object({
      militia: Joi.number().integer().min(0).default(0),
      spearman: Joi.number().integer().min(0).default(0),
      archer: Joi.number().integer().min(0).default(0),
      cavalry: Joi.number().integer().min(0).default(0),
    }).required(),
  }),

  withdraw: Joi.object({
    territoryId: Joi.number().integer().min(1).max(50).required(),
    units: Joi.object({
      militia: Joi.number().integer().min(0),
      spearman: Joi.number().integer().min(0),
      archer: Joi.number().integer().min(0),
      cavalry: Joi.number().integer().min(0),
    }),
    withdrawAll: Joi.boolean().default(false),
  }),

  shield: Joi.object({
    territoryId: Joi.number().integer().min(1).max(50).required(),
  }),
};

// ===========================================
// BUILDING VALIDATION SCHEMAS
// ===========================================

const buildingSchemas = {
  upgrade: Joi.object({
    buildingType: Joi.string().valid('barracks', 'warehouse', 'workshop').required(),
  }),

  cancelUpgrade: Joi.object({
    buildingType: Joi.string().valid('barracks', 'warehouse', 'workshop').required(),
  }),
};

// ===========================================
// UNIT VALIDATION SCHEMAS
// ===========================================

const unitSchemas = {
  train: Joi.object({
    unitType: Joi.string().valid('militia', 'spearman', 'archer', 'cavalry').required(),
    quantity: Joi.number().integer().min(1).max(100).required(),
  }),

  cancelTraining: Joi.object({
    queueIndex: Joi.number().integer().min(0).required(),
  }),
};

// ===========================================
// BATTLE VALIDATION SCHEMAS
// ===========================================

const battleSchemas = {
  list: Joi.object({
    territoryId: Joi.number().integer().min(1).max(50),
    tribeId: objectId,
    userId: objectId,
    result: Joi.string().valid('attacker_victory', 'defender_victory', 'draw'),
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(20),
  }),
};

// ===========================================
// ECONOMY VALIDATION SCHEMAS
// ===========================================

const economySchemas = {
  transfer: Joi.object({
    recipientId: objectId.required(),
    amount: Joi.number().positive().precision(2).required(),
    note: Joi.string().max(200),
  }),

  tribeTreasuryWithdraw: Joi.object({
    amount: Joi.number().positive().required(),
    reason: Joi.string().max(200).required(),
  }),
};

// ===========================================
// PAYMENT VALIDATION SCHEMAS
// ===========================================

const paymentSchemas = {
  createPayment: Joi.object({
    type: Joi.string().valid('season_entry', 'gold_pack', 'premium').required(),
    paymentMethod: Joi.string().valid('stripe', 'crypto').required(),
    productId: Joi.string().when('type', {
      is: 'gold_pack',
      then: Joi.required(),
    }),
    cryptoCurrency: Joi.string().valid('USDT', 'USDC', 'ETH').when('paymentMethod', {
      is: 'crypto',
      then: Joi.required(),
    }),
  }),

  verifyPayment: Joi.object({
    paymentId: objectId.required(),
    transactionHash: Joi.string().when('paymentMethod', {
      is: 'crypto',
      then: Joi.required(),
    }),
  }),
};

// ===========================================
// SEASON VALIDATION SCHEMAS
// ===========================================

const seasonSchemas = {
  join: Joi.object({
    seasonId: objectId.required(),
  }),

  create: Joi.object({
    name: Joi.string().min(3).max(50).required(),
    startDate: Joi.date().iso().greater('now').required(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
    entryFee: Joi.number().positive().required(),
    maxPlayers: Joi.number().integer().min(100).max(10000).default(1000),
    prizePoolPercentage: Joi.number().min(0.5).max(1).default(0.85),
  }),
};

// ===========================================
// ADMIN VALIDATION SCHEMAS
// ===========================================

const adminSchemas = {
  banUser: Joi.object({
    userId: objectId.required(),
    reason: Joi.string().min(10).max(500).required(),
    duration: Joi.number().integer().min(0), // 0 = permanent
    evidence: Joi.array().items(Joi.string()),
  }),

  unbanUser: Joi.object({
    userId: objectId.required(),
    reason: Joi.string().max(500),
  }),

  adjustGold: Joi.object({
    userId: objectId.required(),
    amount: Joi.number().required(), // Can be negative
    reason: Joi.string().min(10).max(500).required(),
  }),

  resolveBehavioralFlag: Joi.object({
    flagId: objectId.required(),
    verdict: Joi.string().valid('confirmed', 'false_positive', 'investigating').required(),
    action: Joi.string().valid('none', 'warning', 'suspension', 'ban').required(),
    notes: Joi.string().max(1000),
    suspensionDays: Joi.number().integer().min(1).max(365).when('action', {
      is: 'suspension',
      then: Joi.required(),
    }),
  }),

  createAnnouncement: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    content: Joi.string().min(10).max(5000).required(),
    type: Joi.string().valid('info', 'warning', 'maintenance', 'event').default('info'),
    expiresAt: Joi.date().iso().greater('now'),
    isGlobal: Joi.boolean().default(true),
  }),

  configSeason: Joi.object({
    seasonId: objectId.required(),
    settings: Joi.object({
      eventMultipliers: Joi.object(),
      bonuses: Joi.object(),
      restrictions: Joi.object(),
    }),
  }),
};

// ===========================================
// EXPORTS
// ===========================================

module.exports = {
  validate,
  objectId,
  walletAddress,
  paginationSchema,
  idParamSchema,

  // Schema collections
  authSchemas,
  userSchemas,
  tribeSchemas,
  territorySchemas,
  buildingSchemas,
  unitSchemas,
  battleSchemas,
  economySchemas,
  paymentSchemas,
  seasonSchemas,
  adminSchemas,
};
