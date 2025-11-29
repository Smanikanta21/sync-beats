require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

app.use(cors({
    origin:[`${process.env.FRONTEND_DEV_URL}`,`${process.env.FRONTEND_URL}`,`${process.env.BACKEND_URL}`,`${process.env.FRONTEND_N_DEV_URL}`],
    methods:['GET','POST']
}))


const server = http.createServer(app);

const io = new Server(server,{
    cors:{
        origin: [`${process.env.FRONTEND_DEV_URL}`,`${process.env.FRONTEND_URL}`,`${process.env.BACKEND_URL}`,`${process.env.FRONTEND_N_DEV_URL}`],
        methods:['GET','POST','DELETE','PATCH','PUT'],
    }
})

require('./sockets-engine')(io)
const PORT = process.env.PORT

server.listen(PORT, () => {
    console.log(`Syncbeats Sockets Server is running on port ${PORT}`);
});

module.exports = {app, io, server };