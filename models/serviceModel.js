const mongoose = require("mongoose");

const serviceSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  owner: {
    type: String,
    enum: ["autoexpress", "autodetailing", "both"],
    default: "both",
    required: true,
  },
  small_car_price: {
    type: Number,
    default: 0,
  },
  large_car_price: {
    type: Number,
    default: 0,
  },
  small_truck_price: {
    type: Number,
    default: 0,
  },
  large_truck_price: {
    type: Number,
    default: 0,
  },
  materials: [
    {
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StorageMaterial",
      },
      small_car_grams: {
        type: Number,
        default: 0,
      },
      large_car_grams: {
        type: Number,
        default: 0,
      },
      small_truck_grams: {
        type: Number,
        default: 0,
      },
      large_truck_grams: {
        type: Number,
        default: 0,
      },
    },
  ],
  created_date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Service", serviceSchema);
