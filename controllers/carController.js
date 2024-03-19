// clientController.js
// Import Models
Car = require("../models/carModel");
Client = require("../models/clientModel");
const helpers = require("../utils/helpers");

exports.register = (req, res) => {
  if (!helpers.commonRegex.vin.test(req.body.vin)) {
    return res.status(400).json({ error: "Invalid vin format." });
  }
  if (!helpers.commonRegex.carPlate.test(req.body.plate)) {
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
exports.index = function (req, res) {
  Car.find({}).then((response) => {
    Car.aggregate([
      {
        $lookup: {
          from: "clients",
          localField: "clients",
          foreignField: "_id",
          as: "clients",
        },
      },
    ]).then((cursor) => {
      return res.json({
        status: "success",
        message: "Cars list retrieved successfully",
        results: cursor,
      });
    });
  });
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
  if (!req.params.plate.length) {
    return res.status(400).send({ message: "Input error" });
  }
  const plate = req.params.plate.toUpperCase();
  const regex = new RegExp(plate, "i"); // "i" flag for case-insensitive search

  Car.find({ plate: { $regex: regex } })
    .then((cars) => {
      Car.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "clients",
            foreignField: "_id",
            as: "clients",
          },
        },
      ]).then((cursor) => {
        return res.json({
          status: "success",
          message: "Cars list retrieved successfully",
          results: cursor,
        });
      });
    })
    .catch((err) => {
      return res.status(500).send({ message: err });
    });
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
