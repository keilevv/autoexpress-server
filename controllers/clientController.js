// clientController.js
// Import Models
const moment = require("moment");
Car = require("../models/carModel");
Client = require("../models/clientModel");
const regex = require("../utils/regex");
const aggregations = require("./aggregations");
const { helpers } = require("../utils/helpers");

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

  if (!regex.commonRegex.country_id.test(req.body.country_id)) {
    return res.status(400).json({ error: "Invalid country_id format." });
  }

  if (!regex.commonRegex.email.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }
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
exports.index = async function (req, res) {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;
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

    const totalClients = await Client.countDocuments(query);

    const clients = await Client.aggregate(
      [
        { $match: query },
        { $sort: sortOptions },
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) },
      ].concat(aggregations.clientProjection)
    ).catch((err) => {
      return res
        .status(500)
        .json({ message: "Internal server error", description: err });
    });

    return res.json({
      status: "success",
      message: "Clients list retrieved successfully",
      count: totalClients,
      results: clients,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

// Handle view client info
exports.get = function (req, res) {
  Client.findById(req.params.client_id)
    .then((client) => {
      if (!client) return res.status(404).send({ message: "Client not found" });
      return res.json({
        message: "Client by id loading...",
        results: client,
      });
    })
    .catch((err) => {
      return res.status(500).send({ message: err });
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

exports.getClientListByName = function (req, res) {
  if (!req.params.full_name) {
    return res.status(400).send({ message: "Input error" });
  }

  const full_name = req.params.full_name.toUpperCase();
  const regex = new RegExp(full_name);

  Client.aggregate([
    {
      $match: {
        name: { $regex: regex },
        surname: { $regex: regex },
        lastname: { $regex: regex },
      },
    },
    {
      $lookup: {
        from: "cars",
        localField: "cars",
        foreignField: "_id",
        as: "cars",
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
};

// Handle list client by username
exports.getByContryId = function (req, res) {
  Client.find({ country_id: req.params.country_id })
    .then((clients) => {
      if (!clients.length)
        return res.status(404).send({ message: "Client not found" });
      return res.json({
        message: "Client by country_id loading...",
        results: clients[0],
      });
    })
    .catch((err) => {
      return res.status(500).send({ message: err });
    });
};

// Handle update client client
// Handle update car from id
exports.update = function (req, res) {
  try {
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
        res
          .status(500)
          .send({ message: err.message || "Error finding client" });
      });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
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

/* WARNING: This will delete all appointments, use only on dev environment */
exports.deleteAll = function (req, res) {
  Client.deleteMany({})
    .then(() => {
      res.json({
        status: "success",
        message:
          "All clients deleted, prepare yourself, I'm going to kill you.",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
