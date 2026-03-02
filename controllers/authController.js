// userController.js
const config = require("../config");

// Import Models
User = require("../models/userModel");
Role = require("../models/roleModel");

var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");

exports.register = (req, res) => {
  try {
    const user = new User({
      username: req.body.username,
      email: req.body.email,
      password: bcrypt.hashSync(req.body.password, 8),
      roles: req.body.roles,
    });
    user
      .save()
      .then((user) => {
        user
          .save()
          .then((response) => {
            res.send({ message: "User was registered successfully!" });
            return;
          })
          .catch((err) => {
            res.status(500).send({ message: err });
            return;
          });
      })
      .catch((err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
      });
  } catch (error) {
    res.status(500).send({ message: error });
    return;
  }
};

exports.login = (req, res) => {
  const user = req.user;

  if (!user) {
    return res.status(401).send({ message: "Authentication failed" });
  }

  req.id = user._id;

  var token = jwt.sign({ id: user.id }, config.serverConfig.secret, {
    expiresIn: 86400, // 24 hours
  });

  var refreshToken = jwt.sign(
    { id: user.id, type: "refresh" },
    config.serverConfig.secret,
    {
      expiresIn: 604800, // 7 days
    },
  );

  res.status(200).send({
    id: user._id,
    username: user.username,
    email: user.email,
    roles: user.roles,
    accessToken: token,
    refreshToken: refreshToken,
    signature: user.signature,
  });
};

exports.makeAuth = async (req, res) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).send({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(authHeader, config.serverConfig.secret);
    req.id = decoded.id;

    const userId = req.params.userId || decoded.id;

    if (userId && userId.toString() !== decoded.id.toString()) {
      return res.status(401).send({ message: "Invalid token for user" });
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).send({ message: "User Not found." });
    }

    const accessToken = jwt.sign({ id: user.id }, config.serverConfig.secret, {
      expiresIn: 86400, // 24 hours
    });

    const refreshToken = jwt.sign(
      { id: user.id, type: "refresh" },
      config.serverConfig.secret,
      {
        expiresIn: 30000, // 7 days
      },
    );

    return res.status(200).send({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        signature: user.signature,
      },
      accessToken: accessToken,
      refreshToken: refreshToken,
    });
  } catch (err) {
    return res.status(401).send({ message: "Unauthorized" });
  }
};
