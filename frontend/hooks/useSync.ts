import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'react-toastify';

interface SyncState {
    isPlaying: boolean;
    currentTime: number;
    track: any;
    timestamp: number;
}

interface UseSyncProps {
    roomCode: string;
    userId: string;
    isHost: boolean;
    enabled?: boolean;
}

export function useSync({ roomCode, userId, isHost, enabled = true }: UseSyncProps) {
    const socketRef = useRef<Socket | null>(null);
    const [syncState, setSyncState] = useState<SyncState>({
        isPlaying: false,
        currentTime: 0,
        track: null,
        timestamp: Date.now()
    });
    const [isConnected, setIsConnected] = useState(false);
    const [clientCount, setClientCount] = useState(0);

    useEffect(() => {
        if (!enabled || !userId) {
            return;
        }
        const wsUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        
        console.log('Connecting to WebSocket server:', wsUrl);
        
        const socket = io(wsUrl, {
            transports: ['websocket', 'polling'],
            withCredentials: true,
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Connected to sync server');
            setIsConnected(true);
            const deviceId = localStorage.getItem('deviceId') || 'unknown';
            socket.emit('join-room', { roomCode, userId, deviceId });
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from sync server');
            setIsConnected(false);
        });

        socket.on('connect_error', (error) => {
            console.error('WebSocket connection error:', error);
            setIsConnected(false);
            toast.error('Failed to connect to sync server. Using localhost?');
        });

        socket.on('reconnect_failed', () => {
            console.error('WebSocket reconnection failed');
            toast.error('Could not reconnect to sync server');
        });
        socket.on('sync-state', (state: SyncState) => {
            console.log('Received sync state:', state);
            setSyncState(state);
        });
        socket.on('sync-play', ({ currentTime, track, timestamp }) => {
            console.log('Sync play command:', currentTime);
            setSyncState({
                isPlaying: true,
                currentTime,
                track,
                timestamp
            });
            toast.info('Playback started');
        });
        socket.on('sync-pause', ({ currentTime, timestamp }) => {
            console.log('Sync pause command:', currentTime);
            setSyncState(prev => ({
                ...prev,
                isPlaying: false,
                currentTime,
                timestamp
            }));
            toast.info('Playback paused');
        });
        socket.on('sync-seek', ({ currentTime, timestamp }) => {
            console.log('Sync seek command:', currentTime);
            setSyncState(prev => ({
                ...prev,
                currentTime,
                timestamp
            }));
        });
        socket.on('resync-required', ({ expectedTime, drift }) => {
            console.log(`Resync required. Drift: ${drift}s`);
            setSyncState(prev => ({
                ...prev,
                currentTime: expectedTime,
                timestamp: Date.now()
            }));
        });
        socket.on('user-joined', ({ userId: joinedUserId, clientCount: count }) => {
            console.log(`User ${joinedUserId} joined`);
            setClientCount(count);
            toast.success('User joined the room');
        });
        socket.on('user-left', ({ userId: leftUserId, clientCount: count }) => {
            console.log(`User ${leftUserId} left`);
            setClientCount(count);
            toast.info('User left the room');
        });
        socket.on('error', ({ message }) => {
            console.error('Sync error:', message);
            toast.error(message);
        });
        return () => {
            if (socketRef.current) {
                socketRef.current.emit('leave-room', { roomCode });
                socketRef.current.disconnect();
            }
        };
    }, [roomCode, userId, enabled]);
    const hostPlay = (currentTime: number = 0, track: any = null) => {
        if (!isHost) {
            toast.error('Only host can control playback');
            return;
        }
        socketRef.current?.emit('host-play', { roomCode, currentTime, track });
    };
    const hostPause = (currentTime: number) => {
        if (!isHost) {
            toast.error('Only host can control playback');
            return;
        }
        socketRef.current?.emit('host-pause', { roomCode, currentTime });
    };
    const hostSeek = (currentTime: number) => {
        if (!isHost) {
            toast.error('Only host can control playback');
            return;
        }
        socketRef.current?.emit('host-seek', { roomCode, currentTime });
    };
    const sendHeartbeat = (currentTime: number) => {
        socketRef.current?.emit('heartbeat', { roomCode, currentTime });
    };
    return {
        syncState,
        isConnected,
        clientCount,
        hostPlay,
        hostPause,
        hostSeek,
        sendHeartbeat
    };
}
