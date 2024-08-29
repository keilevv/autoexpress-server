const express = require("express");
const { authJwt, verifyMaterial } = require("../middlewares");
const storageMaterialController = require("../controllers/storageMaterialController");
const consumptionMaterialController = require("../controllers/consumptionMaterialController");
const router = express.Router();

router.get(
  "/operations/storage",
  [authJwt.verifyToken],
  storageMaterialController.index
);

router.get(
  "/operations/storage/:material_id",
  [authJwt.verifyToken],
  storageMaterialController.get
);
router.post(
  "/register-storage",
  [authJwt.verifyToken, verifyMaterial.checkStorageMatererialByReference],
  storageMaterialController.register
);
router.put(
  "/operations/update/storage/:material_id",
  [authJwt.verifyToken, verifyMaterial.checkStorageMatererialByReference],
  storageMaterialController.update
);
router.delete(
  "/operations/delete/storage/:material_id",
  [authJwt.verifyToken],
  storageMaterialController.delete
);
/*WARNING: This will delete all materials, use only on dev environment */
// router.delete("/delete-all", [authJwt.verifyToken], storageMaterialController.deleteAll);

router.get(
  "/operations/consumption",
  [authJwt.verifyToken],
  consumptionMaterialController.index
);

router.get(
  "/operations/consumption/:material_id",
  [authJwt.verifyToken],
  consumptionMaterialController.get
);
router.post(
  "/register-consumption",
  [authJwt.verifyToken],
  consumptionMaterialController.register
);
router.put(
  "/operations/update/consumption/:material_id",
  [authJwt.verifyToken],
  consumptionMaterialController.update
);
router.delete(
  "/operations/delete/consumption/:material_id",
  [authJwt.verifyToken],
  consumptionMaterialController.delete
);

module.exports = router;
