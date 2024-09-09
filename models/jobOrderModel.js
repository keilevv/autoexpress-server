var mongoose = require("mongoose");
// Setup schema
var jobOrderSchema = mongoose.Schema({
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
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "consumptionMaterial",
      },
      quantity: {
        type: Number,
        min: 0,
      },
    },
  ],
  created_date: {
    type: Date,
    default: Date.now,
  },
});

// Export Info model
var JobOrder = (module.exports = mongoose.model("jobOrder", jobOrderSchema));
module.exports.get = function (callback, limit) {
  JobOrder.find(callback).limit(limit);
};
