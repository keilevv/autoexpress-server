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
  description: {
    type: String,
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
  car_brand: {
    type: String,
  },
  car_model: {
    type: String,
  },
  status: [
    {
      type: String,
    },
  ],
  consumed_materials: [
    {
      storage_material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "storageMaterial", // Reference to storageMaterial
        required: true,
      },
      quantity: {
        type: Number,
        required: true, // Quantity of the consumed material
      },
      price: {
        type: Number,
      },
      sell_price: {
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
  owner: {
    type: String,
    default: "autocheck",
    required: true,
  },
  sell_price: {
    type: Number,
    min: 0,
  },
  material_cost: {
    type: Number,
    min: 0,
  },
  material_profit: {
    type: Number,
    min: 0,
  },
  profit: {
    type: Number,
    min: 0,
  },
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
