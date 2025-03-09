JobOrder = require("../models/jobOrderModel");

// Users
checkJobOrder = (req, res, next) => {
  if (req.body.number) {
    req.body.number = req.body.number;
    if (typeof req.body.number !== "string") {
      res.status(400).send({
        message: "Formato de referencia inválido",
      });
    }
    JobOrder.findOne({
      number: req.body.number,
    })
      .then((storageMaterial) => {
        if (storageMaterial) {
          return res.status(400).send({
            message: "O.T. Existente",
            code: "duplicate_job_order_number",
          });
        }
        next();
      })
      .catch((err) => {
        if (err) {
          res.status(500).send({ message: err });
          return;
        }
      });
  } else {
    next();
  }
};

const verifyJobOrder = {
  checkJobOrder,
};
module.exports = verifyJobOrder;
