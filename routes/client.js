const express = require("express");
const { authJwt, verifyRegister } = require("../middlewares");
const router = express.Router();
const controller = require("../controllers/clientController");

router.get("/operations", [authJwt.verifyToken], controller.index);
router.get("/operations/:client_id", [authJwt.verifyToken], controller.get);
router.get(
  "/operations/name/:full_name",
  [authJwt.verifyToken],
  controller.getClientListByName
);

router.post(
  "/register",
  [verifyRegister.checkCountryIdOrTelephoneNumber],
  controller.register
);
router.put("/update/:client_id", controller.update);
router.delete(
  "/operations/delete/:client_id",
  [authJwt.verifyToken],
  controller.delete
);
/*WARNING: This will delete all appointments, use only on dev environment */
router.delete("/delete-all", [authJwt.verifyToken], controller.deleteAll);
router.get("/operations/:client_id", [authJwt.verifyToken], controller.get);
router.get(
  "/country-id/:country_id",
  [verifyRegister.checkCountryIdOrTelephoneNumber],
  controller.getByContryId
);

// router.get(
//   "/api/client",
//   [authJwt.verifyToken, authJwt.isModerator],
//   controller.get
// );

module.exports = router;
