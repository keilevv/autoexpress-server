let dotenv = require("dotenv").config();

exports.serverConfig = {
  databaseUri: process.env.DATABASE_URI,
  port: process.env.PORT || 3008,
  secret: "avenge-sanautos-secret-key",
  environment: process.env.NODE_ENV || "production",
  builderbotApi: process.env.BUILDERBOT_API,
};
