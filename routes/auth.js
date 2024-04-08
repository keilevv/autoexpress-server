var express = require("express");
const { verifyRegister } = require("../middlewares");
const controller = require("../controllers/authController");
var router = express.Router();

router.post(
  "/register",
  [verifyRegister.checkDuplicateUsernameOrEmail],
  controller.register
);
router.post("/login", controller.login);

module.exports = router;
