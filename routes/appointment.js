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
  app.get("/api/appointments", [authJwt.verifyToken], controller.index);
  app.post("/api/appointments/check/", controller.getUnavailableTimes);
  app.post("/api/appointment/register", controller.register);
  app.delete("/api/appointment/delete/:appointment_id", controller.delete);
  app.put("/api/appointment/update/:appointment_id", controller.update);
  app.delete("/api/appointment/delete-all", controller.deleteAll);
};
