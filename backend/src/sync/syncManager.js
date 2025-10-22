const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class SyncManager {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();
    }

    initialize() {
        this.io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);

            socket.on('join-room', async ({ roomCode, userId, deviceId }) => {
                try {
                    const room = await prisma.room.findUnique({
                        where: { code: roomCode },
                        include: { participants: true }
                    });

                    if (!room) {
                        socket.emit('error', { message: 'Room not found' });
                        return;
                    }
                    const isParticipant = room.participants.some(p => p.userId === userId);
                    if (!isParticipant) {
                        socket.emit('error', { message: 'Not authorized to join this room' });
                        return;
                    }
                    socket.join(roomCode);
                    socket.roomCode = roomCode;
                    socket.userId = userId;
                    socket.deviceId = deviceId;
                    socket.isHost = room.hostId === userId;
                    if (!this.rooms.has(roomCode)) {
                        this.rooms.set(roomCode, {
                            state: {
                                isPlaying: false,
                                currentTime: 0,
                                track: null,
                                timestamp: Date.now()
                            },
                            clients: new Set()
                        });
                    }
                    const roomData = this.rooms.get(roomCode);
                    roomData.clients.add(socket.id);

                    console.log(`User ${userId} joined room ${roomCode}`);
                    socket.emit('sync-state', roomData.state);
                    socket.to(roomCode).emit('user-joined', {
                        userId,
                        deviceId,
                        clientCount: roomData.clients.size
                    });

                } catch (err) {
                    console.error('Join room error:', err);
                    socket.emit('error', { message: 'Failed to join room' });
                }
            });

            socket.on('host-play', ({ roomCode, currentTime, track }) => {
                if (!socket.isHost) {
                    socket.emit('error', { message: 'Only host can control playback' });
                    return;
                }

                const roomData = this.rooms.get(roomCode);
                if (!roomData) return;

                roomData.state = {
                    isPlaying: true,
                    currentTime,
                    track,
                    timestamp: Date.now()
                };
                this.io.to(roomCode).emit('sync-play', {
                    currentTime,
                    track,
                    timestamp: roomData.state.timestamp
                });

                console.log(`Room ${roomCode}: Play command at ${currentTime}s`);
            });
            socket.on('host-pause', ({ roomCode, currentTime }) => {
                if (!socket.isHost) {
                    socket.emit('error', { message: 'Only host can control playback' });
                    return;
                }

                const roomData = this.rooms.get(roomCode);
                if (!roomData) return;

                roomData.state.isPlaying = false;
                roomData.state.currentTime = currentTime;
                roomData.state.timestamp = Date.now();

                this.io.to(roomCode).emit('sync-pause', {
                    currentTime,
                    timestamp: roomData.state.timestamp
                });

                console.log(`Room ${roomCode}: Pause command at ${currentTime}s`);
            });

            socket.on('host-seek', ({ roomCode, currentTime }) => {
                if (!socket.isHost) {
                    socket.emit('error', { message: 'Only host can control playback' });
                    return;
                }

                const roomData = this.rooms.get(roomCode);
                if (!roomData) return;

                roomData.state.currentTime = currentTime;
                roomData.state.timestamp = Date.now();

                this.io.to(roomCode).emit('sync-seek', {
                    currentTime,
                    timestamp: roomData.state.timestamp
                });

                console.log(`Room ${roomCode}: Seek to ${currentTime}s`);
            });

            socket.on('request-time-sync', ({ roomCode, clientTime }) => {
                const serverTime = Date.now();
                socket.emit('time-sync-response', {
                    clientTime,
                    serverTime,
                    responseTime: Date.now()
                });
            });

            socket.on('heartbeat', ({ roomCode, currentTime }) => {
                const roomData = this.rooms.get(roomCode);
                if (!roomData) return;

                if (roomData.state.isPlaying) {
                    const elapsed = (Date.now() - roomData.state.timestamp) / 1000;
                    const expectedTime = roomData.state.currentTime + elapsed;
                    const drift = Math.abs(currentTime - expectedTime);
                    if (drift > 0.5) {
                        socket.emit('resync-required', {
                            expectedTime: expectedTime,
                            drift: drift
                        });
                        console.log(`Drift detected in room ${roomCode}: ${drift.toFixed(3)}s`);
                    }
                }
            });
            socket.on('disconnect', () => {
                console.log('Client disconnected:', socket.id);

                if (socket.roomCode) {
                    const roomData = this.rooms.get(socket.roomCode);
                    if (roomData) {
                        roomData.clients.delete(socket.id);
                        socket.to(socket.roomCode).emit('user-left', {
                            userId: socket.userId,
                            deviceId: socket.deviceId,
                            clientCount: roomData.clients.size
                        });
                        if (roomData.clients.size === 0) {
                            this.rooms.delete(socket.roomCode);
                            console.log(`Room ${socket.roomCode} cleaned up (empty)`);
                        }
                    }
                }
            });
            socket.on('leave-room', ({ roomCode }) => {
                socket.leave(roomCode);
                
                if (socket.roomCode) {
                    const roomData = this.rooms.get(socket.roomCode);
                    if (roomData) {
                        roomData.clients.delete(socket.id);
                        
                        socket.to(socket.roomCode).emit('user-left', {
                            userId: socket.userId,
                            deviceId: socket.deviceId,
                            clientCount: roomData.clients.size
                        });
                    }
                }
                socket.roomCode = null;
                socket.userId = null;
                socket.deviceId = null;
                socket.isHost = false;
            });
        });
    }

    getRoomState(roomCode) {
        return this.rooms.get(roomCode);
    }
}

module.exports = SyncManager;
