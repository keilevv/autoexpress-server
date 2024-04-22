const express = require("express");
const { authJwt, verifyRegister } = require("../middlewares");
const controller = require("../controllers/carController");
const router = express.Router();

router.get("/operations", [authJwt.verifyToken], controller.index);
router.get("/operations/:car_id", [authJwt.verifyToken], controller.get);
router.post("/plate/:plate", controller.getByCarPlate);
router.get(
  "/operations/plate/:plate",
  [authJwt.verifyToken],
  controller.getCarListByPlate
);

router.post(
  "/register",
  [verifyRegister.checkCarPlateOrVin],
  controller.register
);
router.put("/update/:car_id", controller.update);
router.delete("/delete/:car_id", [authJwt.verifyToken], controller.delete);
/*WARNING: This will delete all appointments, use only on dev environment */
router.delete("/delete-all", [authJwt.verifyToken], controller.deleteAll);

module.exports = router;
