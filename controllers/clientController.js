// clientController.js
// Import Models
const moment = require("moment");
Car = require("../models/carModel");
Client = require("../models/clientModel");
const helpers = require("../utils/helpers");

exports.register = async (req, res) => {
  const formattedBirthday = moment(
    req.body.birthday,
    "DD/MM/YYYY",
    true
  ).format("DD/MM/YYYY");
  if (
    !formattedBirthday ||
    !moment(formattedBirthday, "DD/MM/YYYY", true).isValid()
  ) {
    return res.status(400).json({ error: "Invalid birthday format." });
  }

  if (!helpers.commonRegex.country_id.test(req.body.country_id)) {
    return res.status(400).json({ error: "Invalid country_id format." });
  }

  if (!helpers.commonRegex.email.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }
  console.log("formatted", formattedBirthday)
  try {
    const client = await new Client({
      name: req.body.name,
      surname: req.body.surname,
      lastname: req.body.lastname,
      email: req.body.email,
      telephone_number: req.body.telephone_number,
      birthday: formattedBirthday,
      country_id: req.body.country_id,
    });
    client
      .save()
      .then((client) => {
        if (client) {
          res.send({
            message: "Client was registered successfully!",
            results: client,
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
    res.send({ message: "Unhandled error!" });
  }
};
// Handle index actions
exports.index = function (req, res) {
  Client.find({}).then((response) => {
    Client.aggregate([
      {
        $lookup: {
          from: "cars",
          localField: "cars",
          foreignField: "_id",
          as: "cars",
        },
      },
    ]).then((cursor) => {
      return res.json({
        status: "success",
        message: "Clients list retrieved successfully",
        results: cursor,
      });
    });
  });
};

// Handle view client client
exports.get = function (req, res) {
  Client.findById(req.params.user_id, function (err, client) {
    if (err) res.send(err);
    res.json({
      message: "Client details loading..",
      results: client,
    });
  });
};

// Handle list client by username
exports.getByName = function (req, res) {
  Client.find({ name: req.body.name }, function (err, client) {
    if (err) res.send(err);
    res.json({
      message: "Client by name loading...",
      results: client,
    });
  });
};
// Handle update client client
// Handle update car from id
exports.update = function (req, res) {
  Client.findById(req.params.client_id)
    .then((client) => {
      if (!client) res.status(404).send({ message: "Client not found" });

      // Iterate over the keys in the request body and update corresponding fields
      Object.keys(req.body).forEach((key) => {
        client[key] = req.body[key];
      });

      // save the client and check for errors
      client
        .save()
        .then((updatedClient) => {
          res.json({
            message: "Client updated",
            results: updatedClient,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .send({ message: err.message || "Error updating client" });
        });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message || "Error finding client" });
    });
};
// Handle delete client
exports.delete = function (req, res) {
  Client.deleteOne({
    _id: req.params.client_id,
  })
    .then((car) => {
      if (car) {
        return res.json({
          status: "success",
          message: "Client deleted successfully!",
        });
      }
      return res.status(400).send({ message: "Client not found!" });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
