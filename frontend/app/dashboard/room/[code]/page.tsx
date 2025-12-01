"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    Monitor,
    Smartphone,
    Laptop,
    Users,
    ListMusic,
    Copy,
    QrCode,
    UserPlus,
    X,
    Search
} from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";
import MusicPlayer from "@/app/components/MusicPlayer";

const url = process.env.NEXT_PUBLIC_API_URL;
interface Device {
    id: string;
    name: string;
    type: string;
    status: string;
}
interface Participant {
    id: string;
    name: string;
    avatar: string;
    devices: (Device & { isActive: boolean; latency: number; signal: number })[];
}

interface SearchUser {
    id: string;
    name: string;
    username: string;
}




export default function RoomPlayerPage() {

    const code = useParams().code as string;
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [roomName, setRoomName] = useState("");
    const [loading, setLoading] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showQrModal, setShowQrModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchRoom = async () => {
            try {
                const token = localStorage.getItem('authToken');
                const res = await fetch(`${url}/api/room/${code}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const data = await res.json();

                if (data.room) {
                    setRoomName(data.room.name);
                    const roomDevices = data.room.connectedDevices.map((rd: { devices: { id: string } }) => rd.devices.id);

                    const mappedParticipants = data.room.participants.map((p: { user: { id: string; name: string; devices: Device[] } }) => ({
                        id: p.user.id,
                        name: p.user.name,
                        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.user.name)}&background=random`,
                        devices: p.user.devices.map((d: Device) => ({
                            id: d.id,
                            name: d.name,
                            type: d.type,
                            status: d.status,
                            isActive: roomDevices.includes(d.id),
                            latency: Math.floor(Math.random() * 150) + 10,
                            signal: Math.floor(Math.random() * 4) + 1,
                        }))
                    }));
                    setParticipants(mappedParticipants);
                }
            } catch (error) {
                console.error("Failed to fetch room:", error);
                toast.error("Failed to load room details");
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchRoom();
        }
    }, [code]);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(code);
        toast.success("Room code copied!");
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.length > 2) {
            setIsSearching(true);
            setTimeout(() => {
                setSearchResults([
                    { id: 'u1', name: 'John Doe', username: 'johndoe' },
                    { id: 'u2', name: 'Jane Smith', username: 'janesmith' },
                ].filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.username.includes(query.toLowerCase())));
                setIsSearching(false);
            }, 500);
        } else {
            setSearchResults([]);
        }
    };

    const getDeviceIcon = (type: string | undefined | null) => {
        if (!type) return <Monitor size={16} />;
        switch (type.toLowerCase()) {
            case "phone || android": return <Smartphone size={16} />;
            case "laptop || mac": return <Laptop size={16} />;
            case "desktop": return <Monitor size={16} />;
            default: return <Monitor size={16} />;
        }
    };

    const getSignalIcon = (strength: number) => {
        return (
            <div className="flex items-end gap-0.5 h-3">
                {[1, 2, 3, 4].map((bar) => (
                    <div
                        key={bar}
                        className={`w-1 rounded-sm ${bar <= strength ? 'bg-current' : 'bg-white/10'}`}
                        style={{ height: `${bar * 25}%` }}
                    />
                ))}
            </div>
        );
    };

    const getLatencyColor = (ms: number) => {
        if (ms < 50) return "text-green-400";
        if (ms < 100) return "text-yellow-400";
        return "text-red-400";
    };

    const PLAYLIST = [
        {
            title: '/audio/Blinding%20Lights.mp3',
            artist: 'The Weeknd',
            album: 'After Hours',
            cover: 'https://upload.wikimedia.org/wikipedia/en/e/e6/The_Weeknd_-_Blinding_Lights.png',
        },
        {
            title: '/audio/Double%20Take.mp3',
            artist: 'Dhruv',
            album: 'Double Take',
            cover: 'https://i.scdn.co/image/ab67616d0000b27341e31d6ea1d493dd77933ee5',
        },
        {
            title: '/audio/Starboy.mp3',
            artist: 'The Weeknd',
            album: 'Starboy',
            cover: 'https://upload.wikimedia.org/wikipedia/en/3/39/The_Weeknd_-_Starboy.png',
        },
        {
            title: '/audio/Sunflower.mp3',
            artist: 'Post Malone & Swae Lee',
            album: 'Spider-Man: Into the Spider-Verse',
            cover: 'https://upload.wikimedia.org/wikipedia/en/2/22/Post_Malone_and_Swae_Lee_-_Sunflower.png',
        }
    ];

    const [currentSongIndex, setCurrentSongIndex] = useState(0);

    const handleNext = () => {
        setCurrentSongIndex((prev) => (prev + 1) % PLAYLIST.length);
    };

    const handlePrev = () => {
        setCurrentSongIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
    };

    const currentSong = PLAYLIST[currentSongIndex];

    return (
        <div className="min-h-screen w-full bg-[#121212] text-white overflow-hidden relative font-sans selection:bg-pink-500/30 pb-32">
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="relative z-10 max-w-4xl mx-auto p-6 pt-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">{roomName || "Loading..."}</h1>
                        <div className="flex items-center gap-2 text-white/50 text-sm">
                            <span>Code: <span className="font-mono text-white/80">{code}</span></span>
                            <button onClick={copyToClipboard} className="hover:text-white transition-colors p-1 rounded-md hover:bg-white/10" title="Copy Code">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={() => setShowQrModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-medium transition-all"><QrCode size={16} /><span>QR Code</span></button>
                        <button onClick={() => setShowInviteModal(true)} className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-full text-sm font-medium transition-all shadow-lg shadow-white/5"><UserPlus size={16} /><span>Add Member</span></button>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 w-fit rounded-full text-sm font-medium mb-6 border border-white/5">
                    <Users size={16} className="text-white/60" />
                    <span>{participants.length} Active Members</span>
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {participants.map((participant) => (
                            <div key={participant.id} className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors group">
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="relative">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-white/20 transition-colors">
                                            <Image src={participant.avatar} alt={participant.name} width={48} height={48} className="object-cover" />
                                        </div>
                                        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#121212] rounded-full" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg text-white/90">{participant.name}</p>
                                        <p className="text-sm text-white/40">Host • Online</p>
                                    </div>
                                </div>
                                <div className="pl-6 md:pl-8 relative">
                                    <div className="absolute left-6 md:left-8 top-0 bottom-4 w-px bg-white/10" />
                                    {participant.devices.length > 0 ? (
                                        <div className="space-y-2">
                                            {participant.devices.map((device) => (
                                                <div
                                                    key={device.id}
                                                    className={`relative flex items-center gap-4 p-3 rounded-xl text-sm transition-all ml-4 ${device.isActive
                                                        ? "bg-white/10 text-white shadow-sm border border-white/5"
                                                        : "text-white/50 hover:bg-white/5 hover:text-white/80"
                                                        }`}
                                                >
                                                    <div className="absolute -left-4 top-1/2 w-4 h-px bg-white/10" />
                                                    <span className={device.isActive ? "text-green-400" : "opacity-60"}>
                                                        {getDeviceIcon(device.type)}
                                                    </span>

                                                    <div className="flex-1 flex flex-col">
                                                        <span className="font-medium">{device.name}</span>
                                                        {device.isActive && <span className="text-[10px] uppercase tracking-wider text-green-400/80 font-bold">Syncing</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <div className={`flex items-center gap-1.5 text-xs font-mono ${getLatencyColor(device.latency)}`}>
                                                            <span>{device.latency}ms</span>
                                                            <div className={device.latency < 50 ? "text-green-400" : device.latency < 100 ? "text-yellow-400" : "text-red-400"}>
                                                                {getSignalIcon(device.signal)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {device.isActive && (
                                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.5)]" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="ml-4 pl-4 py-2 text-sm text-white/20 italic relative">
                                            <div className="absolute -left-0 top-1/2 w-4 h-px bg-white/10" />
                                            No active devices
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {showQrModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowQrModal(false)}>
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl transform scale-100 transition-all" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Room QR Code</h3>
                            <button onClick={() => setShowQrModal(false)} className="text-white/50 hover:text-white"><X size={24} /></button>
                        </div>
                        <div className="bg-white p-4 rounded-xl inline-block mb-6">
                            <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(window.location.href)}`} alt="Room QR Code" width={192} height={192} className="w-48 h-48" unoptimized />
                        </div>
                        <p className="text-white/50 text-sm mb-6">Scan to join <span className="text-white font-medium">{roomName}</span></p>
                        <button onClick={copyToClipboard} className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-medium transition-colors"><Copy size={18} />Copy Link</button>
                    </div>
                </div>
            )}
            {showInviteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowInviteModal(false)}>
                    <div className="bg-[#1c1c1e] border border-white/10 rounded-3xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Add Member</h3>
                            <button onClick={() => setShowInviteModal(false)} className="text-white/50 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={20} />
                            <input type="text" placeholder="Search by username..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors" autoFocus />
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {isSearching ? (
                                <div className="text-center py-8 text-white/30">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                searchResults.map(user => (
                                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-sm font-bold">
                                                {user.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-medium">{user.name}</p>
                                                <p className="text-xs text-white/40">@{user.username}</p>
                                            </div>
                                        </div>
                                        <button className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-full hover:bg-white/90 transition-colors">
                                            Invite
                                        </button>
                                    </div>
                                ))
                            ) : searchQuery.length > 2 ? (
                                <div className="text-center py-8 text-white/30">No users found</div>
                            ) : (
                                <div className="text-center py-8 text-white/30">Type to search users</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 md:p-6 z-50 bg-gradient-to-t from-[#121212] via-[#121212]/90 to-transparent">
                <div className="max-w-4xl mx-auto w-full">
                    <MusicPlayer src={currentSong.title} title={currentSong.title.split('/').pop()?.replace('.mp3', '') || "Unknown Song"} artist={currentSong.artist} cover={currentSong.cover} latency={12} onNext={handleNext} onPrev={handlePrev} />
                </div>
            </div>

        </div>
    );
}
