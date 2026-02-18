User = require("../models/userModel");
const { R2Service } = require("../utils/r2Service");
const crypto = require("crypto");

exports.index = function (req, res) {
  User.find({}).then((users) => {
    User.aggregate([
      {
        $project: {
          _id: 1,
          username: 1,
          email: 1,
          roles: 1,
          created_date: 1,
          signature: 1,
        },
      },
    ]).then((cursor) => {
      return res.json({
        status: "success",
        message: "Users list retrieved successfully",
        count: cursor.length,
        results: cursor,
      });
    });
  });
};

// Handle delete service
exports.delete = function (req, res) {
  User.deleteOne({
    _id: req.params.user_id,
  })
    .then(() => {
      res.json({
        status: "success",
        message: "User deleted",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

// Handle view user user
exports.get = function (req, res) {
  User.findById(req.params.user_id)
    .select("_id created_date username email roles archived")
    .lean()
    .then((user) => {
      if (!user) {
        return res.status(404).send({ message: "User not found" });
      }

      return res.json({
        status: "success",
        message: "User retrieved successfully",
        results: user,
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

// Handle list user by username
exports.getByName = function (req, res) {
  User.find({ username: { $regex: req.params.name, $options: "i" } })
    .then((user) => {
      res.json({
        message: "Users by name loading...",
        results: user,
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
// Handle update user user
exports.update = async function (req, res) {
  User.findById(req.params.user_id)
    .then(async (user) => {
      if (!user) res.status(404).send({ message: "User not found" });

      // Process updates asynchronously
      const updateTasks = Object.keys(req.body).map(async (key) => {
        if (key === "signature") {
          const imageKey = R2Service.generateImageKey(
            user.username + "_signature",
            crypto.randomUUID().replace(/-/g, "").substring(0, 8),
            ".png",
          );
          const result = await R2Service.uploadBase64(
            req.body[key],
            imageKey,
            "image/png",
          );
          if (result.success) {
            user.signature = result.url;
          } else {
            console.error("Signature upload failed:", result.error);
          }
        } else {
          user[key] = req.body[key];
        }
      });

      await Promise.all(updateTasks);

      // save the user and check for errors
      user
        .save()
        .then((updatedUser) => {
          const user = updatedUser;
          user.id = updatedUser._id;
          delete user._id;
          delete user.password;
          res.json({
            message: "User updated",
            results: user,
          });
        })
        .catch((err) => {
          res
            .status(500)
            .send({ message: err.message || "Error updating user" });
        });
    })
    .catch((err) => {
      res.status(500).send({ message: err.message || "Error finding user" });
    });
};
