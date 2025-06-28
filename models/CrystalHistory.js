const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true },
    description: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CrystalHistory', historySchema);
