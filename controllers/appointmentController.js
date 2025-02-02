// clientController.js
// Import Models
const Appointment = require("../models/appointmentModel");
const Client = require("../models/clientModel");
const User = require("../models/userModel");
const moment = require("moment");
const { appointmentProjection } = require("./aggregations");
const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");

exports.register = async (req, res) => {
  try {
    // Parse and validate the date
    const formattedDate = moment(req.body.date, "DD/MM/YYYY");
    if (!formattedDate.isValid()) {
      return res.status(400).json({ error: "Invalid date format." });
    }

    // Parse and validate the time
    const formattedTime = moment(req.body.time, "HH:mm");
    if (!formattedTime.isValid()) {
      return res.status(400).json({ error: "Invalid time format." });
    }

    // Convert formatted date and time to Date object
    const date = formattedDate.toDate();
    const time = formattedTime.format("HH:mm");

    // Check if the selected time is available for users with a specific role
    const roles = "operator"; // Replace with your specific role
    const operatorUsers = await User.find({ roles });

    if (!operatorUsers.length) {
      return res.status(404).json({ error: "No operators found." });
    }

    // Query to find busy users at the specified date and time
    const busyUsers = await Appointment.find({
      date: date,
      time: time,
      user: { $in: operatorUsers.map((user) => user._id) },
    });

    let availableUserId = operatorUsers[0]._id;
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
      date: date,
      time: time,
      user: availableUserId,
      client: req.body.client,
      car: req.body.car,
    });

    const savedAppointment = await appointment.save();

    return res.status(201).json({
      message: "Appointment was registered successfully!",
      results: savedAppointment,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Unhandled server error", error: error.message });
  }
};
// Handle index actions

exports.index = async function (req, res) {
  try {
    const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;

    let query = {};

    const filterArray = helpers.getFilterArray(filter);
    if (filter) {
      filterArray.forEach((filterItem) => {
        switch (filterItem.name) {
          case "archived":
            const archived = filterItem.value === "true" ? true : false;
            query[filterItem.name] = archived;
            break;
          case "start_date":
          case "end_date":
            // Parse and add date filter to the query
            const dateFilter = {};
            if (req.query.start_date)
              dateFilter["$gte"] = new Date(req.query.start_date);
            if (req.query.end_date)
              dateFilter["$lte"] = new Date(req.query.end_date);
            query["date"] = dateFilter;
            break;
          case "full_name":
            if (filterItem.value) {
              query["$or"] = [
                { "client.name": { $regex: filterItem.value, $options: "i" } },
                {
                  "client.surname": { $regex: filterItem.value, $options: "i" },
                },
                {
                  "client.lastname": {
                    $regex: filterItem.value,
                    $options: "i",
                  },
                },
                { "client.email": { $regex: filterItem.value, $options: "i" } },
              ];
            }
            break;
          default:
            query[filterItem.name] = {
              $regex: filterItem.value,
              $options: "i",
            };
            break;
        }
      });
    }

    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["date"] = 1;
    }
    sortOptions["_id"] = 1;

    const totalAppointments = await Appointment.countDocuments(query);

    const appointments = await Appointment.aggregate([
      ...appointmentProjection,
      { $match: query },
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

exports.get = function (req, res) {
  const appointmentId = new mongoose.Types.ObjectId(req.params.appointment_id);
  if (!appointmentId) {
    return res.status(400).send({ message: "Invalid appoointment id" });
  }

  Appointment.aggregate(
    [
      {
        $match: {
          _id: appointmentId,
        },
      },
    ].concat(appointmentProjection)
  )
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "Appointment not found" });
      }
      return res.json({
        status: "success",
        message: "Appointment retrieved successfully",
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
  const date = moment(req.body.date, "DD/MM/YYYY");

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
