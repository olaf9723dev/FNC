const { Schema, SchemaTypes, model } = require("mongoose");

const scheduleSchema = new Schema({
  model: {
    type: SchemaTypes.ObjectId,
    ref: 'model',
    required: true
  },
  type: {
    type: String,
    required: true,
  },
  data: {
    type: Object,
    required: true,
  },  
});

const ScheduleData = model('scheduledata', scheduleSchema);
module.exports = ScheduleData;