const express = require("express");
const router = express.Router();
const serviceController = require("../controllers/serviceController");
const { authJwt } = require("../middlewares");

// Service routes
router.post("/", [authJwt.verifyToken], serviceController.register);
router.get("/", [authJwt.verifyToken], serviceController.index);
router.get("/:service_id", [authJwt.verifyToken], serviceController.get);
router.put("/:service_id", [authJwt.verifyToken], serviceController.update);
router.delete("/:service_id", [authJwt.verifyToken], serviceController.delete);

module.exports = router;
