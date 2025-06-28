const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
    code: { type: String, unique: true, required: true },
    crystals: { type: Number, required: true },
    description: { type: String },
    uses_left: { type: Number, default: null },
    expires_at: { type: Date, default: null },
    active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PromoCode', promoCodeSchema);
