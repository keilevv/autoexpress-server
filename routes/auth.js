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
router.post("/login", (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error" });
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.user = user;
    next();
  })(req, res, next);
}, controller.login);
router.get("/:userId", controller.makeAuth);

module.exports = router;
