// jobOrderController.js
// Import Models
JobOrder = require("../models/jobOrderModel");
StorageMaterial = require("../models/storageMaterialModel");
const {
  jobOrderProjection,
  jobOrderProjectionMaterials,
} = require("./aggregations");

const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");

exports.register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let owner = req.body.owner ? req.body.owner : "autoexpresss";
  let description = req.body.description
    ? req.body.description
    : "Sin descripción";

  try {
    const jobOrder = new JobOrder({
      number: req.body.number,
      description: description,
      car_brand: req.body.car_brand,
      car_model: req.body.car_model,
      due_date: req.body.due_date,
      employee: req.body.employee,
      car_plate: req.body.car_plate,
      status: ["pending"],
      owner: owner,
      sell_price: req.body.sell_price,
    });

    // Save the job order first
    const savedJobOrder = await jobOrder.save({ session });

    // Iterate over consumed consumed_materials and update consumptionMaterial quantities
    if (req.body.consumed_materials && req.body.consumed_materials.length > 0) {
      for (const item of req.body.consumed_materials) {
        const { material, quantity } = item;

        const updatedMaterial = await StorageMaterial.findByIdAndUpdate(
          material,
          { $inc: { quantity: -quantity } },
          { new: true, session }
        );

        // Check if quantity goes negative
        if (!updatedMaterial || updatedMaterial.quantity < 0) {
          throw new Error(
            `Stock insuficiente para : ${material.name} (remaining quantity: ${updatedMaterial ? updatedMaterial.quantity : 0
            })`
          );
        }
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message:
        "JobOrder registered successfully with updated material quantities!",
      results: savedJobOrder,
    });
  } catch (err) {
    // Abort the transaction in case of error
    await session.abortTransaction();
    session.endSession();

    return res.status(500).json({
      message: "Failed to register JobOrder or update material quantities",
      description: err.message,
    });
  }
};
// Handle index actions
exports.index = async function (req, res) {
  const {
    page = 1,
    limit = 10,
    sortBy = "created_date",
    sortOrder,
    ...filter
  } = req.query;

  let query = {};
  const filterArray = helpers.getFilterArray(filter);
  if (filter) {
    filterArray.forEach((filterItem) => {
      switch (filterItem.name) {
        case "archived":
          query[filterItem.name] = filterItem.value === "true";
          break;
        case "start_date":
        case "end_date":
          const dateFilter = {};
          if (req.query.start_date) dateFilter["$gte"] = new Date(req.query.start_date);
          if (req.query.end_date) dateFilter["$lte"] = new Date(req.query.end_date);
          query["created_date"] = dateFilter;
          break;
        case "due_start_date":
        case "due_end_date":
          const dueDateFilter = {};
          if (req.query.due_start_date) dueDateFilter["$gte"] = new Date(req.query.due_start_date);
          if (req.query.due_end_date) dueDateFilter["$lte"] = new Date(req.query.due_end_date);
          query["due_date"] = dueDateFilter;
          break;
        case "search":
          if (filterItem.value) {
            query["$or"] = [
              { number: { $regex: filterItem.value, $options: "i" } },
              { car_plate: { $regex: filterItem.value, $options: "i" } },
            ];
          }
          break;
        case "employee":
          if (filterItem.value) {
            query["employee"] = new mongoose.Types.ObjectId(filterItem.value);
          }
          break;
        case "owner":
          if (filterItem.value) {
            query["owner"] = filterItem.value || "autoexpresss";
          }
          break;
        case "status":
          if (filterItem.value) {
            query["status"] = [String(filterItem.value)];
          }
          break;
      }
    });
  }

  if (!query["status"]) {
    query["status"] = { $ne: "completed" };
  }

  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["created_date"] = -1;
  }
  sortOptions["_id"] = 1;

  const totalJobOrders = await JobOrder.countDocuments(query);

  const totalCostResult = await JobOrder.aggregate([
    { $match: query },
    ...jobOrderProjectionMaterials,
    {
      $group: {
        _id: null,
        total_cost: { $sum: "$materials_cost" },
        total_material_profit: { $sum: "$materials_profit" },
        total_sell_price: { $sum: "$sell_price" },
        total_profit: { $sum: "$profit" },
      },
    },
  ]);

  const total_cost = totalCostResult[0]?.total_cost || 0;
  const total_material_profit = totalCostResult[0]?.total_material_profit || 0;
  const total_sell_price = totalCostResult[0]?.total_sell_price || 0;
  const total_profit = totalCostResult[0]?.total_profit || 0;

  const jobOrders = await JobOrder.aggregate([
    { $match: query },
    { $sort: sortOptions },
    { $skip: (page - 1) * limit },
    { $limit: parseInt(limit) },
    ...jobOrderProjectionMaterials,
  ]).catch((err) => {
    return res.status(500).json({ message: "Internal server error", description: err });
  });

  return res.json({
    count: totalJobOrders,
    total_cost,
    total_material_profit,
    total_sell_price,
    total_profit,
    message: "Job orders list retrieved successfully",
    results: jobOrders,
    status: "success",
  });
};

exports.addConsumedMaterials = async (req, res) => {
  try {
    const { job_order_id } = req.params;
    const { consumed_materials, consumed_colors } = req.body;

    // Find the JobOrder by ID
    const jobOrder = await JobOrder.findById(job_order_id);
    if (!jobOrder) {
      return res.status(404).send({ message: "O.T. No encontrada" });
    }

    // Validate consumed_materials and ensure it's an array
    if (!Array.isArray(consumed_materials)) {
      return res
        .status(400)
        .send({ message: "Formato invalido para materiales consumidos" });
    }

    // If consumed_colors is provided, update it
    if (typeof consumed_colors === "object") {
      jobOrder.consumed_colors = consumed_colors;
    }

    // Get the current consumed materials in the job order
    const previousConsumedMaterials = [...jobOrder.consumed_materials];

    // Create a set of the new consumed material IDs for easier comparison
    const consumedMaterialSet = new Set(
      consumed_materials
        .filter((item) => item.storage_material) // Ensure storage_material exists
        .map((item) => item.storage_material.toString())
    );

    // Filter out materials that are no longer in the consumed_materials list
    const removedMaterials = previousConsumedMaterials.filter((item) => {
      const plainItem = item.toObject();
      return !consumedMaterialSet.has(plainItem.storage_material?.toString());
    });

    // Add the quantity of removed materials back to the corresponding StorageMaterial stock
    for (let removedItem of removedMaterials) {
      if (!removedItem.storage_material) continue; // Skip invalid entries

      const consumedMaterial = await StorageMaterial.findById(
        removedItem.storage_material
      );

      if (consumedMaterial) {
        consumedMaterial.quantity += removedItem.quantity;
        await consumedMaterial.save();
      }
    }

    // Update the jobOrder's consumed_materials list by keeping only valid items
    jobOrder.consumed_materials = jobOrder.consumed_materials.filter(
      (item) =>
        item.storage_material &&
        consumedMaterialSet.has(item.storage_material.toString())
    );

    // Process the new consumed materials
    for (let materialItem of consumed_materials) {
      if (!materialItem.storage_material) {
        return res.status(400).send({ message: "Material en lista invalido" });
      }

      const consumedMaterial = await StorageMaterial.findById(
        new mongoose.Types.ObjectId(materialItem.storage_material)
      );

      if (!consumedMaterial) {
        return res.status(404).send({
          message: `Material con ID ${materialItem.storage_material} no encontrado`,
        });
      }

      // Find the material in the job order's consumed_materials list
      const existingMaterial = jobOrder.consumed_materials.find(
        (item) =>
          item.storage_material &&
          item.storage_material.toString() ===
          materialItem.storage_material.toString()
      );

      let quantityDifference = 0;

      if (existingMaterial) {
        // If the material is already in the list, calculate the difference
        quantityDifference = materialItem.quantity - existingMaterial.quantity;

        if (quantityDifference > 0) {
          // Subtract the difference from the consumedMaterial stock
          if (consumedMaterial.quantity < quantityDifference) {
            return res.status(400).send({
              message: `Not enough quantity for material ID ${materialItem.storage_material}`,
            });
          }
          consumedMaterial.quantity -= quantityDifference;
        } else if (quantityDifference < 0) {
          // Add the difference back to the consumedMaterial stock
          consumedMaterial.quantity += Math.abs(quantityDifference);
        }

        // Update the quantity, price, and sell_price
        existingMaterial.quantity = materialItem.quantity;
        existingMaterial.price = materialItem.price;
        existingMaterial.sell_price =
          materialItem.sell_price ?? materialItem.price * 1.1; // Default if not provided
      } else {
        // If it's a new material, just add it to the consumed_materials array
        if (consumedMaterial.quantity < materialItem.quantity) {
          return res.status(400).send({
            message: `Not enough quantity for material ID ${materialItem.storage_material}`,
          });
        }

        consumedMaterial.quantity -= materialItem.quantity;
        jobOrder.consumed_materials.push({
          storage_material: materialItem.storage_material,
          quantity: materialItem.quantity,
          price: materialItem.price,
          sell_price: materialItem.sell_price ?? materialItem.price * 1.1, // Default if not provided
        });
      }

      // Save the updated consumption material
      await consumedMaterial.save();
    }

    if (!jobOrder.sell_price) {
      jobOrder.sell_price = jobOrder.consumed_materials.reduce(
        (total, material) => {
          return total + material.sell_price * material.quantity;
        },
        0
      );
    }

    // Save the updated job order
    await jobOrder.save();

    return res.send({
      message: "Materiales actualizados en la O.T. con éxito",
      results: jobOrder,
    });
  } catch (error) {
    return res.status(500).send({
      message: "Internal server error",
      description: error.message,
    });
  }
};

// Handle view jobOrder info
exports.get = function (req, res) {
  const job_order_id = new mongoose.Types.ObjectId(req.params.job_order_id);
  if (!job_order_id) {
    return res.status(400).send({ message: "Invalid jobOrder id" });
  }

  JobOrder.aggregate(
    [
      {
        $match: {
          _id: job_order_id,
        },
      },
    ].concat(jobOrderProjectionMaterials) // <-- tu pipeline que hace el populate de materiales
  )
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "JobOrder not found" });
      }

      const jobOrder = cursor[0];

      // Calcular material_cost, material_profit
      let materialCost = 0;
      let materialProfit = 0;
      let colorsCost = 0

      if (Array.isArray(jobOrder.consumed_materials)) {
        jobOrder.consumed_materials.forEach((item) => {
          const cost = item.price * item.quantity;
          const sell = item.sell_price * item.quantity;
          materialCost += cost;
          materialProfit += (sell - cost);
        });
      }

      // Incluir colores en el costo
      if (Array.isArray(jobOrder.consumed_colors)) {
        jobOrder.consumed_colors.forEach((color) => {
          colorsCost += color.price;
          // NOTA: asumimos que los colores no se revenden individualmente, solo cuentan como costo
        });
      }

      // Calcular profit total si hay sell_price
      const totalSellPrice = jobOrder.sell_price || 0;
      const profit = totalSellPrice - materialCost - colorsCost;

      // Agregar los campos calculados al resultado
      jobOrder.materials_cost = materialCost;
      jobOrder.materials_profit = materialProfit;
      jobOrder.profit = profit;
      jobOrder.colors_cost = colorsCost;

      return res.json({
        status: "success",
        message: "JobOrder retrieved successfully",
        results: jobOrder,
      });
    })
    .catch((error) => {
      return res
        .status(500)
        .send({ message: "Internal server error", description: error });
    });
};


// Handle update car from id
exports.update = function (req, res) {
  try {
    JobOrder.findById(req.params.job_order_id)
      .then((jobOrder) => {
        if (!jobOrder)
          return res.status(404).send({ message: "JobOrder not found" });

        // Prevent updating created_date
        const { created_date, ...updateData } = req.body;

        // Iterate over the keys in updateData and update corresponding fields
        Object.keys(updateData).forEach((key) => {
          jobOrder[key] = updateData[key];
        });

        // Save the jobOrder and check for errors
        jobOrder
          .save()
          .then((updatedJobOrder) => {
            res.json({
              message: "JobOrder updated",
              results: updatedJobOrder,
            });
          })
          .catch((err) => {
            res
              .status(500)
              .send({ message: err.message || "Error updating JobOrder" });
          });
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: err.message || "Error finding JobOrder" });
      });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};
// Handle delete jobOrder
exports.delete = function (req, res) {
  JobOrder.deleteOne({
    _id: req.params.job_order_id,
  })
    .then((car) => {
      if (car) {
        return res.json({
          status: "success",
          message: "JobOrder deleted successfully!",
        });
      }
      return res.status(400).send({ message: "JobOrder not found!" });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

exports.updateConsumedMaterialsPrices = async (req, res) => {
  try {
    // Fetch all active job orders
    const jobOrders = await JobOrder.find({ archived: false });

    // Get all unique storage material IDs from the job orders
    const storageMaterialIds = [
      ...new Set(
        jobOrders.flatMap((jobOrder) =>
          jobOrder.consumed_materials.map((cm) => cm.storage_material)
        )
      ),
    ];

    // Fetch all storage materials in one go
    const storageMaterials = await StorageMaterial.find({
      _id: { $in: storageMaterialIds },
    });

    // Create a lookup map for quick access
    const materialMap = new Map();
    storageMaterials.forEach((material) => {
      materialMap.set(material._id.toString(), material);
    });

    // Iterate through job orders and update consumed materials
    for (const jobOrder of jobOrders) {
      let hasUpdates = false;

      jobOrder.consumed_materials.forEach((consumedMaterial) => {
        const material = materialMap.get(
          consumedMaterial.storage_material.toString()
        );
        if (material) {
          const newSellPrice =
            material.price + material.price * (material.margin / 100);

          if (consumedMaterial.sell_price !== newSellPrice) {
            consumedMaterial.sell_price = newSellPrice;
            hasUpdates = true;
          }
        }
      });

      const material_cost = jobOrder.consumed_materials.reduce(
        (total, cm) => total + cm.quantity * cm.sell_price,
        0
      );

      console.log("material_cost", material_cost);

      // Save only if changes were made
      if (hasUpdates) {
        await jobOrder.save();
      }
    }

    return res.status(200).json({
      message: "Consumed material prices updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      description: error.message,
    });
  }
};

// /* WARNING: This will delete all employees, use only on dev environment */
// exports.deleteAll = function (req, res) {
//   JobOrder.deleteMany({})
//     .then(() => {
//       res.json({
//         status: "success",
//         message:
//           "All jobOrder deleted, prepare yourself, I'm going to kill you.",
//       });
//     })
//     .catch((err) => {
//       if (err) res.status(500).send({ message: err });
//     });
// };
