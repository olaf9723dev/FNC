const { Schema, model } = require("mongoose");

const plarformSchema = new Schema({
  name:  {
    type: String,
    required: true,
  },
  alias:  {
    type: String,
    required: true,
  },
  proxy:  {
    type: Boolean,
    required: true
  },
  captcha: {
    type: Boolean,
    required: false,
  },
  bypass:{
    type: Object
  }
});

const Platform = model('platform', plarformSchema);
module.exports = Platform;