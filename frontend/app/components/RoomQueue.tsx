"use client";
import React from 'react';
import { ListMusic, GripVertical, Trash2 } from 'lucide-react';

export default function RoomQueue() {
    const queue = [
        { id: 1, title: "Midnight City", artist: "M83", duration: "4:03" },
        { id: 2, title: "Starboy", artist: "The Weeknd", duration: "3:50" },
        { id: 3, title: "Get Lucky", artist: "Daft Punk", duration: "6:09" },
    ];

    return (
        <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <ListMusic className="text-[var(--sb-secondary)]" />
                    Queue
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)]">
                    {queue.length} songs
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {queue.map((song, index) => (
                    <div key={song.id} className="group flex items-center gap-3 p-3 rounded-xl bg-[var(--sb-surface-1)] hover:bg-[var(--sb-surface-2)] border border-transparent hover:border-[var(--sb-border)] transition-all">
                        <div className="text-[var(--sb-text-muted)] cursor-grab active:cursor-grabbing">
                            <GripVertical size={16} />
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-[var(--sb-surface-3)] flex items-center justify-center text-xs font-bold text-[var(--sb-text-muted)]">
                            {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate text-[var(--sb-text-main)]">{song.title}</h4>
                            <p className="text-xs text-[var(--sb-text-muted)] truncate">{song.artist}</p>
                        </div>
                        <div className="text-xs font-mono text-[var(--sb-text-muted)]">
                            {song.duration}
                        </div>
                        <button className="opacity-0 group-hover:opacity-100 p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
