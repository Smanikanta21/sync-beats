const app = require('./app');
const http = require('http');
const { Server } = require('socket.io');
const SyncManager = require('./sync/syncManager');

const Port = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://www.syncbeats.app', 'https://sync-beats-81jq.vercel.app', 'http://172.20.10.2:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

const syncManager = new SyncManager(io);
syncManager.initialize();
app.set('io', io);

server.listen(Port, () => {
    console.log(`Server running on http://localhost:${Port}`);
    console.log(`WebSocket server initialized`);
});