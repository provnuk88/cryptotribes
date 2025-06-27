const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../server/server');
const User = require('../models/User');
const Village = require('../models/Village');

const TEST_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/cryptotribes_test';

beforeAll(async () => {
  await mongoose.connect(TEST_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Village.deleteMany({})
  ]);
});

test('Register user creates village with defaults', async () => {
  const res = await request(app).post('/api/register').send({ username: 'player', password: 'pass123' });
  expect(res.status).toBe(200);
  const user = await User.findOne({ username: 'player' });
  expect(user).toBeTruthy();
  expect(user.crystals).toBe(250);
  const village = await Village.findOne({ user: user._id });
  expect(village.wood).toBe(1000);
  expect(village.clay).toBe(1000);
});

test('Login returns csrf token', async () => {
  await request(app).post('/api/register').send({ username: 'player2', password: 'pass123' });
  const res = await request(app).post('/api/login').send({ username: 'player2', password: 'pass123' });
  expect(res.status).toBe(200);
  expect(res.body.csrfToken).toBeDefined();
});

test('Upgrade building works', async () => {
  await request(app).post('/api/register').send({ username: 'builder', password: 'pass123' });
  const login = await request(app).post('/api/login').send({ username: 'builder', password: 'pass123' });
  const cookie = login.headers['set-cookie'];
  const villageRes = await request(app).get('/api/village').set('Cookie', cookie);
  const villageId = villageRes.body._id || villageRes.body.id;
  const res = await request(app).post('/api/build').set('Cookie', cookie).send({ villageId, buildingType: 'farm' });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});
