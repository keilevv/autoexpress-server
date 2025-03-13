// userModel.js
var mongoose = require("mongoose");
// Setup schema
var storageMaterialSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  name: {
    type: String,
    required: true,
  },
  reference: {
    type: String,
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
  caution_quantity: {
    type: Number,
    default: 10,
  },
  price: {
    type: Number,
  },
  margin: {
    type: Number,
    min: 0,
    default: 10,
  },
  owner: {
    type: String,
    default: "autocheck",
    required: true,
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
