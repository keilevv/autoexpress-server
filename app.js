const express = require("express");
const path = require("path");
const favicon = require("serve-favicon");
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const config = require("./config/");
const mongoose = require("mongoose");
const cors = require("cors");

const routes = require("./routes/index");
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth");
const clientRoutes = require("./routes/client");

const app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// cors
app.use(cors({ origin: true, credentials: true }));

// Connect to Mongoose and set connection variable
mongoose
  .connect(config.serverConfig.databaseUri)
  .then(() => console.log("Db connected successfully"))
  .catch((err) => console.error("Error connecting db: ", err));

app.use("/", routes);
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  const err = new Error("Not Found");
  err.status = 404;
  next(err);
});

if (config.serverConfig.environment === "production") {
  // error handlers
  // development error handler
  // will print stacktrace
  if (app.get("env") === "development") {
    app.use(function (err, req, res, next) {
      res.status(err.status || 500);
      res.render("error", {
        message: err.message,
        error: err,
      });
    });
  }

  // production error handler
  // no stacktraces leaked to user
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render("error", {
      message: err.message,
      error: {},
    });
  });
}

module.exports = app;
