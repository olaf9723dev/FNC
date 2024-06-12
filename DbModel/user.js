const { Schema,SchemaTypes, model } = require("mongoose");
const userSchema = new Schema({
  name: {
    type: String,
    required: true,
  },

  email: {
    type: String,
    minLength: 10,
    required: true,
    lowercase: true
  },
  
  password: {
    type: String,
    minLength: 8,
    required: true,
  },
  
  role: {
    type: SchemaTypes.ObjectId,
    ref: 'role',
    required: true,
  },

  affectModel: [{
    platform: {
      type: SchemaTypes.ObjectId,
      ref: 'platform',
      required: true
    },
    model: [{
      type: SchemaTypes.ObjectId,
      ref: 'model'
    }],
  }
  ],
});

const User = model('user', userSchema);
module.exports = User;