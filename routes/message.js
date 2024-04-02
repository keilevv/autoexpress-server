const controller = require("../controllers/messageController");
const { authJwt, verifyRegister } = require("../middlewares");
module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/operations/messages", [authJwt.verifyToken], controller.index);

  app.post(
    "/api/message/register",
    [verifyRegister.checkCountryIdOrTelephoneNumber],
    controller.register
  );
  //   app.put("/api/message/update/:message_id", controller.update);
  //   app.delete(
  //     "/api/message/delete/:client_id",
  //     [authJwt.verifyToken],
  //     controller.delete
  //   );
  // /*WARNING: This will delete all appointments, use only on dev environment */
  //   app.delete(
  //     "/api/message/delete-all",
  //     [authJwt.verifyToken],
  //     controller.deleteAll
  //   );
  //   app.get(
  //     "/api/message/:message_id",
  //     [authJwt.verifyToken, authJwt.isModerator],
  //     controller.get
  //   );
};
