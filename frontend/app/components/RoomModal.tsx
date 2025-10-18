"use client"
import { QrCode } from "lucide-react"
import { useState } from "react"
export default function RoomModal() {
    const [roomName, setRoomName] = useState<string>("");
    const [roomType, setRoomType] = useState<string>("");
    const [qrData, setQrData] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false);
    const [resok,setResok] = useState(false)

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
    const token = localStorage.getItem('token')

    const handleCreateRoom = async () => {
        // if (!roomCode || !roomType) {
        //     alert("Please enter room name and type.");
        //     return;
        // }
        try {
            setLoading(true)
            const res = await fetch(`http://localhost:5001/api/createroom`, {
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
        }finally{
            setLoading(false)
        }
    }

    return (
        <>
            <div className="flex flex-col items-center w-full h-full">
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