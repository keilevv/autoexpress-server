// clientController.js
// Import Models
Car = require("../models/carModel");
Client = require("../models/clientModel");
const regex = require("../utils/regex");
const aggregations = require("./aggregations");
const { helpers } = require("../utils/helpers");

exports.register = (req, res) => {
  if (!regex.commonRegex.vin.test(req.body.vin)) {
    return res.status(400).json({ error: "Invalid vin format." });
  }
  if (!regex.commonRegex.carPlate.test(req.body.plate)) {
    return res.status(400).json({ error: "Invalid car plate format." });
  }

  const car = new Car({
    vin: String(req.body.vin).toUpperCase(),
    brand: req.body.brand,
    model: req.body.model,
    year: req.body.year,
    plate: String(req.body.plate).toUpperCase(),
    color: req.body.color,
    doors: req.body.doors,
    clients: req.body.clients,
  });
  try {
    car
      .save()
      .then((car) => {
        if (car) {
          res.send({
            message: "Car was registered successfully!",
            results: car,
          });
          return;
        }
      })
      .catch((err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
      });
  } catch {
    res.status(500).send({ message: "Unhandled server error!" });
  }
};
// Handle index actions
exports.index = async function (req, res) {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder, filter } = req.query;

    let query = {};

    const filterArray = helpers.getFilterArray(filter);

    // Apply filtering if any
    if (filter) {
      filterArray.forEach((filter) => {
        query[filter.name] = { $regex: filter.value, $options: "i" };
      });
    }
    // Apply sorting if any
    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["date"] = 1;
    }

    const totalCars = await Car.countDocuments(query);
    const cars = await Car.aggregate(
      [
        { $match: query },
        { $sort: sortOptions },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
      ].concat(aggregations.carProjection)
    ).catch((err) => {
      return res
        .status(500)
        .json({ message: "Internal server error", description: err });
    });

    return res.json({
      status: "success",
      message: "Cars list retrieved successfully",
      count: totalCars,
      results: cars,
    });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Internal server error", description: error });
  }
};

// Handle list client by username
exports.getByCarPlate = function (req, res) {
  if (!req.params.plate.length) {
    return res.status(400).send({ message: "Input error" });
  }
  const plate = req.params.plate.toUpperCase();
  Car.find({ plate: plate })
    .then((cars) => {
      if (!cars.length)
        return res.status(404).send({ message: "Car not found" });

      let responseSent = false;

      cars[0].clients.forEach((client_id) => {
        if (String(client_id) === req.body.client_id) {
          responseSent = true;
          return res.status(200).send({
            message: "Car by car plate loading...",
            results: cars[0],
          });
        }
      });

      // Check if a response has already been sent
      if (!responseSent) {
        return res.status(403).json({
          message: "Unable to get car",
        });
      }
    })
    .catch((err) => {
      return res.status(500).send({ message: err });
    });
};

exports.getCarListByPlate = function (req, res) {
  try {
    if (!req.params.plate) {
      return res.status(400).send({ message: "Input error" });
    }

    const plate = req.params.plate.toUpperCase();
    const regex = new RegExp(plate);

    Car.aggregate([
      {
        $match: {
          plate: { $regex: regex },
        },
      },
    ])
      .then((cursor) => {
        return res.json({
          status: "success",
          message: "Cars list retrieved successfully",
          count: cursor.length,
          results: cursor,
        });
      })
      .catch((err) => {
        return res.status(500).send({ message: err });
      });
  } catch (err) {
    return res
      .status(500)
      .send({ message: "Internal server error", description: err });
  }
};

// Handle update car from id
exports.update = function (req, res) {
  Car.findById(req.params.car_id)
    .then((car) => {
      if (!car) res.status(404).send({ message: "Car not found" });

      // Iterate over the keys in the request body and update corresponding fields
      Object.keys(req.body).forEach((key) => {
        car[key] = req.body[key];
      });

      // save the car and check for errors
      car
        .save()
        .then((updatedCar) => {
          res.json({
            message: "Car updated",
            results: updatedCar,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .send({ message: err.message || "Error updating car" });
        });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message || "Error finding car" });
    });
};
// Handle delete car
exports.delete = function (req, res) {
  Car.deleteOne({
    _id: req.params.car_id,
  })
    .then((car) => {
      if (car) {
        return res.json({
          status: "success",
          message: "Car deleted successfully!",
        });
      }
      return res.status(400).send({ message: "Car not found!" });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

/* WARNING: This will delete all appointments, use only on dev environment */
exports.deleteAll = function (req, res) {
  Car.deleteMany({})
    .then(() => {
      res.json({
        status: "success",
        message: "All cars deleted, prepare yourself, I'm going to kill you.",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
