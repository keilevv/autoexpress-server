User = require("../models/userModel");
const mongoose = require("mongoose");
const { userProjection } = require("./aggregations");

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
  User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.params.user_id),
      },
    },
    ...userProjection,
  ])
    .then((cursor) => {
      if (cursor) {
        return res.json({
          status: "success",
          message: "User retrieved successfully",
          results: cursor[0],
        });
      }
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
exports.update = function (req, res) {
  User.findById(req.params.user_id)
    .then((user) => {
      if (!user) res.status(404).send({ message: "User not found" });

      // Iterate over the keys in the request body and update corresponding fields
      Object.keys(req.body).forEach((key) => {
        user[key] = req.body[key];
      });

      // save the user and check for errors
      user
        .save()
        .then((updatedUser) => {
          res.json({
            message: "User updated",
            results: updatedUser,
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
