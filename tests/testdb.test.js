jest.mock('stripe');
const request = require('supertest');
const mongoose = require('mongoose');
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');

// Тестовая база данных
const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptotribes_test';

// Создаем тестовое приложение без игрового цикла
const createTestApp = () => {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Сессии для тестов
  app.use(session({
    store: MongoStore.create({ mongoUrl: TEST_URI }),
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
  }));
  
  // Подключаем роуты
  const userRoutes = require('../server/routes/userRoutes');
  app.use('/api/users', userRoutes);
  
  // Тестовые роуты
  app.get('/api/test', (req, res) => res.json({ status: 'ok' }));
  
  return app;
};

// Модели
const User = require('../models/User');
const Village = require('../models/Village');
const Building = require('../models/Building');
const Troop = require('../models/Troop');
const gameLogic = require('../server/gamelogic');

const testUser = { username: 'testuser', password: 'testpass123' };
const testUser2 = { username: 'testuser2', password: 'testpass456' };

let app;
let server;

beforeAll(async () => {
  // Подключаемся к тестовой базе
  await mongoose.connect(TEST_URI, { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  });
  
  // Очищаем базу
  await mongoose.connection.db.dropDatabase();
  
  // Создаем тестовое приложение
  app = createTestApp();
  server = app.listen(3001);
});

afterAll(async () => {
  // Закрываем сервер
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
  
  // Отключаемся от MongoDB
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.db.dropDatabase();
    await mongoose.disconnect();
  }
  
  // Ждем завершения всех операций
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Очищаем данные между тестами
beforeEach(async () => {
  await User.deleteMany({});
  await Village.deleteMany({});
  await Building.deleteMany({});
  await Troop.deleteMany({});
});

// Authentication tests
describe('Authentication', () => {
  test('Should register a new user', async () => {
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.username).toBe(testUser.username);
  });

  test('Should not register duplicate user', async () => {
    // Сначала регистрируем пользователя
    await request(app).post('/api/users/register').send(testUser);
    
    // Пытаемся зарегистрировать того же пользователя
    const res = await request(app)
      .post('/api/users/register')
      .send(testUser);
    
    expect(res.status).toBe(400);
  });

  test('Should login with correct credentials', async () => {
    // Сначала регистрируем пользователя
    await request(app).post('/api/users/register').send(testUser);
    
    const res = await request(app)
      .post('/api/users/login')
      .send(testUser);
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Should reject login with wrong password', async () => {
    // Сначала регистрируем пользователя
    await request(app).post('/api/users/register').send(testUser);
    
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: testUser.username, password: 'wrong' });
    
    expect(res.status).toBe(400);
  });
});

describe('Game Logic', () => {
  let userId;
  let villageId;

  beforeEach(async () => {
    // Создаем пользователя и деревню для тестов
    const user = await User.create({
      username: 'gametest',
      password: await require('bcryptjs').hash('password', 10)
    });
    userId = user._id;
    
    villageId = await gameLogic.createVillage(userId, 'Test Village');
  });

  test('Should create village with initial resources', async () => {
    const village = await gameLogic.getVillage(userId, villageId);
    expect(village).toBeTruthy();
    expect(village.wood).toBe(1000);
    expect(village.clay).toBe(1000);
    expect(village.iron).toBe(1000);
    expect(village.food).toBe(1000);
  });

  test('Should get buildings list', async () => {
    const buildings = await gameLogic.getBuildings(villageId);
    expect(Array.isArray(buildings)).toBe(true);
    expect(buildings.length).toBeGreaterThan(0);
    
    const tribalHall = buildings.find(b => b.building_type === 'tribal_hall');
    expect(tribalHall).toBeTruthy();
    expect(tribalHall.level).toBe(1);
  });

  test('Should upgrade building', async () => {
    // Даем ресурсы для апгрейда
    await Village.updateOne(
      { _id: villageId },
      { wood: 1000, clay: 1000, iron: 1000, food: 1000 }
    );
    
    const result = await gameLogic.upgradeBuilding(userId, villageId, 'farm');
    expect(result.success).toBe(true);
    expect(result.finishTime).toBeTruthy();
  });

  test('Should not upgrade without resources', async () => {
    // Убираем ресурсы
    await Village.updateOne(
      { _id: villageId },
      { wood: 0, clay: 0, iron: 0, food: 0 }
    );
    
    await expect(
      gameLogic.upgradeBuilding(userId, villageId, 'warehouse')
    ).rejects.toThrow('Недостаточно ресурсов');
  });

  test('Should train troops', async () => {
    // Даем ресурсы и улучшаем казармы и ферму
    await Village.updateOne(
      { _id: villageId },
      { wood: 1000, clay: 1000, iron: 1000, food: 1000 }
    );
    await Building.updateOne(
      { village_id: villageId, building_type: 'barracks' },
      { level: 1 }
    );
    await Building.updateOne(
      { village_id: villageId, building_type: 'farm' },
      { level: 1 }
    );
    const result = await gameLogic.trainTroops(userId, villageId, 'spearman', 5);
    expect(result.success).toBe(true);
    expect(result.finishTime).toBeTruthy();
  });
});

describe('Performance', () => {
  test('API response time should be under 200ms', async () => {
    const start = Date.now();
    const res = await request(app).get('/api/test');
    const duration = Date.now() - start;
    
    expect(res.status).toBe(200);
    expect(duration).toBeLessThan(200);
  });

  test('Resource update should handle multiple villages', async () => {
    // Создаем несколько деревень
    const villages = [];
    for (let i = 0; i < 10; i++) {
      const user = await User.create({
        username: `perftest${i}`,
        password: await require('bcryptjs').hash('password', 10)
      });
      const villageId = await gameLogic.createVillage(user._id, `Test Village ${i}`);
      villages.push(villageId);
    }
    
    const start = Date.now();
    await gameLogic.updateAllVillagesResources();
    const duration = Date.now() - start;
    
    expect(duration).toBeLessThan(1000);
  });
});

describe('Security', () => {
  test('Should not allow SQL injection in login', async () => {
    const res = await request(app)
      .post('/api/users/login')
      .send({ username: "admin' OR '1'='1", password: 'pass' });
    
    expect(res.status).toBe(400);
  });

  test('Should validate ObjectId format', async () => {
    await expect(
      gameLogic.getBuildings('invalid-id')
    ).rejects.toThrow('Некорректный villageId');
  });
});

describe('Integration Tests', () => {
  test('Full game flow', async () => {
    // Регистрируем пользователя
    const registerRes = await request(app)
      .post('/api/users/register')
      .send({ username: 'integration', password: 'password123' });
    
    expect(registerRes.status).toBe(200);
    
    // Логинимся
    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ username: 'integration', password: 'password123' });
    
    expect(loginRes.status).toBe(200);
    
    // Проверяем, что пользователь создался
    const user = await User.findOne({ username: 'integration' });
    expect(user).toBeTruthy();
    
    // Создаем деревню
    const villageId = await gameLogic.createVillage(user._id, 'Integration Village');
    expect(villageId).toBeTruthy();
    
    // Проверяем здания
    const buildings = await gameLogic.getBuildings(villageId);
    expect(buildings.length).toBeGreaterThan(0);
    
    // Проверяем войска
    const troops = await gameLogic.getTroops(villageId);
    expect(Array.isArray(troops)).toBe(true);
  });
});
