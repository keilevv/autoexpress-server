// userModel.js
var mongoose = require("mongoose");
// Setup schema
var appointmentSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the User model
    required: true,
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Client", // Reference to the User model
    required: true,
  },
  car: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Car", // Reference to the User model
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var Appointment = (module.exports = mongoose.model(
  "appointment",
  appointmentSchema
));
module.exports.get = function (callback, limit) {
  Appointment.find(callback).limit(limit);
};
