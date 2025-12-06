var express = require("express");
const { verifyRegister } = require("../middlewares");
const controller = require("../controllers/authController");
const passport = require("../config/passport");
var router = express.Router();

router.post(
  "/register",
  [verifyRegister.checkDuplicateUsernameOrEmail],
  controller.register
);
router.post(
  "/login",
  passport.authenticate("local", { session: false }),
  controller.login
);
router.get("/:userId", controller.makeAuth);

module.exports = router;
