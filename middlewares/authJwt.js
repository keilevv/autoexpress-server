const jwt = require("jsonwebtoken");
const config = require("../config/index");
const User = require("../models/userModel");
const Role = require("../models/roleModel");

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }
  jwt.verify(token, config.serverConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized!" });
    }
    req.userId = decoded.id;
    next();
  });
};

const isAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    if (user.roles.includes("admin")) {
      next();
      return;
    }

    res.status(403).send({ message: "Require Admin Role!" });
  } catch (err) {
    res.status(500).send({ message: err.message || err });
  }
};

const isModerator = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      return res.status(404).send({ message: "User not found." });
    }

    // Based on userModel, roles is a string. If it's a comma separated string or array-like:
    // This logic follows the previous one which used user.roles.includes
    if (user.roles.includes("moderator")) {
      next();
      return;
    }

    // Role model check (from original code, though userModel suggests roles are embedded)
    const roles = await Role.find({
      _id: { $in: user.roles }, // Adjusted from user.role to user.roles
    }).exec();

    for (let i = 0; i < roles.length; i++) {
      if (roles[i].name === "moderator") {
        next();
        return;
      }
    }

    res.status(403).send({ message: "Require Moderator Role!" });
  } catch (err) {
    res.status(500).send({ message: err.message || err });
  }
};

const authJwt = {
  verifyToken,
  isAdmin,
  isModerator,
};
module.exports = authJwt;
