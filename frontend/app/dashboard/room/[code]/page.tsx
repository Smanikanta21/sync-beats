"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Share2, Settings, Wifi } from 'lucide-react';
import Link from 'next/link';
import { authFetch } from '@/lib/authFetch';
import { toast } from 'react-hot-toast';
import MusicPlayer from '@/app/components/MusicPlayer';
import RoomQueue from '@/app/components/RoomQueue';
import RoomDevices from '@/app/components/RoomDevices';

export default function RoomPage() {
    const params = useParams();
    const router = useRouter();
    const code = params.code as string;
    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRoomDetails = async () => {
            try {
                const res = await authFetch(`${process.env.NEXT_PUBLIC_API_URL}/api/room/${code}`);
                if (res.ok) {
                    const data = await res.json();
                    setRoom(data.room);
                } else {
                    toast.error("Failed to load room");
                    router.push('/dashboard');
                }
            } catch (error) {
                console.error("Error fetching room:", error);
                toast.error("Error loading room");
            } finally {
                setLoading(false);
            }
        };

        if (code) {
            fetchRoomDetails();
        }
    }, [code, router]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--sb-bg)] flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[var(--sb-primary)] opacity-50"></div>
                    <p className="text-[var(--sb-text-muted)]">Syncing...</p>
                </div>
            </div>
        );
    }

    if (!room) return null;

    return (
        <div className="min-h-screen bg-[var(--sb-bg)] text-[var(--sb-text-main)] font-sans selection:bg-[var(--sb-primary)] selection:text-white pb-20">
            {/* Background Ambience */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-[var(--sb-primary)] opacity-[0.05] blur-[100px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-[var(--sb-secondary)] opacity-[0.05] blur-[120px] rounded-full" />
            </div>

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex justify-center">
                <div className="glass-panel rounded-full px-6 py-3 flex items-center justify-between w-full max-w-7xl">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">{room.name}</h1>
                            <div className="flex items-center gap-2 text-xs text-[var(--sb-text-muted)] font-mono">
                                <span className="bg-[var(--sb-surface-2)] px-1.5 py-0.5 rounded">{room.code}</span>
                                {room.wifiSSID && (
                                    <span className="flex items-center gap-1">
                                        <Wifi size={10} /> {room.wifiSSID}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors"
                            onClick={() => {
                                navigator.clipboard.writeText(window.location.href);
                                toast.success("Room link copied!");
                            }}
                        >
                            <Share2 size={20} />
                        </button>
                        <button className="p-2 rounded-full hover:bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="w-full px-6 pt-28 max-w-7xl mx-auto relative z-10 flex flex-col gap-6">

                {/* Player Section */}
                <section>
                    <MusicPlayer latency={45} />
                </section>

                {/* Grid for Queue and Devices */}
                <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
                    <div className="lg:col-span-2 h-full">
                        <RoomQueue />
                    </div>
                    <div className="h-full">
                        <RoomDevices />
                    </div>
                </section>

            </main>
        </div>
    );
}
