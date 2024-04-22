// clientController.js
// Import Models
const Appointment = require("../models/appointmentModel");
const User = require("../models/userModel");
const moment = require("moment");
const { appointmentProjection } = require("./aggregations");
const { helpers } = require("../utils/helpers");

exports.register = async (req, res) => {
  try {
    const formattedDate = moment(req.body.date, "DD/MM/YYYY", true).format(
      "DD/MM/YYYY"
    );
    if (
      !formattedDate ||
      !moment(formattedDate, "DD/MM/YYYY", true).isValid()
    ) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    const formattedTime = moment(req.body.time, "HH:mm", true).format("HH:mm");
    if (!formattedTime || !moment(formattedTime, "HH:mm", true).isValid()) {
      return res.status(400).json({ error: "Invalid time format." });
    }

    // Check if the selected time is available for users with a specific role
    const roles = "operator"; // Replace with your specific role
    const operatorUsers = await User.find({ roles });

    const busyUsers = await Appointment.find({
      date: { $regex: formattedDate },
      time: { $regex: formattedTime },
      user: { $in: operatorUsers.map((user) => user._id) },
    });

    let availableUserId = operatorUsers[0]
      ? operatorUsers[0]._id
      : req.body.user;
    if (busyUsers.length > 0) {
      // Find an available user with the specified role for that time
      const availableUser = operatorUsers.find(
        (user) => !busyUsers.some((busyUser) => busyUser.user.equals(user._id))
      );

      if (!availableUser) {
        return res.status(409).json({
          error: "No available operator users for the time slot.",
        });
      }

      // Assign the available user
      availableUserId = availableUser._id;
      req.body.user = availableUser._id;
    }

    const appointment = new Appointment({
      date: formattedDate,
      time: formattedTime,
      user: availableUserId,
      client: req.body.client,
      car: req.body.car,
    });

    let savedAppointment = {};
    await appointment.save().then((appointment) => {
      savedAppointment = appointment;
    });

    const cursor = await Appointment.aggregate(appointmentProjection);

    cursor.forEach((appointment) => {
      if (appointment._id.equals(savedAppointment._id)) {
        return res.send({
          message: "Appointment was registered successfully!",
          results: appointment,
        });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Unhandled server error" });
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
        if (filter.name === "client") {
          query["client.name"] = { $regex: filter.value, $options: "i" };
          return;
        }
        if (filter.name === "archived") {
          const archived = filter.value === "true" ? true : false;
          query[filter.name] = archived;
          return;
        }
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

    const totalAppointments = await Appointment.countDocuments(query);

    const appointments = await Appointment.aggregate([
      { $match: query },
      ...appointmentProjection,
      { $sort: sortOptions },
      { $skip: (page - 1) * limit },
      { $limit: parseInt(limit) },
    ]).catch((err) => {
      return res
        .status(500)
        .json({ message: "Internal server error", description: err });
    });

    return res.json({
      status: "success",
      message: "Appointments list retrieved successfully",
      count: totalAppointments,
      results: appointments,
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "An error occurred while fetching appointments.",
      error: error.message,
    });
  }
};

exports.update = function (req, res) {
  try {
    Appointment.findById(req.params.appointment_id)
      .then((client) => {
        if (!client) res.status(404).send({ message: "Appointment not found" });

        // Iterate over the keys in the request body and update corresponding fields
        Object.keys(req.body).forEach((key) => {
          client[key] = req.body[key];
        });

        // save the client and check for errors
        client
          .save()
          .then((updatedClient) => {
            res.json({
              message: "Appointment updated",
              results: updatedClient,
            });
          })
          .catch((err) => {
            res
              .status(500)
              .send({ message: err.message || "Error updating appointment" });
          });
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: err.message || "Error finding appointment" });
      });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

// Handle delete appointment
exports.delete = function (req, res) {
  Appointment.deleteOne({
    _id: req.params.appointment_id,
  })
    .then(() => {
      res.json({
        status: "success",
        message: "Appointment deleted",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

exports.getUnavailableTimes = function (req, res) {
  const date = req.body.date;

  // Step 1: Fetch operator users
  User.find({ roles: "operator" })
    .then((users) => {
      // Step 2: Create a function to find overlapping appointments for each operator
      const findOverlappingAppointments = (userId) => {
        return appointments.filter(
          (appointment) => appointment.user.toString() === userId.toString()
        );
      };

      // Step 3: Find the common unavailable times when all operators are busy
      const promises = users.map((user) => {
        return Appointment.find({ date, user: user._id });
      });

      return Promise.all(promises).then((results) => {
        let commonUnavailableTimes = [];

        if (results.length > 0) {
          commonUnavailableTimes = results[0].map(
            (appointment) => appointment.time
          );

          for (let i = 1; i < results.length; i++) {
            commonUnavailableTimes = commonUnavailableTimes.filter((time) =>
              results[i].some((app) => app.time === time)
            );
          }
        }

        // Step 4: Return the response with the unavailable times
        return res.status(200).json({
          message: "Unavailable times",
          results: commonUnavailableTimes,
        });
      });
    })
    .catch((error) => {
      console.error("Error:", error);
      return res.status(500).json({ message: "Internal Server Error", error });
    });
};
// Handle delete appointment
exports.deleteAll = function (req, res) {
  Appointment.deleteMany({})
    .then(() => {
      res.json({
        status: "success",
        message: "All appointments deleted",
      });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};
