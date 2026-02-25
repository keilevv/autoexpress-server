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
    enum: ["kg", "litro", "unit", "galon"],
  },
  // this is the weight of the material of 1kg or 1 liter or 1 unit or 1 galon
  normalized_weight: {
    type: Number,
  },
  quantity: {
    type: Number,
    required: true,
  },
  caution_quantity: {
    type: Number,
  },
  price: {
    type: Number,
  },
  owner: {
    type: String,
    default: "autoexpress",
    required: true,
  },
  is_color: {
    type: Boolean,
    default: false,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var StorageMaterial = (module.exports = mongoose.model(
  "StorageMaterial",
  storageMaterialSchema,
));
module.exports.get = function (callback, limit) {
  StorageMaterial.find(callback).limit(limit);
};
