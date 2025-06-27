const mongoose = require('mongoose');
const { Schema } = mongoose;

const paymentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  transactionId: { type: String, unique: true, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  crystals: { type: Number, required: true },
  status: { type: String, default: 'pending', index: true },
  paymentMethod: { type: String, required: true },
  packageId: String,
  paymentAddress: String,
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

module.exports = mongoose.model('Payment', paymentSchema);
