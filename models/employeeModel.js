// userModel.js
var mongoose = require("mongoose");
// Setup schema
var employeeSchema = mongoose.Schema({
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
var Employee = (module.exports = mongoose.model("employee", employeeSchema));
module.exports.get = function (callback, limit) {
  Employee.find(callback).limit(limit);
};
