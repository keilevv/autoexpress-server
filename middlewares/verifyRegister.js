User = require("../models/userModel");
Client = require("../models/clientModel");
Car = require("../models/carModel");

// Users
checkDuplicateUsernameOrEmail = (req, res, next) => {
  User.findOne({
    username: req.body.username,
  })
    .then((user) => {
      if (user) {
        res.status(400).send({
          message: "Error, usuario duplicado!",
          code: "duplicate_username",
        });
        return;
      }
      // Email
      User.findOne({
        email: req.body.email,
      })
        .then(() => {
          if (user) {
            res.status(400).send({
              message: "Error, email en uso!",
              code: "duplicate_email",
            });
            return;
          }
          next();
        })
        .catch((err) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
        });
    })
    .catch((err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
    });
};

checkRolesExisted = (req, res, next) => {
  if (req.body.roles) {
    for (let i = 0; i < req.body.roles.length; i++) {
      if (!ROLES.includes(req.body.roles[i])) {
        res.status(400).send({
          message: `Failed! Role ${req.body.roles[i]} does not exist!`,
        });
        return;
      }
    }
  }
  next();
};

// Clients

checkCountryIdOrTelephoneNumber = (req, res, next) => {
  // country_id
  Client.findOne({
    country_id: req.body.country_id,
  })
    .then((client) => {
      if (client) {
        res.status(400).send({
          message: "Error, cédula en uso!",
          code: "duplicate_country_id",
        });
        return;
      }
      // Email
      Client.findOne({
        telephone_number: req.body.telephone_number,
      })
        .then((client) => {
          if (client) {
            res.status(400).send({
              message: "Error, teléfono en uso!",
              code: "duplicate_telephone_number",
            });
            return;
          }
          next();
        })
        .catch((err) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
        });
    })
    .catch((err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
    });
};

checkCarPlateOrVin = (req, res, next) => {
  Car.findOne({
    plate: req.body.plate,
  })
    .then((car) => {
      if (car) {
        res
          .status(400)
          .send({ message: "Error, placa en uso!", code: "duplicate_plate" });
        return;
      }
      Car.findOne({ vin: req.body.vin })
        .then((car) => {
          if (car) {
            res
              .status(400)
              .send({ message: "Error, vin en uso!", code: "duplicate_vin" });
            return;
          }
          next();
        })
        .catch((err) => {
          if (err) {
            res.status(500).send({ message: err });
            return;
          }
        });
    })
    .catch((err) => {
      if (err) {
        res.status(500).send({ message: err });
        return;
      }
    });
};

const verifyRegister = {
  checkDuplicateUsernameOrEmail,
  checkRolesExisted,
  checkCountryIdOrTelephoneNumber,
  checkCarPlateOrVin,
};
module.exports = verifyRegister;
