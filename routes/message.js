const express = require("express");
const controller = require("../controllers/messageController");
const { authJwt, verifyRegister } = require("../middlewares");
const router = express.Router();

router.get("/operations", [authJwt.verifyToken], controller.index);

router.post("/register", controller.register);

router.get("/operations/:message_id", [authJwt.verifyToken], controller.get);
router.put("/operations/update/:message_id", [authJwt.verifyToken], controller.update);
router.delete("/operations/delete/:message_id", [authJwt.verifyToken], controller.delete);

//   router.put("/api/message/update/:message_id", controller.update);
//   router.delete(
//     "/api/message/delete/:client_id",
//     [authJwt.verifyToken],
//     controller.delete
//   );
// /*WARNING: This will delete all appointments, use only on dev environment */
//   router.delete(
//     "/api/message/delete-all",
//     [authJwt.verifyToken],
//     controller.deleteAll
//   );
//   router.get(
//     "/api/message/:message_id",
//     [authJwt.verifyToken, authJwt.isModerator],
//     controller.get
//   );

module.exports = router;
