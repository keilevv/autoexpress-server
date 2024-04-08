const express = require("express");
const { authJwt, verifyRegister } = require("../middlewares");
const router = express.Router();
const controller = require("../controllers/clientController");

router.get("/", [authJwt.verifyToken], controller.index);
router.get(
  "/name/:full_name",
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
  "/delete/:client_id",
  [authJwt.verifyToken],
  controller.delete
);
/*WARNING: This will delete all appointments, use only on dev environment */
router.delete(
  "/delete-all",
  [authJwt.verifyToken],
  controller.deleteAll
);
router.get(
  "/:client_id",
  [authJwt.verifyToken, authJwt.isModerator],
  controller.get
);
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
