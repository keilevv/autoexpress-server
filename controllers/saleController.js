const Sale = require("../models/saleModel.js");
const ConsumptionMaterial = require("../models/consumptionMaterialModel");
const mongoose = require("mongoose");

exports.register = async function (req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { materials, customer_name, user } = req.body;

    // Create a new Sale instance
    const newSale = new Sale({
      materials,
      customer_name,
      user,
    });

    // Save the new sale to the database
    const savedSale = await newSale.save({ session });

    for (const item of materials) {
      const { material, quantity } = item;

      // Find the consumption material and update its quantity
      const updatedMaterial = await ConsumptionMaterial.findByIdAndUpdate(
        material,
        { $inc: { quantity: -quantity } }, // Decrease quantity by the sold amount
        { new: true, session } // Return the updated document and use the session
      );

      if (!updatedMaterial) {
        throw new Error(`Material with ID ${material} not found`);
      }

      // Check if the updated quantity is below zero
      if (updatedMaterial.quantity < 0) {
        throw new Error(
          `Insufficient quantity for material with ID ${material}`
        );
      }
    }

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      status: "success",
      message: "Sale created successfully, and material quantities updated",
      data: savedSale,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: "error",
      message: "Error creating sale and updating material quantities",
      description: err.message,
    });
  }
};

// Index Sales with Filtering
exports.index = async function (req, res) {
  const { page = 1, limit = 10, materialName, sortBy, sortOrder } = req.query;

  let query = {};

  // Filter by material name if provided
  if (materialName) {
    query["materials.material"] = {
      $regex: materialName,
      $options: "i",
    };
  }

  // Apply sorting options if provided
  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["date"] = -1; // Default sort by date descending
  }

  try {
    const totalSales = await Sale.countDocuments(query);

    const sales = await Sale.find(query)
      .populate("materials.material", "name price") // Populate material details
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    return res.json({
      status: "success",
      message: "Sales list retrieved successfully",
      count: totalSales,
      results: sales,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Error retrieving sales",
      description: err.message,
    });
  }
};

exports.get = async function (req, res) {
  const saleId = new mongoose.Types.ObjectId(req.params.sale_id);

  // Check if sale ID is valid
  if (!saleId) {
    return res.status(400).send({ message: "Invalid sale ID" });
  }

  try {
    // Aggregation pipeline to find a sale and populate material details
    const sale = await Sale.aggregate([
      {
        $match: {
          _id: saleId,
        },
      },
      {
        $unwind: "$materials", // Unwind the materials array to handle each material separately
      },
      {
        $lookup: {
          from: "consumptionmaterials", // Collection name of consumption materials
          localField: "materials.material", // Field in Sale referencing ConsumptionMaterial
          foreignField: "_id", // Field in ConsumptionMaterial to join with
          as: "materialDetails", // Name of the output field
        },
      },
      {
        $unwind: "$materialDetails", // Unwind material details to flatten structure
      },
      {
        $group: {
          _id: "$_id",
          customer_name: { $first: "$customer_name" },
          materials: {
            $push: {
              material: "$materialDetails",
              quantity: "$materials.quantity",
            },
          },
          totalPrice: { $first: "$totalPrice" },
          createdAt: { $first: "$createdAt" },
          updatedAt: { $first: "$updatedAt" },
        },
      },
    ]);

    if (!sale || sale.length === 0) {
      return res.status(404).send({ message: "Sale not found" });
    }

    return res.json({
      status: "success",
      message: "Sale retrieved successfully",
      results: sale[0], // Aggregation result is an array, return the first item
    });
  } catch (error) {
    return res.status(500).send({
      message: "Internal server error",
      description: error.message,
    });
  }
};

// Update Sale
exports.update = async function (req, res) {
  try {
    const saleId = req.params.id;
    const { materials, customer_name } = req.body;

    // Find the sale by ID and update it
    const updatedSale = await Sale.findByIdAndUpdate(
      saleId,
      {
        materials,
        customer_name,
      },
      { new: true } // Return the updated document
    );

    if (!updatedSale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    return res.json({
      status: "success",
      message: "Sale updated successfully",
      data: updatedSale,
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Error updating sale",
      description: err.message,
    });
  }
};

// Delete Sale
exports.delete = async function (req, res) {
  try {
    const saleId = req.params.id;

    // Find the sale by ID and delete it
    const deletedSale = await Sale.findByIdAndDelete(saleId);

    if (!deletedSale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    return res.json({
      status: "success",
      message: "Sale deleted successfully",
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      message: "Error deleting sale",
      description: err.message,
    });
  }
};
