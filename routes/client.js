const { authJwt, verifyRegister } = require("../middlewares");
const controller = require("../controllers/clientController");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/clients", [authJwt.verifyToken], controller.index);
  app.post(
    "/api/client/register",
    [verifyRegister.checkCountryIdOrTelephoneNumber],
    controller.register
  );
  app.put(
    "/api/client/update/:client_id",
    [authJwt.verifyToken],
    controller.update
  );
  app.delete(
    "/api/client/delete/:client_id",
    [authJwt.verifyToken],
    controller.delete
  );
  app.get(
    "/api/client",
    [authJwt.verifyToken, authJwt.isModerator],
    controller.get
  );
};
