const { Schema, model } = require("mongoose");

const dicordSchema = new Schema({
  name:  {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
  },
});

const Discord = model('discord', dicordSchema);
module.exports = Discord;