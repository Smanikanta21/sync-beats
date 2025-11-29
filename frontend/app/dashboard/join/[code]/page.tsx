"use client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { Music, Users, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { authFetch, getUserIdFromToken } from "@/lib/authFetch"

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

                const res = await authFetch(`${url}/api/verifyroom/${roomcode}`, {
                    method: "GET"
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

            const userId = getUserIdFromToken();
            if (!userId) {
                toast.error("Please login first");
                router.push('/');
                return;
            }

            const res = await authFetch(`${url}/api/joinroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({ code: roomcode })
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
            <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text-main)] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-[var(--sb-primary)]" size={48} />
                    <p className="text-xl">Verifying room...</p>
                </div>
            </div>
        );
    }

    if (roomExists === false) {
        return (
            <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text-main)] flex items-center justify-center p-4">
                <div className="max-w-md w-full glass-card rounded-2xl p-8 border border-[var(--sb-border)] text-center">
                    <AlertCircle className="mx-auto text-red-500 mb-4" size={64} />
                    <h1 className="text-3xl font-bold mb-4">Room Not Found</h1>
                    <p className="text-[var(--sb-text-muted)] mb-6">
                        The room code <span className="text-[var(--sb-primary)] font-mono">{roomcode}</span> {"doesn't"} exist or has expired.
                    </p>
                    <button onClick={() => router.push('/dashboard')} className="w-full px-6 py-3 btn-primary rounded-lg font-semibold transition">Back to Dashboard</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen overflow-y-auto bg-[var(--sb-bg)] text-[var(--sb-text-main)] flex items-center justify-center p-4">
            <div className="max-w-lg w-full glass-card rounded-2xl p-8 border border-[var(--sb-border)]">
                <div className="flex items-center justify-center mb-6">
                    <Music className="text-[var(--sb-primary)] mr-3" size={40} />
                    <h1 className="text-3xl font-bold">SyncBeats</h1>
                </div>

                <div className="bg-[var(--sb-surface-2)] rounded-xl p-6 mb-6 border border-[var(--sb-border)]">
                    <h2 className="text-2xl font-bold mb-4 text-center">Join Room</h2>

                    {roomData && (
                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--sb-text-muted)]">Room Name:</span>
                                <span className="font-semibold">{roomData.name}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--sb-text-muted)]">Room Code:</span>
                                <span className="font-mono text-[var(--sb-primary)] text-xl">{roomcode}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--sb-text-muted)]">Room Type:</span>
                                <span className="capitalize">{roomData.type}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[var(--sb-text-muted)]">Participants:</span>
                                <span className="flex items-center gap-1">
                                    <Users size={16} />
                                    {roomData.participants?.length || 0}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center justify-center gap-2 text-[var(--sb-success)] mb-4">
                        <CheckCircle2 size={20} />
                        <span className="text-sm">Room verified and ready to join</span>
                    </div>
                </div>

                <button onClick={handleJoinRoom} disabled={joining} className={`w-full px-6 py-4 btn-primary rounded-lg font-semibold text-lg transition flex items-center justify-center gap-2 ${joining ? "opacity-50 cursor-not-allowed" : ""}`}>
                    {joining ?
                        (<>
                            <Loader2 className="animate-spin" size={20} />Joining...
                        </>)
                        :
                        (<><Users size={20} />Join Room</>)}
                </button>

                <button onClick={() => router.push('/dashboard')} className="w-full mt-3 px-6 py-3 bg-[var(--sb-surface-2)] hover:bg-[var(--sb-surface-3)] rounded-lg font-semibold transition text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)]">Cancel</button>
            </div>
        </div>
    );
}
