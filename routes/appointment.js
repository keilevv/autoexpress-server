const { authJwt, verifyRegister } = require("../middlewares");
const controller = require("../controllers/appointmentController");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.get("/api/agenda/appointments", [authJwt.verifyToken], controller.index);
  app.post("/api/appointments/check/", controller.getUnavailableTimes);
  app.post("/api/appointment/register", controller.register);
  app.delete(
    "/api/agenda/appointment/delete/:appointment_id",
    [authJwt.verifyToken],
    controller.delete
  );
  app.put(
    "/api/agenda/appointment/update/:appointment_id",
    [authJwt.verifyToken],
    controller.update
  );
  app.delete(
    "/api/agenda/appointments/delete-all",
    [authJwt.verifyToken],
    controller.deleteAll
  );
};
