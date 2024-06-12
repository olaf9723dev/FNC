const mongoose = require("mongoose");
const { Schema, SchemaTypes, model } = mongoose;

const modelSchema = new Schema({
  platform: {
    type: SchemaTypes.ObjectId,
    ref: 'platform',
    required: true,
  },
  UNIQUE: {
    type: String,
    required: true
  },
  ALIAS: {
    type: String,
    required: true
  },
  ACCOUNT: {
    type: String,
    required: true
  },
  PASSWORD: {
    type: String,
    required: true
  },
  DISCORD: {
    type: SchemaTypes.ObjectId,
    ref: 'discord'
  },
  POST: {
    OFFSET: [{
      type: Number,
      required: false
    }
    ],
    INTERVAL: {
      type: Number,
      required: false
    },
    DURATION: {
      type: Number,
      required: false
    },
  },
  COMMENT: {
    INTERVAL: {
      type: Number,
      required: true
    }
  },
  NOTIFICATION: {
    INTERVAL: {
      type: Number,
      required: true
    }
  },
  STORY: {
    INTERVAL: {
      type: Number,
      required: false
    },
    COUNT: {
      type: Number,
      required: false
    },
    REPLACE: {
      type: Number,
      required: false
    },
  },
});

const FModel = model('model', modelSchema);
//export default FModel;
module.exports = FModel;