const Service = require("../models/serviceModel");
const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");

exports.register = async (req, res) => {
  try {
    const service = new Service({
      name: req.body.name,
      description: req.body.description,
      owner: req.body.owner || "both",
      small_car_price: Number(req.body.small_car_price) || 0,
      large_car_price: Number(req.body.large_car_price) || 0,
      small_truck_price: Number(req.body.small_truck_price) || 0,
      large_truck_price: Number(req.body.large_truck_price) || 0,
      materials: req.body.materials || [],
    });

    const savedService = await service.save();
    res.json({
      message: "Service registered successfully",
      results: savedService,
    });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error registering service" });
  }
};

exports.index = async function (req, res) {
  const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;
  let query = {};

  const filterArray = helpers.getFilterArray(filter);

  if (filter) {
    filterArray.forEach((filterItem) => {
      switch (filterItem.name) {
        case "owner":
          if (filterItem.value !== "both") {
            query["$or"] = [
              { owner: filterItem.value },
              { owner: "both" }
            ];
          }
          break;
        case "search":
          query["name"] = { $regex: filterItem.value, $options: "i" };
          break;
        default:
          query[filterItem.name] = { $regex: filterItem.value, $options: "i" };
          break;
      }
    });
  }

  let sortOptions = {};
  if (sortBy && sortOrder) {
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
  } else {
    sortOptions["created_date"] = -1;
  }

  try {
    const services = await Service.aggregate([
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

    const totalServices = services[0].totalCount.length > 0 ? services[0].totalCount[0].count : 0;
    const results = services[0].paginatedResults;

    return res.json({
      status: "success",
      message: "Services retrieved successfully",
      count: totalServices,
      results,
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error", description: err });
  }
};

exports.get = async function (req, res) {
  try {
    const service = await Service.findById(req.params.service_id).populate("materials.material");
    if (!service) {
      return res.status(404).send({ message: "Service not found" });
    }
    res.json({
      status: "success",
      results: service,
    });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error retrieving service" });
  }
};

exports.update = async function (req, res) {
  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.service_id,
      {
        name: req.body.name,
        description: req.body.description,
        owner: req.body.owner,
        small_car_price: req.body.small_car_price,
        large_car_price: req.body.large_car_price,
        small_truck_price: req.body.small_truck_price,
        large_truck_price: req.body.large_truck_price,
        materials: req.body.materials,
      },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).send({ message: "Service not found" });
    }

    res.json({
      message: "Service updated successfully",
      results: updatedService,
    });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error updating service" });
  }
};

exports.delete = async function (req, res) {
  try {
    const result = await Service.deleteOne({ _id: req.params.service_id });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Service not found" });
    }
    res.json({
      status: "success",
      message: "Service deleted successfully",
    });
  } catch (err) {
    res.status(500).send({ message: err.message || "Error deleting service" });
  }
};
