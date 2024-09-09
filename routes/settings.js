const express = require("express");
const { authJwt, verifyRegister } = require("../middlewares");
const router = express.Router();
const controller = require("../controllers/employeeController");

router.get("/operations/employees", controller.index);
router.get("/operations/employees/:employee_id", [authJwt.verifyToken], controller.get);
router.post("/operations/register-employee", controller.register);
router.put("/operations/update/employees/:employee_id", controller.update);
router.delete(
  "/operations/:employee_id",
  [authJwt.verifyToken],
  controller.delete
);
/*WARNING: This will delete all appointments, use only on dev environment */
// router.delete("/delete-all", [authJwt.verifyToken], controller.deleteAll);
// router.get(
//   "/api/client",
//   [authJwt.verifyToken, authJwt.isModerator],
//   controller.get
// );

module.exports = router;
