"use client"
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { toast } from "react-toastify";
import { getSocket, joinRoomSocket, leaveRoomSocket } from "@/lib/sync/sync";
import { syncClock, toClientTime, type Clock } from "@/lib/sync/clock";

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomcode = params.code as string;
    const [mounted, setMounted] = useState(false);
    const [loading, setLoading] = useState(true);
    const [roomData, setRoomData] = useState<{ name: string; host: { id: string } } | null>(null);
    const [isHost, setIsHost] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    
    // Realtime state
    const [socketReady, setSocketReady] = useState(false);
    const [clock, setClock] = useState<Clock | null>(null);
    const [trackUrl, setTrackUrl] = useState<string | null>(null);
    const [trackName, setTrackName] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";

    
    useEffect(()=>{
        setMounted(true)
    },[])
    
    
    // Fetch room data (existing REST call)


    useEffect(() => {
        if(!mounted) return
        const fetchRoomData = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    toast.error("Please login first");
                    router.push('/');
                    return;
                }

                const res = await fetch(`${url}/api/room/${roomcode}`, {
                    method: "GET",
                    headers: { Authorization: `Bearer ${token}` },
                    credentials: "include"
                });

                const data = await res.json();
                if (res.ok && data.room) {
                    setRoomData(data.room);
                    setUserId(data.userId);
                    setIsHost(data.room.hostId === data.userId);
                } else {
                    toast.error("Failed to load room");
                    router.push('/dashboard');
                }
            } catch (err) {
                console.error("Room fetch error:", err);
                toast.error("Error loading room");
            } finally {
                setLoading(false);
            }
        };

        if (roomcode) fetchRoomData();
    }, [roomcode, router, url,mounted]);

    // Connect to realtime server and sync clock
    useEffect(() => {
        if (!roomcode || !userId) return;

        const socket = joinRoomSocket(roomcode);

        const onConnect = async () => {
            console.log('🎵 Joined room socket:', roomcode);
            setSocketReady(true);
            
            try {
                const clockSync = await syncClock(socket);
                setClock(clockSync);
                console.log('⏰ Clock synced - offset:', clockSync.offset, 'ms, rtt:', clockSync.rtt, 'ms');
            } catch (e) {
                console.error('Clock sync failed', e);
                toast.error('Clock sync failed');
            }
        };

        // Listen for room events
        const onUserJoined = ({ userId, userName }: { userId: string; userName?: string }) => {
            toast.info(`${userName || userId} joined the room`);
        };

        const onUserLeft = ({ userId, userName }: { userId: string; userName?: string }) => {
            toast.info(`${userName || userId} left the room`);
        };

        // Playback events
        const onSetTrack = ({ url, name }: { url: string; name?: string }) => {
            console.log('🎵 Track set:', url);
            setTrackUrl(url);
            setTrackName(name || null);
            if (audioRef.current) {
                audioRef.current.src = url;
                audioRef.current.load();
            }
        };

        const onPlayAt = ({ startAt }: { startAt: number }) => {
            if (!audioRef.current || !clock) return;
            
            const clientTarget = toClientTime(startAt, clock.offset);
            const delay = clientTarget - Date.now();
            
            console.log('▶️  Play scheduled - delay:', delay, 'ms');
            
            if (delay <= 0) {
                // Already passed, play immediately
                audioRef.current.play().catch(e => console.warn('Play failed:', e));
                setIsPlaying(true);
            } else {
                // Schedule play in the future
                setTimeout(() => {
                    audioRef.current?.play().catch(e => console.warn('Play failed:', e));
                    setIsPlaying(true);
                }, delay);
            }
        };

        const onPause = () => {
            console.log('⏸️  Pause received');
            audioRef.current?.pause();
            setIsPlaying(false);
        };

        const onSeek = ({ position }: { position: number }) => {
            console.log('⏩ Seek to:', position, 's');
            if (audioRef.current) {
                audioRef.current.currentTime = position;
            }
        };

        socket.on('connect', onConnect);
        socket.on('room:user-joined', onUserJoined);
        socket.on('room:user-left', onUserLeft);
        socket.on('playback:set-track', onSetTrack);
        socket.on('playback:play-at', onPlayAt);
        socket.on('playback:pause', onPause);
        socket.on('playback:seek', onSeek);

        return () => {
            socket.off('connect', onConnect);
            socket.off('room:user-joined', onUserJoined);
            socket.off('room:user-left', onUserLeft);
            socket.off('playback:set-track', onSetTrack);
            socket.off('playback:play-at', onPlayAt);
            socket.off('playback:pause', onPause);
            socket.off('playback:seek', onSeek);
            leaveRoomSocket(roomcode);
        };
    }, [roomcode, userId, clock]);

    // Host controls
    const handleFileSelect = (file: File) => {
        if (!file.type.startsWith('audio/')) {
            toast.error('Please select an audio file');
            return;
        }

        // Create object URL for local playback
        const objectUrl = URL.createObjectURL(file);
        setTrackUrl(objectUrl);
        setTrackName(file.name);
        
        if (audioRef.current) {
            audioRef.current.src = objectUrl;
            audioRef.current.load();
        }

        // Broadcast to other clients
        const socket = getSocket();
        socket.emit('playback:set-track', { 
            code: roomcode, 
            url: objectUrl,
            name: file.name 
        });
        toast.success(`Track loaded: ${file.name}`);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handlePlaySync = () => {
        if (!clock) {
            toast.error('Clock not synced yet!');
            return;
        }
        
        const socket = getSocket();
        // Schedule play 1 second in the future (server time)
        const startAt = Date.now() + clock.offset + 1000;
        socket.emit('playback:play-at', { code: roomcode, startAt });
        toast.success('Play scheduled in 1s!');
    };

    const handlePause = () => {
        const socket = getSocket();
        socket.emit('playback:pause', { code: roomcode });
        toast.info('Paused');
    };

    const handleSeek = () => {
        const position = prompt('Seek to position (seconds):');
        if (!position) return;
        
        const socket = getSocket();
        socket.emit('playback:seek', { code: roomcode, position: parseFloat(position) });
    };

    const handleLeaveRoom = () => {
        leaveRoomSocket(roomcode);
        toast.info("Left the room");
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
                <p className="text-xl">Loading room...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8">
            {/* Hidden audio element */}
            <audio ref={audioRef} preload="auto" />

            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold mb-4">{roomData?.name}</h1>
                <p className="text-gray-400 mb-2">Room Code: <span className="text-blue-400 font-mono text-xl">{roomcode}</span></p>
                <p className="text-gray-400 mb-6">
                    Status: {socketReady ? '🟢 Connected' : '🔴 Disconnected'} | 
                    Clock: {clock ? `⏰ Synced (±${clock.rtt}ms)` : '⏳ Syncing...'}
                </p>

                {/* Track info */}
                <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
                    <h2 className="text-2xl font-bold mb-4">Now Playing</h2>
                    {trackUrl ? (
                        <div>
                            <p className="text-lg font-semibold mb-2">{trackName || 'Unknown Track'}</p>
                            <p className="text-lg">{isPlaying ? '▶️ Playing' : '⏸️ Paused'}</p>
                        </div>
                    ) : (
                        <p className="text-gray-500">No track loaded</p>
                    )}
                </div>

                {/* Host controls */}
                {isHost && clock && (
                    <div className="bg-blue-900/40 rounded-xl p-6 mb-6">
                        <h3 className="text-xl font-bold mb-4">🎛️ Host Controls</h3>
                        
                        {/* Drag and drop area */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all ${
                                isDragging 
                                    ? 'border-blue-400 bg-blue-500/20' 
                                    : 'border-gray-600 hover:border-blue-500 hover:bg-gray-800/40'
                            }`}
                        >
                            <div className="flex flex-col items-center gap-3">
                                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                                <p className="text-lg font-semibold">
                                    {isDragging ? 'Drop audio file here' : 'Drag & drop audio file'}
                                </p>
                                <p className="text-sm text-gray-400">or click to browse</p>
                                <p className="text-xs text-gray-500">Supports MP3, WAV, OGG, M4A</p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="audio/*"
                            onChange={handleFileInput}
                            className="hidden"
                        />
                        
                        <div className="flex flex-wrap gap-3">
                            <button 
                                onClick={handlePlaySync}
                                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
                                disabled={!trackUrl}
                            >
                                ▶️ Play (Sync)
                            </button>
                            <button 
                                onClick={handlePause}
                                className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
                            >
                                ⏸️ Pause
                            </button>
                            <button 
                                onClick={handleSeek}
                                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700"
                                disabled={!trackUrl}
                            >
                                ⏩ Seek
                            </button>
                        </div>
                    </div>
                )}

                {/* Participants */}
                <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
                    <h3 className="text-xl font-bold mb-4">👥 Participants ({roomData?.participants?.length || 0})</h3>
                    <div className="space-y-2">
                        {roomData?.participants?.map((p: { userId: string; user?: { name: string } }) => (
                            <div key={p.userId} className="flex items-center gap-2">
                                <span className="text-green-400">●</span>
                                <span>{p.user?.name || p.userId}</span>
                                {p.userId === roomData.hostId && <span className="text-yellow-400">👑 Host</span>}
                            </div>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleLeaveRoom}
                    className="px-6 py-3 rounded bg-red-600 hover:bg-red-700"
                >
                    🚪 Leave Room
                </button>
            </div>
        </div>
    );
}
