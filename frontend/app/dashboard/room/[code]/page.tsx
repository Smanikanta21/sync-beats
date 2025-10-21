"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Music, Users, Loader2, Radio, Play, SkipForward, SkipBack, Volume2, ArrowLeft, Settings, UserCircle, LogOut } from "lucide-react"

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomcode = params.code as string

    const [loading, setLoading] = useState(true)
    const [roomData, setRoomData] = useState<{
        id: string;
        name: string;
        type: string;
        code: string;
        hostId: string;
        participants: Array<{ userId: string; user?: { name: string } }>;
        devices: Array<{ deviceId: string; device?: { name: string; status: string } }>;
        isActive: boolean;
    } | null>(null)
    const [isHost, setIsHost] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

    useEffect(() => {
        const fetchRoomData = async () => {
            try {
                setLoading(true)
                
                // Check if we're in the browser
                if (typeof window === 'undefined') {
                    return;
                }
                
                const token = localStorage.getItem("token");
                
                if (!token) {
                    toast.error("Please login first");
                    router.push('/');
                    return;
                }

                const res = await fetch(`${url}/api/room/${roomcode}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: "include"
                });

                const data = await res.json();

                if (res.ok && data.room) {
                    setRoomData(data.room);
                    setUserId(data.userId);
                    setIsHost(data.room.hostId === data.userId);
                } else {
                    toast.error(data.message || "Room not found");
                    router.push('/dashboard');
                }
            } catch (err) {
                console.error("Fetch room error:", err);
                toast.error("Failed to load room data");
                router.push('/dashboard');
            } finally {
                setLoading(false)
            }
        };

        if (roomcode) {
            fetchRoomData();
        }
    }, [roomcode, router, url]);

    const handleLeaveRoom = () => {
        toast.info("Left the room");
        router.push('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-400" size={48} />
                    <p className="text-xl">Loading room...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
            {/* Header */}
            <header className="flex flex-row justify-between items-center bg-black/60 backdrop-blur-md py-4 px-6 shadow-lg sticky top-0 z-10 border-b border-gray-800">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push('/dashboard')} className="hover:text-blue-400 transition">
                        <ArrowLeft size={24} />
                    </button>
                    <Music className="text-blue-400" size={28} />
                    <div>
                        <span className="text-2xl font-extrabold tracking-tight">SyncBeats</span>
                        {isHost && <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">HOST</span>}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={handleLeaveRoom} className="px-4 py-2 rounded-lg border border-red-600 text-red-500 hover:bg-red-600 hover:text-white transition flex items-center gap-2">
                        <LogOut size={18} />
                        <span className="hidden md:inline">Leave Room</span>
                    </button>
                </div>
            </header>

            <main className="w-full px-4 py-10 md:py-14 max-w-7xl mx-auto flex flex-col gap-8">
                {/* Room Info Section */}
                <section className="bg-gray-900/70 rounded-2xl p-6 md:p-8 border border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2">{roomData?.name}</h1>
                            <div className="flex items-center gap-4 text-gray-400">
                                <span className="flex items-center gap-1">
                                    <Radio className={roomData?.isActive ? "text-green-400" : "text-gray-400"} size={16} />
                                    {roomData?.isActive ? "Active" : "Inactive"}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Users size={16} />
                                    {roomData?.participants?.length || 0} participants
                                </span>
                            </div>
                        </div>
                        <div className="bg-gray-800/60 px-6 py-3 rounded-xl border border-gray-600">
                            <p className="text-xs text-gray-400 mb-1">Room Code</p>
                            <p className="text-2xl font-mono font-bold text-blue-400">{roomcode}</p>
                        </div>
                    </div>
                </section>

                {/* Player Section */}
                <section className="bg-gray-900/70 rounded-2xl p-6 md:p-8 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                        <Radio className="text-purple-400" size={24} />
                        Synced Playback
                    </h2>
                    
                    <div className="flex flex-col items-center gap-6">
                        <div className="w-64 h-64 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-2xl">
                            <Music size={80} className="text-white/40" />
                        </div>

                        <div className="text-center">
                            <h3 className="text-2xl font-bold mb-1">No track playing</h3>
                            <p className="text-gray-400">Start syncing music across devices</p>
                        </div>

                        <div className="w-full max-w-2xl">
                            <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2">
                                <div className="h-full w-0 bg-blue-500 rounded-full"></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-400">
                                <span>0:00</span>
                                <span>0:00</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <button className="p-3 rounded-full hover:bg-gray-800 transition">
                                <SkipBack size={24} />
                            </button>
                            <button className="p-6 rounded-full bg-blue-600 hover:bg-blue-700 transition">
                                <Play size={32} />
                            </button>
                            <button className="p-3 rounded-full hover:bg-gray-800 transition">
                                <SkipForward size={24} />
                            </button>
                        </div>

                        {/* Volume */}
                        <div className="flex items-center gap-3 w-full max-w-xs">
                            <Volume2 size={20} className="text-gray-400" />
                            <input type="range" min="0" max="100" defaultValue="50" className="w-full" />
                        </div>
                    </div>
                </section>

                {/* Participants & Devices Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Participants */}
                    <section className="bg-gray-900/70 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Users className="text-green-400" size={22} />
                            Participants ({roomData?.participants?.length || 0})
                        </h2>
                        <div className="space-y-3">
                            {roomData?.participants && roomData.participants.length > 0 ? (
                                roomData.participants.map((participant, idx) => (
                                    <div key={idx} className="bg-gray-800/60 p-4 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <UserCircle size={32} className="text-gray-400" />
                                            <div>
                                                <p className="font-semibold">
                                                    {participant.user?.name || `User ${participant.userId.slice(0, 8)}`}
                                                </p>
                                                {participant.userId === roomData.hostId && (
                                                    <span className="text-xs text-blue-400">Host</span>
                                                )}
                                            </div>
                                        </div>
                                        {participant.userId === userId && (
                                            <span className="text-xs text-green-400">You</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">No participants yet</p>
                            )}
                        </div>
                    </section>

                    {/* Devices */}
                    <section className="bg-gray-900/70 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Radio className="text-purple-400" size={22} />
                            Connected Devices ({roomData?.devices?.length || 0})
                        </h2>
                        <div className="space-y-3">
                            {roomData?.devices && roomData.devices.length > 0 ? (
                                roomData.devices.map((device, idx) => (
                                    <div key={idx} className="bg-gray-800/60 p-4 rounded-lg flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">
                                                {device.device?.name || `Device ${device.deviceId.slice(0, 8)}`}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {device.device?.status || 'unknown'}
                                            </p>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full ${device.device?.status === 'online' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-gray-400 text-sm">No devices connected</p>
                            )}
                        </div>
                    </section>
                </div>

                {isHost && (
                    <section className="bg-gray-900/70 rounded-xl p-6 border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Settings className="text-yellow-400" size={22} />
                            Host Controls
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition">
                                Start Sync
                            </button>
                            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition">
                                Pause All
                            </button>
                            <button className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition">
                                End Room
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
