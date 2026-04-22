const mongoose = require("mongoose");

const dischargeSchema = new mongoose.Schema({
  services: [
    {
      service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
        required: true,
      },
      small_car: { type: Number, default: 0 },
      large_car: { type: Number, default: 0 },
      small_truck: { type: Number, default: 0 },
      large_truck: { type: Number, default: 0 },
    }
  ],
  materials_recipe: [
    {
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StorageMaterial",
        required: true,
      },
      consumed_grams: { type: Number, required: true },
      quantity_subtracted: { type: Number, required: true },
    }
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  created_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Discharge", dischargeSchema);
