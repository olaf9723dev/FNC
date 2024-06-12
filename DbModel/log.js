const { Schema, SchemaTypes, model } = require("mongoose");

const scheduleSchema = new Schema({
  model: {
    type: SchemaTypes.ObjectId,
    ref: 'model',
    required: true
  },
  message: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    required: true,
  }
});

const Log = model('log', scheduleSchema);
module.exports = Log;