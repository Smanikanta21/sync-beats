"use client"
import { QrCode, ArrowLeft } from "lucide-react"
import { useState } from "react"
import Image from 'next/image';
import { toast } from 'react-toastify';
import { useRouter } from "next/navigation";

export function CreateRoom({ onBack }: { onBack: () => void }) {

    const router = useRouter();

    const [roomName, setRoomName] = useState<string>("");
    const [roomType, setRoomType] = useState<string>("");
    const [qrData, setQrData] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false);
    const [resok, setResok] = useState(false)

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

    const handleCreateRoom = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
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
                toast.success("Room created successfully!");
                // setTimeout(() => {
                //     router.push(`/dashboard/room/${data.room.code}`);
                // }, 1000);
            } else {
                toast.error(data.message || "Failed to create room.");
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
                                <Image src={qrData} alt="Room QR Code" className="rounded-xl shadow-lg border border-gray-300" width={220} height={220} />
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
                    {loading ? (
                        <button className={`px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`} disabled>
                            Creating...
                        </button>
                    ) : resok ? (
                        <button className="px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition" onClick={() => {router.push(`/dashboard/room/${roomCode}`)}}>
                            Start Syncing...
                        </button>
                    ) : (
                        <button className={`px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition`} onClick={handleCreateRoom}>
                            Create Room
                        </button>
                    )}
                </div>
            </div>
        </>
    )
}

export function JoinRoom({ onBack }: { onBack: () => void }) {
    const router = useRouter()
    const [roomCode, setRoomCode] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [joinedRoomData, setJoinedRoomData] = useState<{
        name: string;
        code: string;
        participants?: Array<{ userId: string }>;
    } | null>(null);

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

    const handleJoinRoom = async (code?: string) => {
        const codeToJoin = code || roomCode.trim();
        
        if (!codeToJoin) {
            toast.warning("Please enter a room code");
            return;
        }

        try {
            setLoading(true);
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            const res = await fetch(`${url}/api/joinroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    Authorization: token ? `Bearer ${token}` : "",
                },
                body: JSON.stringify({ code: codeToJoin }),
                credentials: "include"
            });

            const data = await res.json();

            if (res.ok && data.room) {
                setJoined(true);
                setJoinedRoomData(data.room);
                toast.success("Joined room successfully!");
                setTimeout(() => {
                    router.push(`/dashboard/room/${data.room.code}`);
                }, 1000);
            } else {
                toast.error(data.message || "Failed to join room. Please check the room code.");
            }
        } catch (err) {
            console.log("join room err:", err);
            toast.error("Error joining room. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (typeof window !== 'undefined') {
                const img = document.createElement('img');
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = img.width;
                        canvas.height = img.height;
                        context.drawImage(img, 0, 0);
                        toast.info("QR code scanning from image - feature in progress. Please enter the code manually.");
                    }
                };
                img.src = e.target?.result as string;
            }
        };
        reader.readAsDataURL(file);
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
                        <div className="w-full flex gap-2 bg-gray-800/50 p-1 rounded-lg">
                            <button onClick={() => setShowQRScanner(false)} className={`flex-1 py-2 px-4 rounded-md transition ${!showQRScanner ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Enter Code</button>
                            <button onClick={() => setShowQRScanner(true)} className={`flex-1 py-2 px-4 rounded-md transition ${showQRScanner ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Scan QR</button>
                        </div>

                        {!showQRScanner ? (
                            <>
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Enter Room Code
                                    </label>
                                    <input type="number" placeholder="e.g:01357" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="w-full border border-gray-400 rounded-xl py-3 px-4 text-white bg-gray-900/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-2xl tracking-widest" maxLength={5}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleJoinRoom();
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-gray-400 mt-2 text-center">
                                        Press Enter or click the button below to join
                                    </p>
                                </div>

                                <button 
                                    onClick={() => handleJoinRoom()} 
                                    disabled={loading || !roomCode.trim()} 
                                    className={`w-full px-6 py-3 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${(loading || !roomCode.trim()) ? "opacity-50 cursor-not-allowed" : ""}`}
                                >
                                    {loading ? "Joining..." : "Join Room"}
                                </button>
                            </>
                        ) : (
                            <div className="w-full space-y-4">
                                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600 text-center">
                                    <QrCode size={80} className="mx-auto text-blue-400 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Upload a QR code image or paste the room link
                                    </p>
                                    
                                    {/* File Upload */}
                                    <label className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold cursor-pointer transition">
                                        Upload QR Image
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleFileUpload}
                                            className="hidden"
                                        />
                                    </label>
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-gray-500">
                                        Or ask the host to share the room code
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 w-full max-w-md text-center">
                        <div className="w-full bg-green-500/20 border border-green-500 rounded-xl p-6">
                            <h2 className="text-2xl font-bold text-green-400 mb-4">✓ Joined Successfully!</h2>
                            {joinedRoomData && (
                                <div className="text-left space-y-2 mt-4">
                                    <p className="text-sm text-gray-300">
                                        <span className="text-gray-400">Room:</span> {joinedRoomData.name}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                        <span className="text-gray-400">Code:</span> <span className="font-mono text-blue-400">{joinedRoomData.code}</span>
                                    </p>
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