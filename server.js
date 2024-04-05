const app = require('./index');
const http = require('http');

http.createServer(app).listen(process.env.PORT);