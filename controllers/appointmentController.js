// clientController.js
// Import Models
const Appointment = require("../models/appointmentModel");
const moment = require("moment");
const { appointmentProjection } = require("./aggregations");

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
      req.body.user = availableUser._id;
    }

    const appointment = new Appointment({
      date: formattedDate,
      time: formattedTime,
      user: req.body.user,
      client: req.body.client,
      car: req.body.car,
    });

    await appointment.save();

    const cursor = await Appointment.aggregate(appointmentProjection);

    return res.send({
      message: "Appointment was registered successfully!",
      results: cursor,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unhandled server error" });
  }
};

// Handle index actions
exports.index = function (req, res) {
  Appointment.find({}).then((response) => {
    Appointment.aggregate(appointmentProjection).then((cursor) => {
      return res.json({
        status: "success",
        message: "Appointments list retrieved successfully",
        results: cursor,
        count: cursor.length,
      });
    });
  });
};

exports.update = function (req, res) {
  try {
    const appointmentId = req.params.appointment_id;
    Appointment.findById(appointmentId)
      .then((appointment) => {
        const { date, time } = req.body;
        const formattedDate = date
          ? moment(date, "DD/MM/YYYY", true).format("DD/MM/YYYY")
          : appointment.date;
        if (
          !formattedDate ||
          !moment(formattedDate, "DD/MM/YYYY", true).isValid()
        ) {
          return res.status(400).json({ error: "Invalid date format." });
        }
        // Validate and format the time
        const formattedTime = time
          ? moment(time, "HH:mm", true).format("HH:mm")
          : appointment.time;

        if (!formattedTime || !moment(formattedTime, "HH:mm", true).isValid()) {
          return res.status(400).json({ error: "Invalid time format." });
        }
        // Find and update the appointment by ID
        Appointment.findByIdAndUpdate(
          appointmentId,
          {
            $set: {
              date: formattedDate,
              time: formattedTime,
              client: req.body.client ? req.body.client : appointment.client,
              user: req.body.user ? req.body.user : appointment.user,
            },
          },
          { new: true } // Return the updated document
        )
          .then((updatedAppointment) => {
            res.status(200).json({
              message: "Appointment updated successfully!",
              results: updatedAppointment,
            });
          })
          .catch((err) => {
            return res
              .status(500)
              .json({ message: "Internal server error", error: err });
          });
      })
      .catch((err) => {
        return res.status(404).json({ error: "Appointment not found." });
      });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
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
