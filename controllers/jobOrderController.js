// jobOrderController.js
// Import Models
JobOrder = require("../models/jobOrderModel");
ConsumptionMaterial = require("../models/consumptionMaterialModel");

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
    });

    // Save the job order first
    const savedJobOrder = await jobOrder.save({ session });

    // Iterate over consumed consumed_materials and update consumptionMaterial quantities
    if (req.body.consumed_materials && req.body.consumed_materials.length > 0) {
      for (const item of req.body.consumed_materials) {
        const { material, quantity } = item;

        const updatedMaterial = await ConsumptionMaterial.findByIdAndUpdate(
          material,
          { $inc: { quantity: -quantity } },
          { new: true, session },
        );

        // Check if quantity goes negative
        if (!updatedMaterial || updatedMaterial.quantity < 0) {
          throw new Error(
            `Insufficient stock for material ID: ${material} (remaining quantity: ${updatedMaterial ? updatedMaterial.quantity : 0
            })`,
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
// Handle index actions – now using populate()
exports.index = async function (req, res) {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = "created_date",
      sortOrder = "desc",
      ...filter
    } = req.query;

    /* ---------- Build the same query object as before ---------- */
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
            if (req.query.start_date)
              dateFilter["$gte"] = new Date(req.query.start_date);
            if (req.query.end_date)
              dateFilter["$lte"] = new Date(req.query.end_date);
            if (Object.keys(dateFilter).length)
              query["created_date"] = dateFilter;
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
            if (filterItem.value)
              query["owner"] = filterItem.value || "autoexpresss";
            break;
          case "status":
            if (filterItem.value) query["status"] = [String(filterItem.value)];
            break;
        }
      });
    }

    const sortOptions = helpers.getSortOptions(query, sortBy, sortOrder);

    // ---------- 2️⃣ Total price (full year or date range) ----------
    // Build a match for total price calculation. If the user supplied a date filter we use it;
    // otherwise we default to the current calendar year.
    let totalPriceMatch = { ...query };
    if (!totalPriceMatch.created_date) {
      const now = new Date();
      const currentYear = now.getFullYear();
      totalPriceMatch.created_date = {
        $gte: new Date(currentYear, 0, 1),
        $lt: new Date(currentYear + 1, 0, 1),
      };
    }

    const totalPriceOrders = await JobOrder.find(totalPriceMatch)
      .populate({
        path: "consumed_materials.consumption_material",
        populate: { path: "material", model: "StorageMaterial" },
      })
      .populate("employee")
      .lean();

    const total_price = totalPriceOrders.reduce((acc, order) => {
      const materialsTotal = (order.consumed_materials || []).reduce(
        (sum, item) => {
          const price = item.consumption_material?.material?.price || 0;
          return sum + (item.quantity || 0) * price;
        },
        0,
      );

      const colorsTotal = (order.consumed_colors || []).reduce(
        (sum, color) => sum + (color.price || 0),
        0,
      );

      return acc + materialsTotal + colorsTotal;
    }, 0);

    /* ---------- 1️⃣ Total count ---------- */
    const totalCount = await JobOrder.countDocuments(query);

    /* ---------- 2️⃣ Fetch paginated job orders with populated refs ---------- */
    const jobOrders = await JobOrder.find(query)
      .populate("employee") // employee details
      .populate({
        path: "consumed_materials.consumption_material", // consumptionMaterial
        populate: { path: "material", model: "StorageMaterial" }, // storageMaterial
      })
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .exec();

    // total_price is already computed via aggregation above

    /* ---------- 4️⃣ Respond ---------- */
    return res.json({
      count: totalCount,
      total_price,
      message: "Job orders list retrieved successfully",
      results: jobOrders,
      status: "success",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err.message });
  }
};

exports.addConsumedMaterials = async (req, res) => {
  const { job_order_id } = req.params;
  try {
    const { consumed_materials, consumed_colors } = req.body; // consumed_materials is an array of { material_id, quantity }

    // Find the JobOrder by ID
    const jobOrder = await JobOrder.findById(job_order_id);
    if (!jobOrder) {
      return res.status(404).send({ message: "JobOrder not found" });
    }

    // Get the current consumed materials in the job order
    const previousConsumedMaterials = [...jobOrder.consumed_materials];

    // Create a set of the new consumed material IDs for easier comparison
    const consumedMaterialSet = new Set(
      consumed_materials.map((item) => item.consumption_material.toString()),
    );

    // Filter out materials that are no longer in the consumed_materials list
    const removedMaterials = previousConsumedMaterials.filter(
      (item) => !consumedMaterialSet.has(item.consumption_material.toString()),
    );

    // Add the quantity of removed materials back to the corresponding ConsumptionMaterial stock
    for (let removedItem of removedMaterials) {
      const consumptionMaterial = await ConsumptionMaterial.findById(
        removedItem.consumption_material,
      );
      if (consumptionMaterial) {
        consumptionMaterial.quantity += removedItem.quantity;
        await consumptionMaterial.save();
      }
    }

    // Update the jobOrder's consumed_materials list by removing items not in the new list
    jobOrder.consumed_materials = jobOrder.consumed_materials.filter((item) =>
      consumedMaterialSet.has(item.consumption_material.toString()),
    );

    // Process the new consumed materials
    for (let materialItem of consumed_materials) {
      const consumptionMaterial = await ConsumptionMaterial.findById(
        materialItem.consumption_material,
      );
      if (!consumptionMaterial) {
        return res.status(404).send({
          message: `Material with ID ${materialItem.consumption_material} not found`,
        });
      }

      // Find the material in the job order's consumed_materials list
      const existingMaterial = jobOrder.consumed_materials.find(
        (item) =>
          item.consumption_material.toString() ===
          materialItem.consumption_material,
      );
      let quantityDifference = 0;

      if (existingMaterial) {
        // If the material is already in the list, calculate the difference
        quantityDifference = materialItem.quantity - existingMaterial.quantity;

        if (quantityDifference > 0) {
          // Subtract the difference from the consumptionMaterial stock
          if (consumptionMaterial.quantity < quantityDifference) {
            return res.status(400).send({
              message: `Not enough quantity for material ID ${materialItem.consumption_material}`,
            });
          }
          consumptionMaterial.quantity -= quantityDifference;
        } else if (quantityDifference < 0) {
          // Add the difference back to the consumptionMaterial stock
          consumptionMaterial.quantity += Math.abs(quantityDifference);
        }

        // Update the quantity in the consumed_materials array
        existingMaterial.quantity = materialItem.quantity;
      } else {
        const storageMaterial = await StorageMaterial.findById(
          consumptionMaterial.material,
        );
        if (storageMaterial.is_color && storageMaterial.unit === "litro") {
          materialItem.quantity =
            materialItem.quantity / storageMaterial.normalized_weight;
        }
        if (consumptionMaterial.quantity < materialItem.quantity) {
          // If it's a new material, just add it to the consumed_materials array
          return res.status(400).send({
            message: `Not enough quantity for material ID ${materialItem.consumption_material}`,
          });
        }

        consumptionMaterial.quantity -= materialItem.quantity;
        jobOrder.consumed_materials.push({
          consumption_material: materialItem.consumption_material,
          quantity: materialItem.quantity,
        });
      }

      // Save the updated consumption material
      await consumptionMaterial.save();
    }

    const previousConsumedColors = [...jobOrder.consumed_colors];
    const consumedColorsSet = new Set(
      consumed_colors.map((item) => {
        if (item.consumption_material) {
          return item.consumption_material;
        }
        return item.name;
      }),
    );

    const removedColors = previousConsumedColors.filter(
      (item) => !consumedColorsSet.has(item.consumption_material),
    );
    for (let removedItem of removedColors) {
      const consumptionMaterial = await ConsumptionMaterial.findById(
        removedItem.consumption_material,
      );
      if (consumptionMaterial) {
        consumptionMaterial.quantity += removedItem.quantity;
        await consumptionMaterial.save();
      }
    }
    jobOrder.consumed_colors = jobOrder.consumed_colors.filter((item) =>
      consumedColorsSet.has(item.consumption_material),
    );

    for (let colorItem of consumed_colors) {
      if (colorItem.consumption_material) {
        const consumptionMaterial = await ConsumptionMaterial.findById(
          colorItem.consumption_material,
        );

        if (!consumptionMaterial) {
          return res.status(404).send({
            message: `Material with ID ${colorItem.consumption_material} not found`,
          });
        }
        const existingColor = jobOrder.consumed_colors.find(
          (item) =>
            item.consumption_material === colorItem.consumption_material,
        );
        let quantityDifference = 0;

        if (existingColor) {
          quantityDifference = colorItem.quantity - existingColor.quantity;

          if (quantityDifference > 0) {
            if (consumptionMaterial.quantity < quantityDifference) {
              return res.status(400).send({
                message: `Not enough quantity for material ID ${colorItem.consumption_material}`,
              });
            }
            consumptionMaterial.quantity -= quantityDifference;
          } else if (quantityDifference < 0) {
            // Add the difference back to the consumptionMaterial stock
            consumptionMaterial.quantity += Math.abs(quantityDifference);
          }

          // Update the quantity in the consumed_materials array
          existingColor.quantity = colorItem.quantity;
        } else {
          const storageMaterial = await StorageMaterial.findById(
            consumptionMaterial.material,
          );
          if (storageMaterial.is_color && storageMaterial.unit === "litro") {
            colorItem.quantity =
              colorItem.quantity / storageMaterial.normalized_weight;
          }
          if (consumptionMaterial.quantity < colorItem.quantity) {
            // If it's a new material, just add it to the consumed_materials array
            return res.status(400).send({
              message: `Not enough quantity for material ID ${colorItem.consumption_material}`,
            });
          }

          consumptionMaterial.quantity -= colorItem.quantity;
          jobOrder.consumed_colors.push({
            name: colorItem.name,
            price: colorItem.price,
            consumption_material: colorItem.consumption_material,
            quantity: colorItem.quantity,
          });
        }

        // Save the updated consumption material
        await consumptionMaterial.save();
      } else {
        jobOrder.consumed_colors.push({
          name: colorItem.name,
          price: colorItem.price,
          quantity: colorItem.quantity,
          consumption_material: colorItem.consumption_material
            ? colorItem.consumption_material
            : null,
        });
      }
    }
    // Save the updated job order
    await jobOrder.save();

    return res.send({
      message:
        "Materials added/updated and consumption materials updated successfully!",
      results: jobOrder,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal server error", description: error.message });
  }
};

// Handle view jobOrder info
exports.get = function (req, res) {
  const jobOrderId = req.params.job_order_id;
  if (!mongoose.Types.ObjectId.isValid(jobOrderId)) {
    return res.status(400).send({ message: "Invalid jobOrder id" });
  }

  JobOrder.findById(jobOrderId)
    .populate("employee")
    .populate({
      path: "consumed_materials.consumption_material",
      populate: {
        path: "material",
        model: "StorageMaterial",
      },
    })
    .lean()
    .then((jobOrder) => {
      if (!jobOrder) {
        return res.status(404).send({ message: "JobOrder not found" });
      }

      const response = {
        ...jobOrder,
        consumed_materials: jobOrder.consumed_materials.map((item) => ({
          quantity: item.quantity,
          consumption_material: item.consumption_material,
          storage_material: item.consumption_material?.material || null,
        })),
      };

      return res.json({
        status: "success",
        message: "JobOrder retrieved successfully",
        results: response,
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
        if (!jobOrder) res.status(404).send({ message: "JobOrder not found" });

        // Iterate over the keys in the request body and update corresponding fields
        Object.keys(req.body).forEach((key) => {
          if (key === "consumed_colors" || key === "consumed_materials") {
            return res.status(400).send({
              message: `Cannot update ${key} directly. Use the specific endpoint.`,
            });
          }
          jobOrder[key] = req.body[key];
        });

        // save the jobOrder and check for errors
        jobOrder
          .save()
          .then((updatedEmployee) => {
            res.json({
              message: "JobOrder updated",
              results: updatedEmployee,
            });
          })
          .catch((err) => {
            res
              .status(500)
              .send({ message: err.message || "Error updating jobOrder" });
          });
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: err.message || "Error finding jobOrder" });
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
