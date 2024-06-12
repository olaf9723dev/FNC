const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const proxySchema = new Schema({
  url:  {
    type: String,
    required: true,
  },
  type: {
    type: String,
    required: true,
  }
});

const Proxy = model('proxy', proxySchema);
module.exports =  Proxy;