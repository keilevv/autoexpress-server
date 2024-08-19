const express = require("express");
const { authJwt } = require("../middlewares");
const controller = require("../controllers/storageMaterialController");
const router = express.Router();

router.get("/operations", [authJwt.verifyToken], controller.index);
router.get("/operations/:material_id", [authJwt.verifyToken], controller.get)
router.post("/register-storage", [authJwt.verifyToken], controller.register);
// router.put("/update/:material_id", [authJwt.verifyToken], controller.update);
// router.delete("/delete/:material_id", [authJwt.verifyToken], controller.delete);
/*WARNING: This will delete all materials, use only on dev environment */
// router.delete("/delete-all", [authJwt.verifyToken], controller.deleteAll);

module.exports = router;
