const mongoose = require('mongoose');

const promoUseSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    promo_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', required: true, index: true },
    used_at: { type: Date, default: Date.now }
});

promoUseSchema.index({ user_id: 1, promo_id: 1 }, { unique: true });

module.exports = mongoose.model('PromoUse', promoUseSchema);
