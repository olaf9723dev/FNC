const { Schema,SchemaTypes, model } = require("mongoose");

const wordSchema = new Schema({
  platform: {
    type: SchemaTypes.ObjectId,
    ref: 'platform',
    required: true,
  },
  user: {
    type: String,
    required: true,
  },
});

const Blacklist = model('blacklist', wordSchema);
module.exports = Blacklist;