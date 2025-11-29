module.exports = (io) => {
    io.on('connection', (socket) => {
        console.log('Syncbeats Sockets Connected:', socket.id);

        socket.on('join-room', ({ roomCode }) => {
            socket.join(roomCode);
            console.log(`Socket ${socket.id} joined ${roomCode}`);
        });

        socket.on('leave-room', ({ roomCode }) => {
            socket.leave(roomCode);
            console.log(`Socket ${socket.id} left ${roomCode}`);
        });

        socket.on('PLAY', ({ roomCode }) => {
            console.log(`Host triggered PLAY in ${roomCode}`);
            socket.to(roomCode).emit('PLAY');
        });

        socket.on('disconnect',() => {
            console.log('Syncbeats Sockets Disconnected:', socket.id);
        });
    })
};