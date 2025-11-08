import {io, Socket} from 'socket.io-client';

let socket: Socket | null = null;
export function getRealtimeUrl() {
  return process.env.NEXT_PUBLIC_REALTIME_URL || 'http://localhost:5002';
}

export function getSocket(): Socket {
    if(!socket) {
        const realtimeUrl = getRealtimeUrl();
        const token =  localStorage.getItem('token');
        socket = io(realtimeUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            auth: {token: token,},
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
        });

        socket.on('connect', () => {
            console.log('Connected to realtime server:', socket?.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('Disconnected from realtime server. Reason:', reason);
        });

        socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
        });
    }
    return socket;
}

export function joinRoomSocket(code: string) {
    const socket = getSocket();
    socket.emit('room:join', {code});
    return socket;
}

export function leaveRoomSocket(code: string) {
    const socket = getSocket();
    socket.emit('room:leave', {code});
    return socket;
}
export function disconnectSocket() {
    if(socket) {
        socket.disconnect();
        socket = null;
    }
}