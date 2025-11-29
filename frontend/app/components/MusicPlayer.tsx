"use client";
import React, { useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Activity } from 'lucide-react';

interface MusicPlayerProps {
    latency?: number;
}

export default function MusicPlayer({ latency = 0 }: MusicPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(30); // Mock progress

    return (
        <div className="glass-card p-6 rounded-3xl flex flex-col gap-6">
            {/* Album Art & Info */}
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--sb-primary)] to-[var(--sb-secondary)] flex items-center justify-center shadow-lg">
                    <span className="text-4xl">🎵</span>
                </div>
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-[var(--sb-text-main)]">No Song Playing</h3>
                    <p className="text-[var(--sb-text-muted)]">Waiting for host...</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="px-3 py-1 rounded-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] flex items-center gap-2 text-xs font-mono text-[var(--sb-text-muted)]">
                        <Activity size={12} className={latency < 100 ? "text-[var(--sb-success)]" : "text-[var(--sb-warning)]"} />
                        {latency}ms
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="h-2 bg-[var(--sb-surface-2)] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-[var(--sb-primary)] rounded-full relative"
                        style={{ width: `${progress}%` }}
                    >
                        <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-md opacity-0 hover:opacity-100 transition-opacity cursor-pointer"></div>
                    </div>
                </div>
                <div className="flex justify-between text-xs text-[var(--sb-text-muted)] font-mono">
                    <span>1:23</span>
                    <span>4:05</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Volume2 size={20} className="text-[var(--sb-text-muted)]" />
                    <div className="w-24 h-1 bg-[var(--sb-surface-2)] rounded-full overflow-hidden">
                        <div className="h-full w-2/3 bg-[var(--sb-text-muted)] rounded-full"></div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <button className="p-2 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">
                        <SkipBack size={24} />
                    </button>
                    <button
                        className="w-14 h-14 rounded-full bg-[var(--sb-primary)] text-white flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary-glow),0.5)] hover:scale-105 transition-transform"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>
                    <button className="p-2 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors">
                        <SkipForward size={24} />
                    </button>
                </div>

                <div className="w-32"></div> {/* Spacer for centering */}
            </div>
        </div>
    );
}
