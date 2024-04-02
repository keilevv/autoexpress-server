let express = require("express");
let bodyParser = require("body-parser");
let mongoose = require("mongoose");
let app = express();
let cors = require("cors");

let config = require("./config/");

// Models

const Role = require("./models/roleModel");

// Configure bodyparser to handle post requests
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// cors
app.use(cors({ origin: true, credentials: true }));

// Connect to Mongoose and set connection variable
mongoose
  .connect(config.serverConfig.databaseUri)
  .then(() => console.log("Db connected successfully"))
  .catch((err) => console.error("Error connecting db: ", err));

function initial() {
  Role.estimatedDocumentCount((err, count) => {
    if (!err && count === 0) {
      new Role({
        name: "user",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }
        console.log("added 'user' to roles collection");
      });
      new Role({
        name: "moderator",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }
        console.log("added 'moderator' to roles collection");
      });
      new Role({
        name: "admin",
      }).save((err) => {
        if (err) {
          console.log("error", err);
        }
        console.log("added 'admin' to roles collection");
      });
    }
  });
}

// Setup server port
var port = config.serverConfig.port;

// Send message for default URL
app.get("/", (req, res) => res.json("Hello World with Express"));

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
