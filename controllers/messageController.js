const mongoose = require("mongoose");
Message = require("../models/messageModel");
const regex = require("../utils/regex");
const { helpers } = require("../utils/helpers");

exports.register = async (req, res) => {
  if (!regex.commonRegex.email.test(req.body.email)) {
    return res.status(400).json({ error: "Invalid email format." });
  }

  if (!regex.commonRegex.telephone_number.test(req.body.telephone_number)) {
    return res.status(400).json({ error: "Invalid telephone number format." });
  }

  try {
    const message = await new Message({
      name: req.body.name,
      email: req.body.email,
      telephone_number: req.body.telephone_number,
      message: req.body.message,
    });
    message
      .save()
      .then((message) => {
        if (message) {
          res.send({
            message: "Message was registered successfully!",
            results: message,
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
    const { page = 1, limit = 10, sortBy, sortOrder, filter = "" } = req.query;
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
    sortOptions["_id"] = 1;
    
    const totalMessages = await Message.countDocuments(query);

    const messages = await Message.aggregate([
      { $match: query },
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
    ]).catch((err) => {
      console.log("error", err);
      return res
        .status(500)
        .json({ message: "Internal server error", description: err });
    });

    return res.json({
      status: "success",
      message: "Messages list retrieved successfully",
      count: totalMessages,
      results: messages,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

exports.get = function (req, res) {
  const messageId = new mongoose.Types.ObjectId(req.params.message_id);
  if (!messageId) {
    return res.status(400).send({ message: "Invalid message id" });
  }

  Message.aggregate([
    {
      $match: {
        _id: messageId,
      },
    },
  ])
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "Message not found" });
      }
      return res.json({
        status: "success",
        message: "Message retrieved successfully",
        results: cursor[0],
      });
    })
    .catch((error) => {
      return res
        .status(500)
        .send({ message: "Internal server error", description: error });
    });
};

exports.update = function (req, res) {
  try {
    Message.findById(req.params.message_id)
      .then((message) => {
        if (!message) res.status(404).send({ message: "Message not found" });

        Object.keys(req.body).forEach((key) => {
          message[key] = req.body[key];
        });

        message
          .save()
          .then((updatedMessage) => {
            res.json({
              message: "Message updated",
              results: updatedMessage,
            });
          })
          .catch((err) => {
            res
              .status(500)
              .send({ message: err.message || "Error updating message" });
          });
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: err.message || "Error finding message" });
      });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

// Handle delete message
exports.delete = function (req, res) {
  Message.deleteOne({
    _id: req.params.message_id,
  })
    .then(() => {
      res.json({
        status: "success",
        message: "Message deleted",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
