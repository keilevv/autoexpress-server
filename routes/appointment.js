const express = require("express");
const { authJwt } = require("../middlewares");
const controller = require("../controllers/appointmentController");
const router = express.Router();

router.get("/agenda", [authJwt.verifyToken], controller.index);
router.post("/check", controller.getUnavailableTimes);
router.post("/register", controller.register);
router.delete(
  "/delete/:appointment_id",
  [authJwt.verifyToken],
  controller.delete
);
router.put("/update/:appointment_id", [authJwt.verifyToken], controller.update);
router.delete("/delete-all", [authJwt.verifyToken], controller.deleteAll);

module.exports = router;
