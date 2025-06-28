// Jest setup file
const mongoose = require('mongoose');
const { connectToMongoDB, disconnectFromMongoDB } = require('../server/utils/dbConnection');

// Suppress deprecation warnings
mongoose.set('strictQuery', false);

// Global setup - подключаемся к тестовой базе
beforeAll(async () => {
  try {
    // Устанавливаем тестовую базу данных
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes_test';
    process.env.NODE_ENV = 'test';
    
    await connectToMongoDB();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
  }
});

// Global teardown
afterAll(async () => {
  try {
    await disconnectFromMongoDB();
  } catch (error) {
    console.error('Error during global teardown:', error);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
}); 