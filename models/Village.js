const mongoose = require('mongoose');

const villageSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    wood: { type: Number, default: 1000 },
    clay: { type: Number, default: 1000 },
    iron: { type: Number, default: 1000 },
    food: { type: Number, default: 1000 },
    last_update: { type: Date, default: Date.now },
    points: { type: Number, default: 0 }
});

villageSchema.index({ x: 1, y: 1 }, { unique: true });

module.exports = mongoose.model('Village', villageSchema);
