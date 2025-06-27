require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Initialize database connection
require('./db');

const User = require('../models/User');
const gameLogic = require('./gameLogic');
const { logger, httpLogger } = require('./logger');
const {
  securityMiddleware,
  generalLimiter,
  authLimiter,
  gameLimiter,
  createLimiter,
  bruteForceProtection,
  incrementLoginAttempts,
  resetLoginAttempts,
  validators
} = require('./securityMiddlewares');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.use(securityMiddleware);
app.use(httpLogger);

app.use('/api/', generalLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);
app.use('/api/build', gameLimiter);
app.use('/api/train', gameLimiter);
app.use('/api/tribe/create', createLimiter);

app.use(session({
  secret: process.env.SESSION_SECRET || 'cryptotribes-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production'
  }
}));

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
}

// === АВТОРИЗАЦИЯ ===
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  const usernameError = validators.username(username);
  const passwordError = validators.password(password);

  if (usernameError) return res.status(400).json({ error: usernameError });
  if (passwordError) return res.status(400).json({ error: passwordError });

  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ error: 'Пользователь уже существует' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, password: hashedPassword });

    await gameLogic.createVillage(user._id, `${username}'s Village`);

    req.session.userId = user._id;
    req.session.username = username;
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');

    res.json({ success: true, username, csrfToken: req.session.csrfToken });
  } catch (err) {
    logger.error('Registration error', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/login', bruteForceProtection, async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      incrementLoginAttempts(req.bruteForceKey, req.bruteForceAttempts);
      return res.status(400).json({ error: 'Неверный логин или пароль' });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      incrementLoginAttempts(req.bruteForceKey, req.bruteForceAttempts);
      return res.status(400).json({ error: 'Неверный логин или пароль' });
    }
    resetLoginAttempts(req.bruteForceKey);
    req.session.userId = user._id;
    req.session.username = user.username;
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
    user.lastLogin = new Date();
    await user.save();
    res.json({ success: true, username: user.username, csrfToken: req.session.csrfToken });
  } catch (err) {
    logger.error('Login error', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/user', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.session.userId).lean();
    res.json({
      userId: user._id,
      username: user.username,
      crystals: user.crystals,
      tribeId: user.tribe,
      csrfToken: req.session.csrfToken
    });
  } catch (err) {
    logger.error('Get user error', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// === ИГРОВЫЕ ДАННЫЕ ===
app.get('/api/village/:id?', requireAuth, async (req, res) => {
  try {
    const village = await gameLogic.getVillage(req.session.userId, req.params.id);
    if (!village) return res.status(404).json({ error: 'Деревня не найдена' });
    const updated = await gameLogic.updateVillageResources(village);
    res.json(updated);
  } catch (err) {
    logger.error('Get village error', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/api/buildings/:villageId', requireAuth, async (req, res) => {
  try {
    const buildings = await gameLogic.getBuildings(req.params.villageId);
    res.json(buildings);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/build', requireAuth, async (req, res) => {
  const { villageId, buildingType } = req.body;
  try {
    const result = await gameLogic.upgradeBuilding(req.session.userId, villageId, buildingType);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/troops/:villageId', requireAuth, async (req, res) => {
  try {
    const troops = await gameLogic.getTroops(req.params.villageId);
    res.json(troops);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/api/train', requireAuth, async (req, res) => {
  const { villageId, troopType, amount } = req.body;
  try {
    const result = await gameLogic.trainTroops(req.session.userId, villageId, troopType, amount);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint не найден' });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const server = app.listen(PORT, () => {
  console.log(`CryptoTribes запущен на порту ${PORT}`);
});

process.on('SIGTERM', async () => {
  await require('mongoose').disconnect();
  server.close(() => process.exit(0));
});

module.exports = app;
