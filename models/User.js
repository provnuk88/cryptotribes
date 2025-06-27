const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
    crystals: { type: Number, default: 250 },
    tribe_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Tribe', default: null },
    created_at: { type: Date, default: Date.now },
    last_login: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
