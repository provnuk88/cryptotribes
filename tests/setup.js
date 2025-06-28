// Jest setup file
const mongoose = require('mongoose');

// Suppress deprecation warnings
mongoose.set('strictQuery', false);

// Global teardown
afterAll(async () => {
  // Ensure all connections are closed
  try {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
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