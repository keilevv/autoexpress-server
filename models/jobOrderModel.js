var mongoose = require("mongoose");

// Setup job order schema
var jobOrderSchema = mongoose.Schema({
  archived: {
    type: Boolean,
    default: false,
  },
  number: {
    type: String,
    required: true,
  },
  due_date: {
    type: Date,
  },
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
  },
  car_plate: {
    type: String,
    required: true,
  },
  status: [
    {
      type: String,
    },
  ],
  consumed_materials: [
    {
      consumption_material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "consumptionMaterial", // Reference to consumptionMaterial
        required: true,
      },
      quantity: {
        type: Number,
        required: true, // Quantity of the consumed material
      },
      price: {
        type: Number,
      },
    },
  ],
  consumed_colors: [
    {
      name: { type: String, required: true },
      quantity: { type: Number, required: true },
      price: { type: Number },
    },
  ],
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export JobOrder model
var JobOrder = (module.exports = mongoose.model("jobOrder", jobOrderSchema));
module.exports.get = function (callback, limit) {
  JobOrder.find(callback).limit(limit);
};
