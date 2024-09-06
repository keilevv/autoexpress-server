ConsumptionMaterial = require("../models/consumptionMaterialModel");
StorageMaterial = require("../models/storageMaterialModel");

// Users
checkStorageMatererialByReference = (req, res, next) => {
  if (req.body.reference) {
    req.body.reference = req.body.reference;
    if (typeof req.body.reference !== "string") {
      res.status(400).send({
        message: "Formato de referencia inválido",
      });
    }
    StorageMaterial.findOne({
      reference: req.body.reference,
    })
      .then((storageMaterial) => {
        if (storageMaterial) {
          res.status(400).send({
            message: "Material con misma referencia existente",
            code: "duplicate_storage_material_reference",
          });
          return "hello";
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

const verifyMaterial = {
  checkStorageMatererialByReference,
};
module.exports = verifyMaterial;
