"use client"
import { QrCode, ArrowLeft, Camera } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Image from 'next/image';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';

export function CreateRoom({ onBack }: { onBack: () => void }) {
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
            <div className="flex flex-col items-center w-full h-full py-8">
                <button onClick={onBack} className="fixed left-4 top-4 flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition"><ArrowLeft size={24} /><span className="text-lg">Back</span></button>
                <div className="flex flex-col gap-2">
                    <div className="w-full justify-center items-center mt-4"><h1 className="text-center text-2xl gap-2 mb-12 font-bold">Create A Room</h1></div>
                    <div className="flex flex-col md:flex-row justify-evenly items-center w-full h-full gap-12">
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
                    <div className=" flex justify-center items-center mt-8">
                        {loading ? (
                            <button className={`px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${loading ? "opacity-50 cursor-not-allowed" : ""}`} disabled>
                                Creating...
                            </button>
                        ) : resok ? (
                            <button className="px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition" onClick={() => { window.open(`/dashboard/room/${roomCode}`, '_blank') }}>
                                Start Syncing...
                            </button>
                        ) : (
                            <button className={`px-5 py-2 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition`} onClick={handleCreateRoom}>
                                Create Room
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

export function JoinRoom({ onBack }: { onBack: () => void }) {
    const [roomCode, setRoomCode] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [joined, setJoined] = useState(false);
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [cameraActive, setCameraActive] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const scanIntervalRef = useRef<NodeJS.Timeout | null>(null)
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
                    window.open(`/dashboard/room/${data.room.code}`, '_blank');
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
                        toast.info("QR code scanning from image - in progress. Please enter the code manually.");
                    }
                };
                img.src = e.target?.result as string;
            }
        };
        reader.readAsDataURL(file);
    };


    const vibrateDevice = () => {
        if ('vibrate' in navigator) {
            navigator.vibrate(200); // Vibrate for 200ms
        }
    }

    const scanQRCode = () => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            const context = canvas.getContext('2d');

            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height);

                if (code) {
                    console.log('QR Code detected:', code.data);
                    let detectedCode = code.data;
                    if (detectedCode.includes('/')) {
                        const parts = detectedCode.split('/');
                        detectedCode = parts[parts.length - 1];
                    }
                    vibrateDevice();
                    StopCamera();
                    toast.success(`QR Code detected: ${detectedCode}`);
                    handleJoinRoom(detectedCode);
                }
            }
        }
    }

    const StartCamera = async () => {
        try {
            console.log('Setting camera active state first...');
            setCameraActive(true);
            await new Promise(resolve => setTimeout(resolve, 100));
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            })
            console.log('Camera stream obtained:', stream);
            console.log('Video tracks:', stream.getVideoTracks());
            
            if (videoRef.current) {
                console.log('Video ref exists');
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = async () => {
                    console.log('Video metadata loaded');
                    try {
                        await videoRef.current?.play();
                        console.log('Video playing');
                        toast.success('Camera started! Point at QR code');
                        scanIntervalRef.current = setInterval(scanQRCode, 500);
                    } catch (playError) {
                        console.error('Play error:', playError);
                        toast.error('Failed to start video playback');
                    }
                };
            } else {
                console.error('Video ref is null');
                toast.error('Video element not found');
                setCameraActive(false);
            }
        } catch (e) {
            console.error("Camera access error:", e)
            toast.error('Unable to access camera. Please check your permissions')
            setCameraActive(false);
        }
    }

    const StopCamera = () => {
        if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream
            stream.getTracks().forEach(track => track.stop())
            videoRef.current.srcObject = null
            setCameraActive(false)
        }
    }
    useEffect(() => {
        return () => {
            StopCamera();
        };
    }, [])

    return (
        <>
            <div className="flex flex-col gap-12 md:gap-32 items-center w-full p-6 md:p-8">
                <button onClick={onBack} className="fixed left-4 top-6 flex items-center gap-2 mb-4 text-gray-400 hover:text-white transition"><ArrowLeft size={24} /><span className="text-lg">Back</span></button>

                <div className="w-full text-center">
                    <h1 className="text-2xl md:text-3xl font-bold">Join A Room</h1>
                </div>

                {!joined ? (
                    <div className="flex flex-col items-center gap-6 w-full max-w-md">
                        <div className="w-full flex gap-2 bg-gray-800/50 p-1 rounded-lg">
                            <button onClick={() => setShowQRScanner(false)} className={`flex-1 py-2 px-4 rounded-md transition ${!showQRScanner ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Enter Code</button>
                            <button onClick={() => setShowQRScanner(true)} className={`hidden md:block flex-1 py-2 px-4 rounded-md transition ${showQRScanner ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Join via QR</button>
                            <button onClick={() => setShowQRScanner(true)} className={`md:hidden flex-1 py-2 px-4 rounded-md transition ${showQRScanner ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>scan QR</button>
                        </div>

                        {!showQRScanner ? (
                            <>
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-gray-300 mb-2">Enter Room Code</label>
                                    <input type="number" placeholder="e.g:01357" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="w-full border border-gray-400 rounded-xl py-3 px-4 text-white bg-gray-900/50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center text-2xl tracking-widest" maxLength={5}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleJoinRoom();
                                            }
                                        }} />
                                    <p className="text-xs text-gray-400 mt-2 text-center">Press Enter or click the button below to join</p>
                                </div>
                                <button onClick={() => handleJoinRoom()} disabled={loading || !roomCode.trim()} className={`w-full px-6 py-3 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition ${(loading || !roomCode.trim()) ? "opacity-50 cursor-not-allowed" : ""}`}>{loading ? "Joining..." : "Join Room"}</button>
                            </>
                        ) : (
                            <div className="w-full space-y-4">
                                <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-600 text-center">
                                    <QrCode size={80} className="mx-auto text-blue-400 mb-4" />
                                    <h3 className="text-lg font-semibold mb-2">Scan QR Code</h3>
                                    <p className="text-sm text-gray-400 mb-4">
                                        Upload a QR code image or paste the room link
                                    </p>
                                    <label className="block w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold cursor-pointer transition">Upload QR Image<input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" /></label>
                                </div>

                                <div className="text-center">
                                    <p className="text-xs text-gray-500">Or ask the host to share the room code</p>
                                </div>
                                <div className="md:hidden border-gray-600 p-6 border text-center rounded-xl bg-gray-800/50">
                                    {!cameraActive ? (
                                        <div className="text-center" onClick={StartCamera}>
                                            <Camera className="mx-auto text-blue-400 rounded-lg font-semibold transition" size={80} />
                                            <h3 className="text-lg font-semibold mb-2">Scan a QR Code</h3>
                                            <p className="text-sm text-gray-400 mb-4">Use Camera to join a room</p>
                                        </div>
                                    ) : (<div className="space-y-4">
                                        <div className="relative w-full aspect-square bg-black rounded-lg overflow-hidden">
                                            <video 
                                                ref={videoRef} 
                                                autoPlay 
                                                playsInline
                                                muted
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                className="w-full h-full object-cover"
                                            ></video>
                                            <canvas ref={canvasRef} className="hidden"></canvas>
                                            <div className="absolute inset-0 border-4 border-blue-500 rounded-lg pointer-events-none">
                                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-500"></div>
                                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-500"></div>
                                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-500"></div>
                                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-500"></div>
                                            </div>
                                            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 px-4 py-2 rounded-lg">
                                                <p className="text-xs text-white">Scanning for QR code...</p>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-400 text-center">
                                            Position the QR code within the frame
                                        </p>
                                        <button onClick={StopCamera} className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition">Close Camera
                                        </button>
                                    </div>
                                    )}
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
                        {/* <button onClick={() => {
                                setJoined(false);
                                setRoomCode("");
                                setJoinedRoomData(null);
                            }}className="w-full px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">Join Another Room</button> */}
                    </div>
                )}
            </div>
        </>
    )
}