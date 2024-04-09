const express = require("express");
const { authJwt, verifyRegister } = require("../middlewares");
const controller = require("../controllers/carController");
const router = express.Router();

router.get("/operations", [authJwt.verifyToken], controller.index);
router.post("/api/car/plate/:plate", controller.getByCarPlate);
router.get(
  "/api/cars/operations/plate/:plate",
  [authJwt.verifyToken],
  controller.getCarListByPlate
);

router.post(
  "/api/cars/register",
  [verifyRegister.checkCarPlateOrVin],
  controller.register
);
router.put("/api/cars/update/:car_id", controller.update);
router.delete(
  "/api/cars/delete/:car_id",
  [authJwt.verifyToken],
  controller.delete
);
/*WARNING: This will delete all appointments, use only on dev environment */
router.delete(
  "/api/cars/delete-all",
  [authJwt.verifyToken],
  controller.deleteAll
);

module.exports = router;
