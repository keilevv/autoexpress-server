// userModel.js
var mongoose = require("mongoose");
// Setup schema
var workerSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
  },
  roles: {
    type: String,
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var Worker = (module.exports = mongoose.model("worker", workerSchema));
module.exports.get = function (callback, limit) {
  Worker.find(callback).limit(limit);
};
