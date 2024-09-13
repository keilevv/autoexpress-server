// storageMaterialController.js
// Import Models

const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");
const ConsumptionMaterial = require("../models/consumptionMaterialModel");
const StorageMaterial = require("../models/storageMaterialModel");
const aggregations = require("./aggregations");

exports.register = async (req, res) => {
  try {
    const materials = req.body.materials;
    if (!materials || materials.length === 0)
      return res
        .status(400)
        .send({ message: "Ningun material válido asignado" });

    for (const material of materials) {
      const storageMaterial = await StorageMaterial.findById(
        material.material_id
      );
      if (!storageMaterial) {
        return res.status(404).send({ message: "Material no encontrado" });
      }

      const existingConsumptionMaterial = await ConsumptionMaterial.findOne({
        material: material.material_id,
      });
      if (
        existingConsumptionMaterial &&
        !existingConsumptionMaterial.archived
      ) {
        return res
          .status(400)
          .send({ message: "Material de consumo ya existente" });
      }

      if (material.quantity > storageMaterial.quantity) {
        return res
          .status(400)
          .send({ message: "No hay suficientes materiales" });
      }

      storageMaterial.quantity -= material.quantity;
      await storageMaterial.save();

      const consumptionMaterial = new ConsumptionMaterial({
        material: material.material_id,
        quantity: material.quantity,
      });

      await consumptionMaterial.save();
    }

    res
      .status(201)
      .send({ message: "Materiales de consumo creados exitosamente" });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal server error", description: err });
  }
};

exports.index = async function (req, res) {
  const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;

  let query = {};

  const filterArray = helpers.getFilterArray(filter);
  filterArray.forEach((filterItem) => {
    if (filterItem.name === "archived") {
      const archived = filterItem.value === "true" ? true : false;
      query[filterItem.name] = archived;
    }
  });

  // Apply sorting if any
  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["date"] = 1;
  }

  try {
    const totalMaterials = await ConsumptionMaterial.countDocuments(query);

    const materials = await ConsumptionMaterial.aggregate([
      { $match: query },
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "storagematerials", // Ensure this is the correct collection name
          localField: "material",
          foreignField: "_id",
          as: "material",
        },
      },
      {
        $unwind: "$material",
      },
      {
        // Add filtering for material.name here
        $match: filter.search
          ? {
              $or: [
                {
                  "material.name": {
                    $regex: filter.search,
                    $options: "i",
                  },
                },
                {
                  "material.reference": {
                    $regex: filter.search,
                    $options: "i",
                  },
                },
              ],
            }
          : {},
      },
    ]);

    return res.json({
      status: "success",
      message: "Materials list retrieved successfully",
      count: totalMaterials,
      results: materials,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

exports.get = function (req, res) {
  const materialId = new mongoose.Types.ObjectId(req.params.material_id);
  if (!materialId) {
    return res.status(400).send({ message: "Invalid material id" });
  }

  ConsumptionMaterial.aggregate(
    [
      {
        $match: {
          _id: materialId,
        },
      },
    ].concat(aggregations.consumptionMaterialProjection)
  )
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
exports.update = async function (req, res) {
  try {
    const material = await ConsumptionMaterial.findById(req.params.material_id);
    if (!material) {
      return res.status(404).send({ message: "Material not found" });
    }
    Object.keys(req.body).forEach(async (key) => {
      if (key === "material" || key === "quantity") {
        const newQuantity = req.body.quantity;
        const oldQuantity = material.quantity;
        const difference = newQuantity - oldQuantity;

        const storageMaterial = await StorageMaterial.findById(
          material.material
        );
        if (!storageMaterial) {
          return res
            .status(404)
            .send({ message: "Material de almacenamiento no encontrado" });
        }
        // Check if there is enough storage material for the difference
        if (difference > 0 && difference > storageMaterial.quantity) {
          return res
            .status(400)
            .send({ message: "No hay suficientes materiales para actualizar" });
        }

        // Update the storage material quantity
        storageMaterial.quantity -= difference;
        await storageMaterial.save();

        // Update the consumption material
        material.quantity = newQuantity;
        await material.save();
        material.material = storageMaterial;

        res.json({
          message: "Material de consumo actualizado exitosamente",
          results: material,
        });
      }

      if (key === "archived") {
        material.archived = req.body.archived;
        await material.save();
        res.json({
          message: "Material de consumo actualizado exitosamente",
          results: material,
        });
      }
    });
  } catch (err) {
    res
      .status(500)
      .send({ message: "Internal server error", description: err.message });
  }
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
