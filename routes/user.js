const { authJwt } = require("../middlewares");
const controller = require("../controllers/userController");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });

  app.get("/api/users", [authJwt.verifyToken], controller.index);
  app.delete(
    "/api/user/delete/:user_id",
    [authJwt.verifyToken],
    controller.delete
  );
  app.get("/api/user/:user_id", [authJwt.verifyToken], controller.get);
  app.put(
    "/api/user/update/:user_id",
    [authJwt.verifyToken],
    controller.update
  );

  app.get(
    "/api/user/search/:name",
    [authJwt.verifyToken],
    controller.getByName
  );
};
