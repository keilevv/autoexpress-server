let dotenv = require("dotenv").config();

exports.serverConfig = {
  databaseUri: dotenv.parsed.DATABASE_URI,
  port: dotenv.parsed.BACKEND_PORT || 5000,
  secret: "avenge-sanautos-secret-key",
};
