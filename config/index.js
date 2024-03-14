let dotenv = require("dotenv").config();

exports.serverConfig = {
  databaseUri: process.env.DATABASE_URI,
  port: process.env.PORT || 5000,
  secret: "avenge-sanautos-secret-key",
};
