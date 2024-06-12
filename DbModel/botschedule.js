const { Schema, SchemaTypes, model } = require("mongoose");

const scheduleSchema = new Schema({
  model: {
    type: SchemaTypes.ObjectId,
    ref: 'model',
    required: true
  },
  type: {
    type: String,
    required: true,
  },
  param: {
    type: Object,
  },
  working: {
    type: Boolean,
    default: false,
    required: true
  },
  result: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: () => Date.now(),
    required: true
  },
});

const BotSchedule = model('schedule', scheduleSchema);
module.exports = BotSchedule;