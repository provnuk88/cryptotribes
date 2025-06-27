const mongoose = require('mongoose');

const troopSchema = new mongoose.Schema({
    village_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Village', required: true, index: true },
    troop_type: { type: String, required: true },
    amount: { type: Number, default: 0 }
});

troopSchema.index({ village_id: 1, troop_type: 1 }, { unique: true });

module.exports = mongoose.model('Troop', troopSchema);
