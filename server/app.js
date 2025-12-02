/**
 * EXPRESS APPLICATION CONFIGURATION
 * Main application setup with middleware, routes, and error handling
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');

const logger = require('./utils/logger');
const { globalRateLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const tribeRoutes = require('./routes/tribes');
const territoryRoutes = require('./routes/territories');
const buildingRoutes = require('./routes/buildings');
const unitRoutes = require('./routes/units');
const battleRoutes = require('./routes/battles');
const economyRoutes = require('./routes/economy');
const seasonRoutes = require('./routes/seasons');
const leaderboardRoutes = require('./routes/leaderboard');
const paymentRoutes = require('./routes/payments');
const adminRoutes = require('./routes/admin');
const healthRoutes = require('./routes/health');

// Admin Panel routes (separate from in-game admin)
const adminPanelRoutes = require('./routes/admin/index');

const app = express();

// ===========================================
// SECURITY MIDDLEWARE
// ===========================================

// Set security HTTP headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Enable CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400, // 24 hours
}));

// Prevent HTTP Parameter Pollution
app.use(hpp({
  whitelist: ['sort', 'fields', 'page', 'limit'], // Allow these to be duplicated
}));

// Sanitize data against NoSQL injection
app.use(mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    logger.warn(`Sanitized potential NoSQL injection attempt`, {
      ip: req.ip,
      path: req.path,
      key,
    });
  },
}));

// ===========================================
// PERFORMANCE MIDDLEWARE
// ===========================================

// Compression
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));

// ===========================================
// PARSING MIDDLEWARE
// ===========================================

// Parse JSON bodies
app.use(express.json({
  limit: '10kb', // Limit body size
  verify: (req, res, buf) => {
    req.rawBody = buf; // Store raw body for webhook verification
  },
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({
  extended: true,
  limit: '10kb',
}));

// Parse cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// ===========================================
// LOGGING MIDDLEWARE
// ===========================================

// HTTP request logging with Morgan
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Custom request logging with timing
app.use(requestLogger);

// ===========================================
// RATE LIMITING
// ===========================================

// Apply global rate limiter
app.use(globalRateLimiter);

// ===========================================
// TRUST PROXY (for production behind load balancer)
// ===========================================

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// ===========================================
// API ROUTES
// ===========================================

const API_PREFIX = '/api/v1';

// Health check (no auth required)
app.use(`${API_PREFIX}/health`, healthRoutes);

// Authentication routes
app.use(`${API_PREFIX}/auth`, authRoutes);

// Protected routes
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/tribes`, tribeRoutes);
app.use(`${API_PREFIX}/territories`, territoryRoutes);
app.use(`${API_PREFIX}/buildings`, buildingRoutes);
app.use(`${API_PREFIX}/units`, unitRoutes);
app.use(`${API_PREFIX}/battles`, battleRoutes);
app.use(`${API_PREFIX}/economy`, economyRoutes);
app.use(`${API_PREFIX}/seasons`, seasonRoutes);
app.use(`${API_PREFIX}/leaderboard`, leaderboardRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);

// Admin routes (requires admin role)
app.use(`${API_PREFIX}/admin`, adminRoutes);

// ===========================================
// ADMIN PANEL (React-Admin Backend)
// ===========================================
app.use('/api/admin', adminPanelRoutes);

// ===========================================
// ERROR HANDLING
// ===========================================

// Handle 404 - Route not found
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
