require('dotenv').config();
const express = require("express");
const http = require("http");
const createSyncEngine = require("./socket");

const app = express();
const server = http.createServer(app);

createSyncEngine(server);
const port = process.env.PORT
server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});