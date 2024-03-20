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

  app.get("/api/operations/clients", [authJwt.verifyToken], controller.index);
  app.get(
    "/api/operations/clients/name/:full_name",
    [authJwt.verifyToken],
    controller.getClientListByName
  );

  app.post(
    "/api/client/register",
    [verifyRegister.checkCountryIdOrTelephoneNumber],
    controller.register
  );
  app.put("/api/client/update/:client_id", controller.update);
  app.delete(
    "/api/client/delete/:client_id",
    [authJwt.verifyToken],
    controller.delete
  );
  /*WARNING: This will delete all appointments, use only on dev environment */
  app.delete(
    "/api/clients/delete-all",
    [authJwt.verifyToken],
    controller.deleteAll
  );
  app.get(
    "/api/client/:client_id",
    [authJwt.verifyToken, authJwt.isModerator],
    controller.get
  );
  app.get(
    "/api/client/country-id/:country_id",
    [verifyRegister.checkCountryIdOrTelephoneNumber],
    controller.getByContryId
  );

  app.get(
    "/api/client",
    [authJwt.verifyToken, authJwt.isModerator],
    controller.get
  );
};
