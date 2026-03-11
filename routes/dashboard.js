const express = require("express");
const { authJwt } = require("../middlewares");
const dashboardController = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", [authJwt.verifyToken], dashboardController.index);

module.exports = router;
