const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const PORT = process.env.PORT || 5002;
const server = http.createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  }
});

const roomStates = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on('time:request', (clientT0, callback) => {
    callback(Date.now());
  });

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    if (roomStates[roomId]) {
      socket.emit('music:sync', roomStates[roomId]);
    }
  });

  socket.on('music:play', ({ roomId, currentTime }) => {
    if (!roomStates[roomId]) roomStates[roomId] = {};
    const serverTime = Date.now();
    roomStates[roomId].isPlaying = true;
    roomStates[roomId].currentTime = currentTime;
    roomStates[roomId].lastUpdated = serverTime;

    io.to(roomId).emit('music:play', { currentTime, serverTime });
    console.log(`Room ${roomId} playing at ${currentTime}, serverTime: ${serverTime}`);
  });

  socket.on('music:pause', ({ roomId }) => {
    if (!roomStates[roomId]) roomStates[roomId] = {};
    roomStates[roomId].isPlaying = false;

    io.to(roomId).emit('music:pause');
    console.log(`Room ${roomId} paused`);
  });

  socket.on('music:seek', ({ roomId, currentTime }) => {
    if (!roomStates[roomId]) roomStates[roomId] = {};
    const serverTime = Date.now();
    roomStates[roomId].currentTime = currentTime;

    io.to(roomId).emit('music:seek', { currentTime, serverTime });
    console.log(`Room ${roomId} seeked to ${currentTime}`);
  });

  socket.on('music:change', ({ roomId, songIndex }) => {
    if (!roomStates[roomId]) roomStates[roomId] = {};
    const serverTime = Date.now();
    roomStates[roomId].currentSongIndex = songIndex;
    roomStates[roomId].currentTime = 0;
    roomStates[roomId].isPlaying = true;

    io.to(roomId).emit('music:change', { songIndex, serverTime });
    console.log(`Room ${roomId} changed song to ${songIndex}`);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`Sockets server listening on port ${PORT}`);
});
