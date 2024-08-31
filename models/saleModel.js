var mongoose = require("mongoose");

// Define the Sale Schema
var saleSchema = new mongoose.Schema({
  created_date: {
    type: Date,
    default: Date.now,
  },
  materials: [
    {
      material: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "consumptionMaterial",
        required: true,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
    },
  ],
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  totalPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  customer_name: {
    type: String,
    required: false,
  },
  archived: {
    type: Boolean,
    default: false,
  },
});

// Middleware to calculate the total price before saving the sale
saleSchema.pre("save", async function (next) {
  try {
    const sale = this;

    // Fetch material details to calculate total price
    let total = 0;
    for (const item of sale.materials) {
      // Assuming `material.price` is the price per unit of the consumption material
      total += item.price * item.quantity;
    }

    // Assign the calculated total to totalPrice field
    sale.totalPrice = total;

    next();
  } catch (err) {
    next(err);
  }
});

// Export the Sale model
module.exports = mongoose.model("Sale", saleSchema);
