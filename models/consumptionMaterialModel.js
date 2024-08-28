// userModel.js
var mongoose = require("mongoose");
// Setup schema
var consumptionMaterialSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  area: {
    type: String,
    default: "showcase",
  },
  material: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "StorageMaterial",
  },
  quantity: {
    type: Number,
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var ConsumptionMaterial = (module.exports = mongoose.model(
  "consumptionMaterial",
  consumptionMaterialSchema
));
module.exports.get = function (callback, limit) {
  ConsumptionMaterial.find(callback).limit(limit);
};
