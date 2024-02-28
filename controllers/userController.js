User = require("../models/userModel");

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
  User.findById(req.params.user_id, "-password")
    .then((user) => {
      if (user) {
        res.json({
          message: "User details loading..",
          results: user,
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
      user.username = req.body.username;
      user.password = req.body.password;
      user.email = req.body.email;
      user.role = req.body.role;
      user.birthday = req.body.birthday;
      // save the user and check for errors
      user.save(function (err) {
        if (err) res.json(err);
        res.json({
          message: "User updated",
          results: user,
        });
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
