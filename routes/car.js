const { authJwt, verifyRegister } = require("../middlewares");
const controller = require("../controllers/carController");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
  });
  app.get("/api/cars", [authJwt.verifyToken], controller.index);
  app.post("/api/car/plate/:plate", controller.getByCarPlate);

  app.post(
    "/api/car/register",
    [verifyRegister.checkCarPlateOrVin],
    controller.register
  );
  app.put("/api/car/update/:car_id", controller.update);
  app.delete(
    "/api/car/delete/:car_id",
    [authJwt.verifyToken],
    controller.delete
  );
};
