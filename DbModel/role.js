const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const roleSchema = new Schema({
  name:  {
    type: String,
    required: true
  },
  duty: {
    type: Number,
    required: true,
  },
});

const Role = model('role', roleSchema);
module.exports = Role;