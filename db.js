const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/cryptotribes';

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

module.exports = mongoose.connection;
