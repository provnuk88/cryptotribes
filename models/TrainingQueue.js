const mongoose = require('mongoose');
const { Schema } = mongoose;

const trainingQueueSchema = new Schema({
  village: { type: Schema.Types.ObjectId, ref: 'Village', required: true, index: true },
  troop_type: { type: String, required: true },
  amount: { type: Number, required: true },
  finish_time: { type: Date, required: true }
});

trainingQueueSchema.index({ finish_time: 1 });

module.exports = mongoose.model('TrainingQueue', trainingQueueSchema);
