const express = require("express");
const { authJwt } = require("../middlewares");
const notificationController = require("../controllers/notificationController");
const router = express.Router();

router.get("/stream", [authJwt.verifyToken], notificationController.stream);
router.put("/read-all", [authJwt.verifyToken], notificationController.markAllAsRead);
router.get("/", [authJwt.verifyToken], notificationController.index);
router.delete("/:id", [authJwt.verifyToken], notificationController.delete);

module.exports = router;
