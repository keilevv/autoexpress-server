const express = require("express");
const router = express.Router();
const { authJwt } = require("../middlewares");
const controller = require("../controllers/userController");

router.get("/", [authJwt.verifyToken], controller.index);
router.delete("/delete/:user_id", [authJwt.verifyToken], controller.delete);
router.get("/:user_id", [authJwt.verifyToken], controller.get);
router.put("/update/:user_id", [authJwt.verifyToken], controller.update);

router.get("/search/:name", [authJwt.verifyToken], controller.getByName);

module.exports = router;
