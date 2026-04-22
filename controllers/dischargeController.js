const Discharge = require("../models/dischargeModel");
const StorageMaterial = require("../models/storageMaterialModel");
const User = require("../models/userModel");
const Service = require("../models/serviceModel");
const mongoose = require("mongoose");
const { helpers } = require("../utils/helpers");

exports.register = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { services, materials_recipe } = req.body;
    const userId = req.userId;

    if (!services || !materials_recipe || !userId) {
      return res.status(400).send({ message: "Faltan datos requeridos para la descarga." });
    }

    const discharge = new Discharge({
      services,
      materials_recipe,
      user: userId,
    });

    await discharge.save({ session });

    for (const recipe of materials_recipe) {
      const material = await StorageMaterial.findById(recipe.material).session(session);
      if (!material) {
        throw new Error(`Material no encontrado: ${recipe.material}`);
      }

      if (material.is_gram_consumed) {
        material.quantity_in_grams = Math.max(0, (material.quantity_in_grams || 0) - recipe.consumed_grams);
        if (material.normalized_weight > 0) {
          material.quantity = material.quantity_in_grams / material.normalized_weight;
        }
      } else {
        material.quantity = Math.max(0, material.quantity - recipe.quantity_subtracted);
      }

      await material.save({ session });
    }

    await session.commitTransaction();
    session.endSession();

    res.json({
      message: "Descarga registrada y stock actualizado exitosamente.",
      results: discharge,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).send({ message: err.message || "Error registrando la descarga." });
  }
};

exports.index = async (req, res) => {
  const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;
  let query = {};
  
  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["created_date"] = -1;
  }

  try {
    const discharges = await Discharge.aggregate([
      { $match: query },
      {
        $facet: {
          paginatedResults: [
            { $sort: sortOptions },
            { $skip: (page - 1) * parseInt(limit) },
            { $limit: parseInt(limit) },
          ],
          totalCount: [{ $count: "count" }],
        },
      },
    ]);

    let results = discharges[0].paginatedResults;
    const totalCount = discharges[0].totalCount.length > 0 ? discharges[0].totalCount[0].count : 0;

    await Discharge.populate(results, [
      { path: "user", select: "name last_name email" },
      { path: "services.service", select: "name" },
      { path: "materials_recipe.material", select: "name reference unit" },
    ]);

    return res.json({
      status: "success",
      count: totalCount,
      results,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", description: err });
  }
};
