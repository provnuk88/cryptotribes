jest.mock('stripe');
const request = require('supertest');
const mongoose = require('mongoose');

const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptotribes_test';
process.env.MONGODB_URI = TEST_URI;

const app = require('../server/server');
const Village = require('../models/Village');
const Building = require('../models/Building');
const Troop = require('../models/Troop');
const gameLogic = require('../server/gameLogic');

const testUser = { username: 'testuser', password: 'testpass123' };
const testUser2 = { username: 'testuser2', password: 'testpass456' };

beforeAll(async () => {
  const uri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptotribes_test';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await mongoose.connection.db.dropDatabase();
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();

  if (typeof app?.close === 'function') {
    await new Promise((resolve) => app.close(resolve));
  }
});

// Authentication tests
describe('Authentication', () => {
  test('Should register a new user', async () => {
    const res = await request(app).post('/api/register').send(testUser);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.username).toBe(testUser.username);
  });

  test('Should not register duplicate user', async () => {
    const res = await request(app).post('/api/register').send(testUser);
    expect(res.status).toBe(400);
  });

  test('Should login with correct credentials', async () => {
    const res = await request(app).post('/api/login').send(testUser);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Should reject login with wrong password', async () => {
    const res = await request(app).post('/api/login').send({ username: testUser.username, password: 'wrong' });
    expect(res.status).toBe(400);
  });
});

describe('Game Logic', () => {
  let authCookie;
  let villageId;

  beforeAll(async () => {
    await request(app).post('/api/register').send(testUser2);
    const loginRes = await request(app).post('/api/login').send(testUser2);
    authCookie = loginRes.headers['set-cookie'];
  });

  test('Should create village with initial resources', async () => {
    const res = await request(app).get('/api/village').set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.wood).toBe(1000);
    expect(res.body.clay).toBe(1000);
    expect(res.body.iron).toBe(1000);
    expect(res.body.food).toBe(1000);
    villageId = res.body.id;
  });

  test('Should get buildings list', async () => {
    const res = await request(app).get(`/api/buildings/${villageId}`).set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    const tribalHall = res.body.find(b => b.building_type === 'tribal_hall');
    expect(tribalHall.level).toBe(1);
  });

  test('Should upgrade building', async () => {
    const res = await request(app).post('/api/build').set('Cookie', authCookie).send({ villageId, buildingType: 'farm' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('Should not upgrade without resources', async () => {
    await Village.updateOne({ _id: villageId }, { wood: 0, clay: 0, iron: 0 });
    const res = await request(app).post('/api/build').set('Cookie', authCookie).send({ villageId, buildingType: 'warehouse' });
    expect(res.status).toBe(400);
  });

  test('Should train troops', async () => {
    await Village.updateOne({ _id: villageId }, { wood: 1000, clay: 1000, iron: 1000, food: 1000 });
    await Building.updateOne({ village_id: villageId, building_type: 'barracks' }, { level: 1 });
    const res = await request(app).post('/api/train').set('Cookie', authCookie).send({ villageId, troopType: 'spearman', amount: 5 });
    expect(res.status).toBe(200);
  });
});

describe('Performance', () => {
  test('API response time should be under 200ms', async () => {
    const start = Date.now();
    await request(app).get('/api/map');
    expect(Date.now() - start).toBeLessThan(200);
  });

  test('Resource update should handle 100 villages', async () => {
    const villages = [];
    for (let i = 0; i < 100; i++) {
      villages.push({ user_id: mongoose.Types.ObjectId(), name: `Test ${i}`, x: i % 20, y: Math.floor(i / 20) });
    }
    await Village.insertMany(villages);
    const start = Date.now();
    await gameLogic.updateAllVillagesResources();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});

describe('Security', () => {
  test('Should not allow SQL injection in login', async () => {
    const res = await request(app).post('/api/login').send({ username: "admin' OR '1'='1", password: 'pass' });
    expect(res.status).toBe(400);
  });

  test('Should require authentication for protected routes', async () => {
    const res = await request(app).get('/api/village');
    expect(res.status).toBe(401);
  });
});

describe('Integration Tests', () => {
  test('Full game flow', async () => {
    const p1 = { username: 'warrior1', password: 'pass123' };
    const p2 = { username: 'warrior2', password: 'pass123' };
    await request(app).post('/api/register').send(p1);
    await request(app).post('/api/register').send(p2);
    const login = await request(app).post('/api/login').send(p1);
    const cookie = login.headers['set-cookie'];
    const vRes = await request(app).get('/api/village').set('Cookie', cookie);
    const vId = vRes.body.id;
    await Building.updateOne({ village_id: vId, building_type: 'barracks' }, { level: 1 });
    await request(app).post('/api/train').set('Cookie', cookie).send({ villageId: vId, troopType: 'spearman', amount: 10 });
    await Troop.updateOne({ village_id: vId, troop_type: 'spearman' }, { amount: 10 });
    const map = await request(app).get('/api/map').set('Cookie', cookie);
    const target = map.body.find(v => v.owner === 'warrior2');
    if (target) {
      const attack = await request(app).post('/api/attack').set('Cookie', cookie).send({ fromVillageId: vId, toVillageId: target.id, troops: { spearman: 5 } });
      expect(attack.status).toBe(200);
      expect(attack.body.success).toBe(true);
    }
  });
});
