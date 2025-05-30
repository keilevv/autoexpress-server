// jobOrderController.js
// Import Models
JobOrder = require("../models/jobOrderModel");
ConsumptionMaterial = require("../models/consumptionMaterialModel");
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
          { new: true, session }
        );

        // Check if quantity goes negative
        if (!updatedMaterial || updatedMaterial.quantity < 0) {
          throw new Error(
            `Insufficient stock for material ID: ${material} (remaining quantity: ${
              updatedMaterial ? updatedMaterial.quantity : 0
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
  try {
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
            const archived = filterItem.value === "true" ? true : false;
            query[filterItem.name] = archived;
            break;
          case "start_date":
          case "end_date":
            const dateFilter = {};
            if (req.query.start_date)
              dateFilter["$gte"] = new Date(req.query.start_date);
            if (req.query.end_date)
              dateFilter["$lte"] = new Date(req.query.end_date);
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
            if (filterItem.value) {
              query["owner"] = filterItem.value
                ? filterItem.value
                : "autoexpresss";
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

    let sortOptions = helpers.getSortOptions();

    const totalJobOrders = await JobOrder.countDocuments(query);

    // Aggregation to calculate total price for all documents matching the filter
    const totalPriceResult = await JobOrder.aggregate([
      { $match: query },
      ...jobOrderProjectionMaterials,
      {
        $addFields: {
          consumedMaterialsTotal: {
            $sum: {
              $map: {
                input: "$consumed_materials",
                as: "material",
                in: {
                  $multiply: [
                    "$$material.quantity",
                    "$$material.storage_material.price",
                  ],
                },
              },
            },
          },
          consumedColorsTotal: {
            $sum: {
              $map: {
                input: "$consumed_colors",
                as: "color",
                in: "$$color.price",
              },
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          total_price: {
            $sum: { $add: ["$consumedMaterialsTotal", "$consumedColorsTotal"] },
          },
        },
      },
    ]);

    const total_price = totalPriceResult[0]?.total_price || 0;

    // Retrieve paginated results with projection for the requested page
    const jobOrders = await JobOrder.aggregate([
      { $match: query },
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
      ...jobOrderProjectionMaterials, // Assuming this projection includes needed fields
    ]).catch((err) => {
      return res
        .status(500)
        .json({ message: "Internal server error", description: err });
    });

    return res.json({
      count: totalJobOrders,
      total_price,
      message: "Job orders list retrieved successfully",
      results: jobOrders,
      status: "success",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
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

    // If consumed_colors is provided, update it
    if (typeof consumed_colors === "object") {
      jobOrder.consumed_colors = consumed_colors;
    }

    // Get the current consumed materials in the job order
    const previousConsumedMaterials = [...jobOrder.consumed_materials];

    // Create a set of the new consumed material IDs for easier comparison
    const consumedMaterialSet = new Set(
      consumed_materials.map((item) => item.consumption_material.toString())
    );

    // Filter out materials that are no longer in the consumed_materials list
    const removedMaterials = previousConsumedMaterials.filter(
      (item) => !consumedMaterialSet.has(item.consumption_material.toString())
    );

    // Add the quantity of removed materials back to the corresponding ConsumptionMaterial stock
    for (let removedItem of removedMaterials) {
      const consumptionMaterial = await ConsumptionMaterial.findById(
        removedItem.consumption_material
      );
      if (consumptionMaterial) {
        consumptionMaterial.quantity += removedItem.quantity;
        await consumptionMaterial.save();
      }
    }

    // Update the jobOrder's consumed_materials list by removing items not in the new list
    jobOrder.consumed_materials = jobOrder.consumed_materials.filter((item) =>
      consumedMaterialSet.has(item.consumption_material.toString())
    );

    // Process the new consumed materials
    for (let materialItem of consumed_materials) {
      const consumptionMaterial = await ConsumptionMaterial.findById(
        materialItem.consumption_material
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
          materialItem.consumption_material
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
        // If it's a new material, just add it to the consumed_materials array
        if (consumptionMaterial.quantity < materialItem.quantity) {
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
    ].concat(jobOrderProjectionMaterials)
  )
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "JobOrder not found" });
      }
      return res.json({
        status: "success",
        message: "JobOrder retrieved successfully",
        results: cursor[0],
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
