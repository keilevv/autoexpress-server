// userModel.js
var mongoose = require("mongoose");
// Setup schema
var storageMaterialSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  reference: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var StorageMaterial = (module.exports = mongoose.model(
  "storageMaterial",
  storageMaterialSchema
));
module.exports.get = function (callback, limit) {
  StorageMaterial.find(callback).limit(limit);
};
