const mongoose = require('mongoose');
const { Schema } = mongoose;

const buildingSchema = new Schema({
  village: { type: Schema.Types.ObjectId, ref: 'Village', required: true, index: true },
  building_type: { type: String, required: true },
  level: { type: Number, default: 0 },
  is_upgrading: { type: Boolean, default: false },
  upgrade_finish_time: { type: Date, default: null }
});

buildingSchema.index({ village: 1, building_type: 1 }, { unique: true });

module.exports = mongoose.model('Building', buildingSchema);
