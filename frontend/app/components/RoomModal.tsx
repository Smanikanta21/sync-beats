"use client"
import { QrCode, ArrowLeft } from "lucide-react"
import { useState } from "react"

export function CreateRoom({ onBack }: { onBack: () => void }) {
    const [roomName, setRoomName] = useState<string>("");
    const [roomType, setRoomType] = useState<string>("");
    const [qrData, setQrData] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false);
    const [resok, setResok] = useState(false)

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
    const token = localStorage.getItem('token')

    const handleCreateRoom = async () => {
        // if (!roomCode || !roomType) {
        //     alert("Please enter room name and type.");
        //     return;
        // }
        try {
            setLoading(true)
            const res = await fetch(`${url}/api/createroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({ name: roomName, type: roomType }),
                credentials: "include"
            })
            const data = await res.json()
            if (res.ok && data.room) {
                setResok(true)
                setQrData(data.qrDataURL);
                setRoomCode(data.room.code);
            } else {
                alert(data.message || "Failed to create room.");
            }
        } catch (err) {
            console.log("room creation err:", err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex flex-col items-center w-full h-full">
                <button onClick={onBack} className="fixed left-4 top-4 flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition"><ArrowLeft size={24} /><span className="text-lg">Back</span></button>
                <div className="w-full justify-center items-center mt-4"><h1 className="text-center text-2xl font-bold">Create A Room</h1></div>
                <div className="flex flex-col md:flex-row justify-evenly items-center w-full h-full gap-4">
                    <div className=" flex flex-col items-center justify-center gap-4">
                        <input type="text" placeholder="Enter Room Name" className="border rounded-xl py-2 px-4" onChange={(e) => setRoomName(e.target.value)} />
                        <select className="border px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400" defaultValue="" onChange={(e) => setRoomType(e.target.value)}>
                            <option value="" disabled>Select Room Type</option>
                            <option value="single">Single User</option>
                            <option value="multi">Multiple Users</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-6 justify-center items-center h-full">
                        {qrData ? (
                            <div className="flex flex-col items-center">
                                <img
                                    src={qrData}
                                    alt="Room QR Code"
                                    className="rounded-xl shadow-lg border border-gray-300"
                                    width={220}
                                    height={220}
                                />
                                <p className="text-sm text-gray-600">Scan this QR to join</p>
                                {roomCode && (
                                    <h1 className="text-xl font-bold text-blue-700">
                                        Room Code: {roomCode}
                                    </h1>
                                )}
                            </div>
                        ) : (
                            <div className="p-2 shadow-white/20 rounded-xl shadow-2xl">
                                <QrCode size={200} />
                            </div>
                        )}
                    </div>
                </div>
                <div className=" flex justify-center items-center mb-8">
                    <button className={`px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`} onClick={handleCreateRoom}>
                        {loading ? "Creating..." : resok ? "Start Syncing" : "Create Room"}
                    </button>
                </div>
            </div>
        </>
    )
}

export function JoinRoom({ onBack }: { onBack: () => void }) {
    const [roomCode, setRoomCode] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [joinedRoomData, setJoinedRoomData] = useState<any>(null);

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
    const token = localStorage.getItem('token')

    const handleJoinRoom = async () => {
        if (!roomCode.trim()) {
            alert("Please enter a room code");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`${url}/api/joinroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({ code: roomCode.trim() }),
                credentials: "include"
            });

            const data = await res.json();

            if (res.ok && data.room) {
                setJoined(true);
                setJoinedRoomData(data.room);
            } else {
                alert(data.message || "Failed to join room. Please check the room code.");
            }
        } catch (err) {
            console.log("join room err:", err);
            alert("Error joining room. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-32 items-center w-full h-full p-6 md:p-8">
                <button onClick={onBack} className="fixed left-4 top-4 flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition"><ArrowLeft size={24} /><span className="text-lg">Back</span></button>

                <div className="w-full text-center mb-8">
                    <h1 className="text-2xl md:text-3xl font-bold">Join A Room</h1>
                </div>

                {!joined ? (
                    <div className="flex flex-col items-center gap-6 w-full max-w-md">
                        <div className="w-full">
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Enter Room Code
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., 12345"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value)}
                                className="w-full border border-gray-400 rounded-xl py-3 px-4 text-white bg-gray-900/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-2xl tracking-widest"
                                maxLength={6}
                            />
                        </div>

                        <button
                            onClick={handleJoinRoom}
                            disabled={loading}
                            className={`w-full px-6 py-3 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            {loading ? "Joining..." : "Join Room"}
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 w-full max-w-md text-center">
                        <div className="w-full bg-green-500/20 border border-green-500 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-green-400 mb-4">✓ Joined Successfully!</h2>
                            {joinedRoomData && (
                                <div className="space-y-3 text-left">
                                    <div>
                                        <p className="text-sm text-gray-400">Room Name</p>
                                        <p className="font-semibold text-white">{joinedRoomData.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Room Code</p>
                                        <p className="font-semibold text-white">{joinedRoomData.code}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Participants</p>
                                        <p className="font-semibold text-white">{joinedRoomData.participants?.length || 0}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={() => {
                                setJoined(false);
                                setRoomCode("");
                                setJoinedRoomData(null);
                            }}
                            className="w-full px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition"
                        >
                            Join Another Room
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}