const express = require("express");
const { authJwt } = require("../middlewares");
const router = express.Router();
const controller = require("../controllers/builderbotController");

router.get("/get-session", [authJwt.verifyToken], controller.getSession);

module.exports = router;
