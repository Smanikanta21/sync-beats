"use client"
import { QrCode, ArrowLeft, Camera, Copy, Check, X } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import Image from 'next/image';
import { toast } from 'react-toastify';
import jsQR from 'jsqr';
import { authFetch } from '@/lib/authFetch';
import { motion } from 'framer-motion';

export function CreateRoom({ onBack }: { onBack: () => void }) {
    const [roomName, setRoomName] = useState<string>("");
    const [roomType, setRoomType] = useState<string>("");
    const [qrData, setQrData] = useState<string | null>(null);
    const [roomCode, setRoomCode] = useState<string | null>(null)
    const [loading, setLoading] = useState(false);
    const [resok, setResok] = useState(false)
    const [copied, setCopied] = useState(false);

    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

    const handleCreateRoom = async () => {
        if (!roomName || !roomType) {
            toast.warning("Please fill in all fields");
            return;
        }
        try {
            setLoading(true)
            const res = await authFetch(`${url}/api/createroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({
                    name: roomName,
                    type: roomType
                })
            })
            const data = await res.json()
            if (res.ok && data.room) {
                setResok(true)
                setQrData(data.qrDataURL);
                setRoomCode(data.room.code);
                toast.success("Room created successfully!");
            } else {
                toast.error(data.message || "Failed to create room.");
            }
        } catch (err) {
            console.log("room creation err:", err)
            toast.error("An error occurred");
        } finally {
            setLoading(false)
        }
    }

    const copyCode = () => {
        if (roomCode) {
            navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast.success("Room code copied!");
        }
    }

    return (
        <div className="glass-card bg-[var(--sb-surface-1)] w-full rounded-3xl p-6 md:p-10 relative overflow-hidden border-[var(--sb-primary)]/20">
            <button
                onClick={onBack}
                className="absolute left-6 top-6 p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors z-10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="flex flex-col items-center w-full h-full">
                <div className="w-full text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2">Create Session</h1>
                    <p className="text-[var(--sb-text-muted)]">Set up a new space for your vibe</p>
                </div>

                <div className="flex flex-col md:flex-row justify-center items-start w-full gap-12">
                    {/* Form Section */}
                    <div className="flex-1 w-full flex flex-col gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--sb-text-muted)] ml-1">Room Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Friday Night Jam"
                                className="w-full bg-[var(--sb-surface-1)] border border-[var(--sb-border)] rounded-xl py-3 px-4 text-[var(--sb-text-main)] placeholder-[var(--sb-text-muted)]/50 focus:outline-none focus:border-[var(--sb-primary)] focus:ring-1 focus:ring-[var(--sb-primary)] transition-all"
                                onChange={(e) => setRoomName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[var(--sb-text-muted)] ml-1">Session Type</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setRoomType("single")}
                                    className={`p-4 rounded-xl border transition-all text-left ${roomType === "single" ? "bg-[var(--sb-primary)]/10 border-[var(--sb-primary)] text-[var(--sb-text-main)]" : "bg-[var(--sb-surface-1)] border-[var(--sb-border)] text-[var(--sb-text-muted)] hover:border-[var(--sb-text-muted)]"}`}
                                >
                                    <span className="block font-bold mb-1">Single User</span>
                                    <span className="text-xs opacity-70">Sync my own devices</span>
                                </button>
                                <button
                                    onClick={() => setRoomType("multi")}
                                    className={`p-4 rounded-xl border transition-all text-left ${roomType === "multi" ? "bg-[var(--sb-secondary)]/10 border-[var(--sb-secondary)] text-[var(--sb-text-main)]" : "bg-[var(--sb-surface-1)] border-[var(--sb-border)] text-[var(--sb-text-muted)] hover:border-[var(--sb-text-muted)]"}`}
                                >
                                    <span className="block font-bold mb-1">Group Party</span>
                                    <span className="text-xs opacity-70">Invite friends to join</span>
                                </button>
                            </div>
                        </div>

                        {!resok && (
                            <button
                                onClick={handleCreateRoom}
                                disabled={loading}
                                className={`mt-4 w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${loading
                                    ? "bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] cursor-not-allowed"
                                    : "btn-primary hover:scale-[1.02]"
                                    }`}
                            >
                                {loading ? "Creating..." : "Create Room"}
                            </button>
                        )}
                    </div>

                    {/* QR Section */}
                    <div className="flex-1 w-full flex flex-col items-center justify-center">
                        <div className={`relative p-6 rounded-2xl border-2 border-dashed transition-all duration-500 ${qrData ? "border-[var(--sb-primary)] bg-[var(--sb-primary)]/5" : "border-[var(--sb-border)] bg-[var(--sb-surface-1)]"}`}>
                            {qrData ? (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="flex flex-col items-center"
                                >
                                    <div className="bg-white p-4 rounded-xl shadow-lg mb-4">
                                        <Image src={qrData} alt="Room QR Code" width={200} height={200} />
                                    </div>
                                    <p className="text-sm text-[var(--sb-text-muted)] mb-4">Scan to join instantly</p>

                                    {roomCode && (
                                        <div className="flex items-center gap-2 bg-[var(--sb-surface-2)] p-2 pr-4 rounded-lg border border-[var(--sb-border)]">
                                            <span className="px-3 py-1 bg-[var(--sb-primary)]/20 text-[var(--sb-primary)] rounded font-mono font-bold text-lg tracking-wider">
                                                {roomCode}
                                            </span>
                                            <button onClick={copyCode} className="text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">
                                                {copied ? <Check size={20} className="text-[var(--sb-success)]" /> : <Copy size={20} />}
                                            </button>
                                        </div>
                                    )}
                                </motion.div>
                            ) : (
                                <div className="flex flex-col items-center justify-center w-[250px] h-[250px] text-[var(--sb-text-muted)]">
                                    <QrCode size={64} className="mb-4 opacity-50" />
                                    <p className="text-sm text-center">QR Code will appear here<br />after creation</p>
                                </div>
                            )}
                        </div>

                        {resok && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-8 w-full py-4 rounded-xl btn-primary font-bold text-lg shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2"
                                onClick={() => { window.open(`/dashboard/room/${roomCode}`, '_blank') }}
                            >
                                Enter Session <ArrowLeft size={20} className="rotate-180" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        </div>
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
            const res = await authFetch(`${url}/api/joinroom`, {
                method: "POST",
                headers: {
                    "content-type": "application/json"
                },
                body: JSON.stringify({ code: codeToJoin })
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
            navigator.vibrate(200); 
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
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Camera access requires a secure connection (HTTPS) or localhost.");
                return;
            }
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
        <div className="glass-card bg-[var(--sb-surface-1)] w-full rounded-3xl p-6 md:p-10 relative overflow-hidden border-[var(--sb-primary)]/20">
            <button
                onClick={onBack}
                className="absolute left-6 top-6 p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors z-10"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="flex flex-col items-center w-full h-full">
                <div className="w-full text-center mb-10">
                    <h1 className="text-3xl font-bold mb-2">Join Session</h1>
                    <p className="text-[var(--sb-text-muted)]">Connect to an existing vibe</p>
                </div>

                {!joined ? (
                    <div className="flex flex-col items-center gap-8 w-full max-w-md">
                        {/* Toggle Tabs */}
                        <div className="w-full flex gap-1 bg-[var(--sb-surface-1)] p-1.5 rounded-xl border border-[var(--sb-border)]">
                            <button
                                onClick={() => setShowQRScanner(false)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${!showQRScanner ? 'bg-[var(--sb-primary)] text-white shadow-lg' : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] hover:bg-[var(--sb-surface-2)]'}`}
                            >
                                Enter Code
                            </button>
                            <button
                                onClick={() => setShowQRScanner(true)}
                                className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${showQRScanner ? 'bg-[var(--sb-primary)] text-white shadow-lg' : 'text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] hover:bg-[var(--sb-surface-2)]'}`}
                            >
                                Scan QR
                            </button>
                        </div>

                        {!showQRScanner ? (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full space-y-6"
                            >
                                <div className="w-full">
                                    <label className="block text-sm font-medium text-[var(--sb-text-muted)] mb-2 ml-1">Room Code</label>
                                    <input
                                        type="text"
                                        placeholder="00000"
                                        value={roomCode}
                                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                                        className="w-full border border-[var(--sb-border)] rounded-xl py-4 px-4 text-[var(--sb-text-main)] bg-[var(--sb-surface-1)] placeholder-[var(--sb-text-muted)]/30 focus:outline-none focus:border-[var(--sb-primary)] focus:ring-1 focus:ring-[var(--sb-primary)] text-center text-3xl font-mono tracking-[0.5em] transition-all"
                                        maxLength={5}
                                        onKeyPress={(e) => {
                                            if (e.key === 'Enter') {
                                                handleJoinRoom();
                                            }
                                        }}
                                    />
                                    <p className="text-xs text-[var(--sb-text-muted)] mt-3 text-center">Ask the host for the 5-digit code</p>
                                </div>
                                <button
                                    onClick={() => handleJoinRoom()}
                                    disabled={loading || !roomCode.trim()}
                                    className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${loading || !roomCode.trim()
                                        ? "bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] cursor-not-allowed"
                                        : "btn-primary hover:scale-[1.02]"
                                        }`}
                                >
                                    {loading ? "Joining..." : "Join Room"}
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="w-full space-y-6"
                            >
                                <div className="bg-[var(--sb-surface-1)] rounded-2xl p-6 border border-[var(--sb-border)] text-center">
                                    {!cameraActive ? (
                                        <div className="flex flex-col items-center gap-4 py-8">
                                            <div className="w-20 h-20 rounded-full bg-[var(--sb-surface-2)] flex items-center justify-center text-[var(--sb-primary)] mb-2">
                                                <Camera size={40} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold mb-1">Camera Access</h3>
                                                <p className="text-sm text-[var(--sb-text-muted)] mb-6">
                                                    Scan a QR code directly from your camera
                                                </p>
                                            </div>
                                            <button
                                                onClick={StartCamera}
                                                className="btn-primary px-8 py-3 rounded-xl font-semibold shadow-lg hover:scale-[1.02] transition-all"
                                            >
                                                Open Camera
                                            </button>
                                            <div className="w-full border-t border-[var(--sb-border)] my-2"></div>
                                            <label className="cursor-pointer text-sm text-[var(--sb-primary)] hover:text-[var(--sb-text-main)] transition-colors font-medium flex items-center gap-2 justify-center">
                                                <Copy size={16} /> Upload from Gallery
                                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                                            </label>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden shadow-2xl border border-[var(--sb-border)]">
                                                <video
                                                    ref={videoRef}
                                                    autoPlay
                                                    playsInline
                                                    muted
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    className="w-full h-full object-cover"
                                                ></video>
                                                <canvas ref={canvasRef} className="hidden"></canvas>

                                                {/* Scanner Overlay */}
                                                <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none">
                                                    <div className="absolute inset-0 border-2 border-[var(--sb-primary)]/50 animate-pulse"></div>
                                                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-[var(--sb-primary)]"></div>
                                                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-[var(--sb-primary)]"></div>
                                                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-[var(--sb-primary)]"></div>
                                                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-[var(--sb-primary)]"></div>
                                                </div>

                                                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                                    <p className="text-xs text-white font-medium flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                        Scanning...
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={StopCamera}
                                                className="w-full px-4 py-3 bg-[var(--sb-surface-2)] hover:bg-red-500/20 text-[var(--sb-text-main)] hover:text-red-400 border border-[var(--sb-border)] hover:border-red-500/50 rounded-xl font-semibold transition-all flex items-center justify-center gap-2"
                                            >
                                                <X size={18} /> Close Camera
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center gap-6 w-full max-w-md text-center"
                    >
                        <div className="w-full bg-[var(--sb-success)]/10 border border-[var(--sb-success)]/30 rounded-2xl p-8 flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-[var(--sb-success)]/20 flex items-center justify-center text-[var(--sb-success)] mb-4">
                                <Check size={32} strokeWidth={3} />
                            </div>
                            <h2 className="text-2xl font-bold text-[var(--sb-text-main)] mb-2">Connected!</h2>
                            <p className="text-[var(--sb-text-muted)] mb-6">You have successfully joined the session.</p>

                            {joinedRoomData && (
                                <div className="w-full bg-[var(--sb-bg)]/50 rounded-xl p-4 border border-[var(--sb-border)] text-left space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[var(--sb-text-muted)]">Room Name</span>
                                        <span className="font-semibold text-[var(--sb-text-main)]">{joinedRoomData.name}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-[var(--sb-text-muted)]">Room Code</span>
                                        <span className="font-mono font-bold text-[var(--sb-primary)] tracking-wider">{joinedRoomData.code}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}