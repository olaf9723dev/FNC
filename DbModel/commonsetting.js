const { Schema, SchemaTypes, model } = require("mongoose");

const settingSchema = new Schema({
  platform: {
    type: SchemaTypes.ObjectId,
    required: true
  },
  POST :{
    MAXIMUM : {
      type: Number,
      required: false,
    },
  },
  STORY :{
  
  },
  UPLOAD :{
    FOLDER: {
      type: String,
      required: true,
    }
  },
  COMMENT : {
    MAX_PAGE_FOR_COMMENTING: {
      type: Number,
      required: true,
    },
    MAX_COMMENTS_PER_POST: {
      type: Number,
      required: true,
    },
    ENABLE_FOLLOW_TEAM: {
      type: Boolean,
      required: true,
    },
    ENABLE_COMMENT_TEAM: {
      type: Boolean,
      required: true,
    },
    ENABLE_COMMENT_WHITEIST: {
      type: Boolean,
      required: true,
    },
    ENABLE_COMMENT_BLACKLIST: {
      type: Boolean,
      required: true,
    }
  },
  REPORT : {
    CHECK : {
      LINK: {
        type: Boolean,
        required: false,
      },
      PHONE: {
        type: Boolean,
        required: false,
      },
      KEYWORD: {
        type: Boolean,
        required: false,
      },
    },
    DISCORD: {
      type: SchemaTypes.ObjectId,
      ref: 'discord'
    },
    DISCORD_IMPORTANT: {
      type: SchemaTypes.ObjectId,
      ref: 'discord'
    }
  }
});

const CommonSetting = model('commonsetting', settingSchema);
module.exports = CommonSetting;