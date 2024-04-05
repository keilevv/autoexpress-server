let express = require("express");
var path = require('path');
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let app = express();
let cors = require("cors");
var logger = require("morgan");
var cookieParser = require("cookie-parser");

let config = require("./config/");

// Configure bodyparser to handle post requests
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(logger("dev"));
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// cors
app.use(cors({ origin: true, credentials: true }));

// Connect to Mongoose and set connection variable
mongoose
  .connect(config.serverConfig.databaseUri)
  .then(() => console.log("Db connected successfully"))
  .catch((err) => console.error("Error connecting db: ", err));

// Setup server port
var port = config.serverConfig.port;

// Send message for default URL
app.get("/", (req, res) =>
  res.json("Hello World with Express from autoexpress")
);

// Use Api routes in the App
require("./routes/auth")(app);
require("./routes/user")(app);
require("./routes/client")(app);
require("./routes/car")(app);
require("./routes/appointment")(app);
require("./routes/message")(app);

// Launch app to listen to specified port
app.listen(port, function () {
  console.log("Running RestHub on port " + port);
});

module.exports = app;
