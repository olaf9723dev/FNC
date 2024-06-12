const { Schema, model } = require("mongoose");

const wordSchema = new Schema({
  type:  {
    type: String,
    required: true
  },
  word: {
    type: String,
    required: true,
  },
});

const Wordlist = model('wordlist', wordSchema);
module.exports = Wordlist;