const express = require("express");
const { authJwt, verifyMaterial } = require("../middlewares");
const storageMaterialController = require("../controllers/storageMaterialController");
const consumptionMaterialController = require("../controllers/consumptionMaterialController");
const saleController = require("../controllers/saleController");
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
router.post(
  "/operations/storage/restock",
  [authJwt.verifyToken],
  storageMaterialController.restockMaterials
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
router.post(
  "/operations/update/update-margin/storage/",
  [authJwt.verifyToken],
  storageMaterialController.changeMaterialsMargin
);

router.post(
  "/operations/load-storage-materials",
  [authJwt.verifyToken],
  storageMaterialController.uploadStorageMaterials
);
router.get(
  "/helpers/sync-storage-schema",
  [authJwt.verifyToken],
  storageMaterialController.syncSchema
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

// sales routes

router.get("/operations/sales", [authJwt.verifyToken], saleController.index);

router.get(
  "/operations/sales/:sale_id",
  [authJwt.verifyToken],
  saleController.get
);
router.post("/register-sale", [authJwt.verifyToken], saleController.register);
router.put(
  "/operations/update/sales/:sale_id",
  [authJwt.verifyToken],
  saleController.update
);
router.delete(
  "/operations/delete/sales/:sale_id",
  [authJwt.verifyToken],
  saleController.delete
);

module.exports = router;
