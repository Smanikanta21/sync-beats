"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Music, Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

export default function JoinRoomPage() {
    const params = useParams();
    const router = useRouter();
    const roomcode = params.code as string

    const [loading, setLoading] = useState(true)
    const [joining, setJoining] = useState(false)
    const [roomExists, setRoomExists] = useState<boolean | null>(null)
    const [roomData, setRoomData] = useState<{
        name: string;
        type: string;
        hostId: string;
        participants: Array<{ userId: string }>;
    } | null>(null)

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

    useEffect(() => {
        const verifyRoom = async () => {
            try {
                setLoading(true)
            
                if (typeof window === 'undefined') {
                    return;
                }
                
                const token = localStorage.getItem("token");
                
                if (!token) {
                    toast.error("Please login first");
                    router.push('/');
                    return;
                }

                const res = await fetch(`${url}/api/verifyroom/${roomcode}`, {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    credentials: "include"
                });

                const data = await res.json();

                if (res.ok && data.room) {
                    setRoomExists(true);
                    setRoomData(data.room);
                } else {
                    setRoomExists(false);
                    toast.error("Room not found or expired");
                }
            } catch (err) {
                console.error("Room verification error:", err);
                setRoomExists(false);
                toast.error("Failed to verify room");
            } finally {
                setLoading(false)
            }
        };

        if (roomcode) {
            verifyRoom();
        }
    }, [roomcode, router, url]);

    const handleJoinRoom = async () => {
        try {
            setJoining(true);
            if (typeof window === 'undefined') {
                return;
            }
            
            const token = localStorage.getItem("token");
            
            if (!token) {
                toast.error("Please login first");
                router.push('/');
                return;
            }

            const res = await fetch(`${url}/api/joinroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ code: roomcode }),
                credentials: "include"
            });

            const data = await res.json();

            if (res.ok && data.room) {
                toast.success("Joined room successfully!");
                setTimeout(() => {
                    router.push(`/dashboard/room/${roomcode}`);
                }, 1000);
            } else {
                toast.error(data.message || "Failed to join room");
            }
        } catch (err) {
            console.error("Join room error:", err);
            toast.error("Error joining room. Please try again.");
        } finally {
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-400" size={48} />
                    <p className="text-xl">Verifying room...</p>
                </div>
            </div>
        );
    }

    if (roomExists === false) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-gray-900/70 rounded-2xl p-8 border border-gray-700 text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
                    <h1 className="text-3xl font-bold mb-4">Room Not Found</h1>
                    <p className="text-gray-400 mb-6">
                        The room code <span className="text-blue-400 font-mono">{roomcode}</span> {"doesn't"} exist or has expired.
                    </p>
                    <button onClick={() => router.push('/dashboard')}className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-y-auto bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-gray-900/70 rounded-2xl p-8 border border-gray-700">
                <div className="flex items-center justify-center mb-6">
                    <Music className="text-blue-400 mr-3" size={40} />
                    <h1 className="text-3xl font-bold">SyncBeats</h1>
                </div>

                <div className="bg-gray-800/60 rounded-xl p-6 mb-6 border border-gray-700">
                    <h2 className="text-2xl font-bold mb-4 text-center">Join Room</h2>
                    
                    {roomData && (
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Room Name:</span>
                                <span className="font-semibold">{roomData.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Room Code:</span>
                                <span className="font-mono text-blue-400 text-xl">{roomcode}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Room Type:</span>
                                <span className="capitalize">{roomData.type}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-400">Participants:</span>
                                <span className="flex items-center gap-1">
                                    <Users size={16} />
                                    {roomData.participants?.length || 0}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                        <CheckCircle2 size={20} />
                        <span className="text-sm">Room verified and ready to join</span>
                    </div>
                </div>

                <button onClick={handleJoinRoom} disabled={joining} className={`w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2 ${joining ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {joining ? 
                    (<>
                    <Loader2 className="animate-spin" size={20} />Joining...
                    </>)
                        : 
                    (<><Users size={20} />Join Room</>)}
                </button>

                <button onClick={() => router.push('/dashboard')}className="w-full mt-3 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition">Cancel</button>
            </div>
        </div>
    );
}
