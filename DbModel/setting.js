//const mongoose = require("mongoose");
const { Schema, SchemaTypes, model } = require("mongoose");

const settingSchema = new Schema({
  platform: {
    type: SchemaTypes.ObjectId,
    required: true
  },
   
  URL: {
    SITE_URL: {
      type: String,
      required: true
    },
    ADMIN_URL: {
      type: String,
      required: true
    },
    POST_URL: {
      type: String,
      required: true
    },
    UPLOAD_URL: 
      {
        type: String,
        required: true
      }
    ,
    EXPLORER_URL: {
      type: String,
      required: true
    },
    API_URL: {
      type: String,
      required: true
    },
    MSG_URL: {
      type: String,
      required: true
    },
    DISCOUNT_URL: {
      type: String,
      required: true
    },
    SUBSCRIPTION_URL: {
      type: String,
      required: true
    },
    PROFILE_URL: {
      type: String,
      required: true
    }
  },

  BROWSER: {
    VIEW_OPTION: {
      headless: {
        type: Boolean,
        required: true
      }
    },
    CONTEXT_OPTION: {
      viewport: {
        width: {
          type: Number,
          required: true
        },
        height: {
          type: Number,
          required: true
        }
      }
    },
    VIEW_IMAGE: {
      type: Boolean,
      required: true
    }
  },
});

const Setting = model('setting', settingSchema);
module.exports = Setting;