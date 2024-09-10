const express = require("express");
const { authJwt } = require("../middlewares");
const jobOrderController = require("../controllers/jobOrderController");

const router = express.Router();

router.get(
  "/operations/job-orders",
  [authJwt.verifyToken],
  jobOrderController.index
);

router.get(
  "/operations/job-orders/:material_id",
  [authJwt.verifyToken],
  jobOrderController.get
);
router.post(
  "/register-job-order",
  [authJwt.verifyToken],
  jobOrderController.register
);
router.put(
  "/operations/update/job-orders/:material_id",
  [authJwt.verifyToken],
  jobOrderController.update
);
router.put(
  "/operations/job-orders/:material_id/add-materials",
  [authJwt.verifyToken],
  jobOrderController.addConsumedMaterials
);
router.delete(
  "/operations/delete/job-orders/:material_id",
  [authJwt.verifyToken],
  jobOrderController.delete
);

module.exports = router;
