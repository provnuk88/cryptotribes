const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    transaction_id: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true },
    crystals: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    payment_method: { type: String, required: true },
    package_id: { type: String },
    payment_address: { type: String },
    created_at: { type: Date, default: Date.now },
    completed_at: { type: Date }
});

module.exports = mongoose.model('Payment', paymentSchema);
