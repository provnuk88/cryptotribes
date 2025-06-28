const mongoose = require('mongoose');
const { logger } = require('../logger');

// Устанавливаем strictQuery в false для устранения deprecation warning
mongoose.set('strictQuery', false);

let isConnected = false;
let connectionPromise = null;

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes';

// Функция для подключения к MongoDB
async function connectToMongoDB() {
    if (isConnected) {
        return mongoose.connection;
    }
    
    if (connectionPromise) {
        return connectionPromise;
    }
    
    connectionPromise = mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    
    try {
        await connectionPromise;
        isConnected = true;
        console.log('MongoDB connected successfully');
        return mongoose.connection;
    } catch (error) {
        connectionPromise = null;
        console.error('MongoDB connection failed:', error);
        throw error;
    }
}

// Функция для отключения от MongoDB
async function disconnectFromMongoDB() {
    if (!isConnected) {
        return;
    }
    
    try {
        await mongoose.disconnect();
        isConnected = false;
        connectionPromise = null;
        console.log('MongoDB disconnected');
    } catch (error) {
        console.error('MongoDB disconnection error:', error);
        throw error;
    }
}

// Функция для получения статуса подключения
function getConnectionStatus() {
    return {
        isConnected,
        readyState: mongoose.connection.readyState
    };
}

// Обработчики событий подключения
mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
    isConnected = true;
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
    isConnected = false;
    connectionPromise = null;
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
    isConnected = false;
    connectionPromise = null;
});

module.exports = {
    connectToMongoDB,
    disconnectFromMongoDB,
    getConnectionStatus,
    connection: mongoose.connection
}; 