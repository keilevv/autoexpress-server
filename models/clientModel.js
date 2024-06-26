// clientModel.js
var mongoose = require("mongoose");
// Setup schema
var clientSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
  },
  surname: {
    type: String,
    required: true,
  },
  lastname: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  telephone_number: {
    type: String,
    required: true,
  },
  birthday: {
    type: String,
  },
  country_id: {
    type: String,
    required: true,
  },

  cars: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Car",
    },
  ],
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Car model
var Client = (module.exports = mongoose.model("client", clientSchema));
module.exports.get = function (callback, limit) {
  Client.find(callback).limit(limit);
};
