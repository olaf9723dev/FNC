const { Schema, SchemaTypes, model } = require("mongoose");

const stateSchema = new Schema({
  model: {
    type: SchemaTypes.ObjectId,
    ref: 'model',
    required: true
  },
  status: {
    type: String,
    required: true,
  },
  param: {
    type: Object,
  },
});

const BotStatus = model('state', stateSchema);
module.exports = BotStatus;