// clientController.js
// Import Models
const moment = require("moment");
Car = require("../models/carModel");
Employee = require("../models/employeeModel");

const { helpers } = require("../utils/helpers");
const mongoose = require("mongoose");

exports.register = async (req, res) => {
  try {
    const employee = await new Employee({
      name: req.body.name,
      roles: req.body.roles,
      owner: req.body.owner ? req.body.owner : "autoexpresss",
    });
    employee
      .save()
      .then((employee) => {
        if (employee) {
          res.send({
            message: "Employee was registered successfully!",
            results: employee,
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
    const { page = 1, limit = 10, sortBy, sortOrder, ...filter } = req.query;
    let query = {};

    const filterArray = helpers.getFilterArray(filter);
    // Apply filtering if any
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
            query["created_date"] = dateFilter;
            break;
          case "full_name":
            query["$or"] = [
              { name: { $regex: filterItem.value, $options: "i" } },
              { surname: { $regex: filterItem.value, $options: "i" } },
              { lastname: { $regex: filterItem.value, $options: "i" } },
              { email: { $regex: filterItem.value, $options: "i" } },
            ];
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

    // Apply sorting if any
    let sortOptions = {};
    if (sortBy && sortOrder) {
      sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;
    } else {
      sortOptions["date"] = 1;
    }
    sortOptions["_id"] = 1;

    const totalEmployees = await Employee.countDocuments(query);

    const clients = await Employee.aggregate([
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
      message: "Employees list retrieved successfully",
      count: totalEmployees,
      results: clients,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};

// Handle view employee info
exports.get = function (req, res) {
  const employeeId = new mongoose.Types.ObjectId(req.params.employee_id);
  if (!employeeId) {
    return res.status(400).send({ message: "Invalid employee id" });
  }

  Employee.aggregate([
    {
      $match: {
        _id: employeeId,
      },
    },
  ])
    .then((cursor) => {
      if (!cursor || !cursor.length) {
        return res.status(404).send({ message: "Employee not found" });
      }
      return res.json({
        status: "success",
        message: "Employee retrieved successfully",
        results: cursor[0],
      });
    })
    .catch((error) => {
      return res
        .status(500)
        .send({ message: "Internal server error", description: error });
    });
};

// Handle list employee by username
exports.getByName = function (req, res) {
  Employee.find({ name: req.body.name }, function (err, employee) {
    if (err) res.send(err);
    res.json({
      message: "Employee by name loading...",
      results: employee,
    });
  });
};

// Handle update car from id
exports.update = function (req, res) {
  try {
    Employee.findById(req.params.employee_id)
      .then((employee) => {
        if (!employee) res.status(404).send({ message: "Employee not found" });

        // Iterate over the keys in the request body and update corresponding fields
        Object.keys(req.body).forEach((key) => {
          employee[key] = req.body[key];
        });

        // save the employee and check for errors
        employee
          .save()
          .then((updatedEmployee) => {
            res.json({
              message: "Employee updated",
              results: updatedEmployee,
            });
          })
          .catch((err) => {
            res
              .status(500)
              .send({ message: err.message || "Error updating employee" });
          });
      })
      .catch((err) => {
        res
          .status(500)
          .send({ message: err.message || "Error finding employee" });
      });
  } catch (err) {
    return res
      .status(500)
      .json({ message: "Internal server error", description: err });
  }
};
// Handle delete employee
exports.delete = function (req, res) {
  Employee.deleteOne({
    _id: req.params.employee_id,
  })
    .then((car) => {
      if (car) {
        return res.json({
          status: "success",
          message: "Employee deleted successfully!",
        });
      }
      return res.status(400).send({ message: "Employee not found!" });
    })
    .catch((err) => {
      if (err) res.status(500).send({ message: err });
    });
};

// /* WARNING: This will delete all employees, use only on dev environment */
// exports.deleteAll = function (req, res) {
//   Employee.deleteMany({})
//     .then(() => {
//       res.json({
//         status: "success",
//         message:
//           "All clients deleted, prepare yourself, I'm going to kill you.",
//       });
//     })
//     .catch((err) => {
//       if (err) res.status(500).send({ message: err });
//     });
// };
