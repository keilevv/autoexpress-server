// userModel.js
var mongoose = require("mongoose");
// Setup schema
var userSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  username: {
    type: String,
    required: true,
  },
  name: {
    type: String,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  roles: {
    type: String,
    required: true,
    default: "user",
  },
  signature: {
    type: String,
  },
  birthday: {
    type: Date,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var User = (module.exports = mongoose.model("user", userSchema));
module.exports.get = function (callback, limit) {
  User.find(callback).limit(limit);
};
