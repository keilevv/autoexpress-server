// carModel.js
const dayjs = require("dayjs");
var mongoose = require("mongoose");
// Setup schema
var messageSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
  },
  telephone_number: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    default: dayjs().format("YYYY-MM-DD HH:mm:ss"),
  },
});

// Export Car model
var Message = (module.exports = mongoose.model("message", messageSchema));
module.exports.get = function (callback, limit) {
  Message.find(callback).limit(limit);
};
