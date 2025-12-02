/**
 * ROUTES INDEX
 * Central export for all route modules
 */

const authRoutes = require('./auth');
const userRoutes = require('./users');
const tribeRoutes = require('./tribes');
const territoryRoutes = require('./territories');
const buildingRoutes = require('./buildings');
const unitRoutes = require('./units');
const battleRoutes = require('./battles');
const economyRoutes = require('./economy');
const seasonRoutes = require('./seasons');
const leaderboardRoutes = require('./leaderboard');
const paymentRoutes = require('./payments');
const adminRoutes = require('./admin');
const healthRoutes = require('./health');

module.exports = {
  authRoutes,
  userRoutes,
  tribeRoutes,
  territoryRoutes,
  buildingRoutes,
  unitRoutes,
  battleRoutes,
  economyRoutes,
  seasonRoutes,
  leaderboardRoutes,
  paymentRoutes,
  adminRoutes,
  healthRoutes,
};
