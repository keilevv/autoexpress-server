const Sale = require("../models/saleModel.js");
const ConsumptionMaterial = require("../models/consumptionMaterialModel");
const mongoose = require("mongoose");

exports.register = async function (req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { materials, customer_name, user } = req.body;

    const newSale = new Sale({
      materials,
      customer_name,
      user,
    });

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

      if (updatedMaterial.quantity < 0) {
        throw new Error(
          `Insufficient quantity for material with ID ${material}`
        );
      }
    }

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
  const { page = 1, limit = 10, customer_name, sortBy, sortOrder } = req.query;

  let query = {};

  // Apply sorting options if provided
  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["date"] = -1; // Default sort by date descending
  }

  try {
    const totalSales = await Sale.countDocuments(query);

    // Use aggregation to perform lookups and match the query
    const sales = await Sale.aggregate([
      { $match: query }, // Match based on the query object

      {
        $unwind: "$materials", // Unwind the materials array for easier lookup
      },
      {
        $lookup: {
          from: "consumptionmaterials", // Collection name for ConsumptionMaterial
          localField: "materials.material",
          foreignField: "_id",
          as: "materials.materialDetails",
        },
      },
      {
        $unwind: "$materials.materialDetails", // Unwind the materialDetails array
      },
      {
        $lookup: {
          from: "users", // Collection name for ConsumptionMaterial
          localField: "user",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user", // Unwind the materialDetails array
      },

      // Lookup to fetch StorageMaterial details
      {
        $lookup: {
          from: "storagematerials", // Collection name for StorageMaterial
          localField: "materials.materialDetails.material",
          foreignField: "_id",
          as: "materials.materialDetails.storageMaterialDetails",
        },
      },
      {
        $unwind: "$materials.materialDetails.storageMaterialDetails", // Unwind storageMaterialDetails
      },
      {
        $match: customer_name
          ? { customer_name: { $regex: customer_name, $options: "i" } }
          : {},
      },
      // Group back by the sale id to reconstruct the sales with all material details
      {
        $group: {
          _id: "$_id",
          user: { $first: "$user" },
          customer_name: { $first: "$customer_name" },
          total_price: { $first: "$total_price" },
          archived: { $first: "$archived" },
          created_date: { $first: "$created_date" },
          materials: {
            $push: {
              consumption_material_id: "$materials.material",
              storage_material:
                "$materials.materialDetails.storageMaterialDetails",
              quantity: "$materials.quantity",
              price: "$materials.price",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          "user.email": 1,
          "user.roles": 1,
          "user._id": 1,
          "user.username": 1,
          customer_name: 1,
          total_price: 1,
          archived: 1,
          created_date: 1,
          materials: 1,
        },
      },

      // Sort, Skip, and Limit
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
    ]);

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const saleId = req.params.id;
    const { materials, customerName } = req.body;

    // Find the existing sale to get the original material quantities
    const existingSale = await Sale.findById(saleId).session(session);

    if (!existingSale) {
      return res.status(404).json({
        status: "error",
        message: "Sale not found",
      });
    }

    // Create a map of original materials
    const originalMaterialMap = new Map();
    for (const item of existingSale.materials) {
      originalMaterialMap.set(item.material.toString(), item.quantity);
    }

    // Update the consumption materials based on the difference
    for (const item of materials) {
      const { material, quantity } = item;
      const originalQuantity =
        originalMaterialMap.get(material.toString()) || 0;
      const quantityDifference = quantity - originalQuantity;

      // Update the quantity of the corresponding consumption material
      const updatedMaterial = await ConsumptionMaterial.findByIdAndUpdate(
        material,
        { $inc: { quantity: -quantityDifference } },
        { new: true, session }
      );

      if (!updatedMaterial) {
        throw new Error(`Material with ID ${material} not found`);
      }

      if (updatedMaterial.quantity < 0) {
        throw new Error(
          `Insufficient quantity for material with ID ${material}`
        );
      }

      // Remove material from the map to keep track of processed items
      originalMaterialMap.delete(material.toString());
    }

    // For remaining original materials not in the updated list, revert the quantities
    for (const [
      materialId,
      originalQuantity,
    ] of originalMaterialMap.entries()) {
      await ConsumptionMaterial.findByIdAndUpdate(
        materialId,
        { $inc: { quantity: originalQuantity } },
        { new: true, session }
      );
    }

    // Update the sale with new materials and customer name
    const updatedSale = await Sale.findByIdAndUpdate(
      saleId,
      { materials, customerName },
      { new: true, session }
    );

    // Commit the transaction if everything is successful
    await session.commitTransaction();
    session.endSession();

    return res.json({
      status: "success",
      message: "Sale updated successfully and material quantities adjusted",
      data: updatedSale,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    return res.status(500).json({
      status: "error",
      message: "Error updating sale and adjusting material quantities",
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
