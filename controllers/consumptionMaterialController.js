// storageMaterialController.js
// Import Models

const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");
const ConsumptionMaterial = require("../models/storageMaterialModel");

exports.register = async (req, res) => {
  try {
    let material = req.body.material;
    let quantity = req.body.quantity;
    quantity = Number(quantity);

    if (typeof quantity !== "number") {
      return res.status(400).json({ error: "Invalid data format." });
    }

    const consumptionMaterial = new ConsumptionMaterial({
      quantity: quantity,
      material: material,
    });

    consumptionMaterial.save().then((material) => {
      if (material) {
        res.send({
          message: "Consumption material was registered successfully",
          results: material,
        });
        return;
      }
    });
  } catch (err) {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
  }
};

exports.index = async function (req, res) {
  const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;

  let query = {};

  const filterArray = helpers.getFilterArray(filter);

  // Apply filtering if any
  if (filter) {
    filterArray.forEach((filterItem) => {
      switch (filterItem.name) {
        case "archived":
          const archived = filterItem.value === "true" ? true : false;
          query[filterItem.name] = archived;
          break;
        case "start_date":
        case "end_date":
          // Parse and add date filter to the query
          const dateFilter = {};
          if (req.query.start_date)
            dateFilter["$gte"] = new Date(req.query.start_date);
          if (req.query.end_date)
            dateFilter["$lte"] = new Date(req.query.end_date);
          query["created_date"] = dateFilter;
          break;
        default:
          query[filterItem.name] = {
            $regex: filterItem.value,
            $options: "i",
          };
          break;
      }
    });
  }
  // Apply sorting if any
  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["date"] = 1;
  }

  const totalMaterials = await ConsumptionMaterial.countDocuments(query);
  const materials = await ConsumptionMaterial.aggregate([
    { $match: query },
    { $sort: sortOptions },
    { $skip: (page - 1) * limit },
    { $limit: parseInt(limit) },
  ]).catch((err) => {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  });

  return res.json({
    status: "success",
    message: "Materials list retrieved successfully",
    count: totalMaterials,
    results: materials,
  });
};

exports.get = function (req, res) {
  const materialId = new mongoose.Types.ObjectId(req.params.material_id);
  if (!materialId) {
    return res.status(400).send({ message: "Invalid material id" });
  }

  ConsumptionMaterial.aggregate([
    {
      $match: {
        _id: materialId,
      },
    },
  ])
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "Material not found" });
      }
      return res.json({
        status: "success",
        message: "Material retrieved successfully",
        results: cursor[0],
      });
    })
    .catch((error) => {
      return res
        .status(500)
        .send({ message: "Internal server error", description: error });
    });
};

// Handle update material from id
exports.update = function (req, res) {
  ConsumptionMaterial.findById(req.params.material_id)
    .then((material) => {
      if (!material) res.status(404).send({ message: "material not found" });

      // Iterate over the keys in the request body and update corresponding fields
      Object.keys(req.body).forEach((key) => {
        material[key] = req.body[key];
      });

      // save the material and check for errors
      material
        .save()
        .then((updatedCar) => {
          res.json({
            message: "Storage Material updated",
            results: updatedCar,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .send({ message: err.message || "Error updating material" });
        });
    })
    .catch((err) => {
      res
        .status(500)
        .send({ message: err.message || "Error finding material" });
    });
};
// Handle delete material
exports.delete = function (req, res) {
  ConsumptionMaterial.deleteOne({
    _id: req.params.material_id,
  })
    .then((material) => {
      if (material) {
        return res.json({
          status: "success",
          message: "ConsumptionMaterial deleted successfully!",
        });
      }
      return res
        .status(400)
        .send({ message: "ConsumptionMaterial not found!" });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

/* WARNING: This will delete all appointments, use only on dev environment */
exports.deleteAll = function (req, res) {
  ConsumptionMaterial.deleteMany({})
    .then(() => {
      res.json({
        status: "success",
        message:
          "All materials deleted, prepare yourself, I'm going to kill you.",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
