"use client";
import React,{useState} from 'react';
import { Users, Smartphone, Monitor, Laptop } from 'lucide-react';

export default function RoomDevices() {
    const[Devices,setDevices] = useState([]);


    // const fetchDevices = async() => {
    //     try{
    //         const res = await 
    //     }
    // }

    const getIcon = (type: string) => {
        switch (type) {
            case 'mobile': return <Smartphone size={18} />;
            case 'laptop': return <Laptop size={18} />;
            case 'desktop': return <Monitor size={18} />;
            default: return <Smartphone size={18} />;
        }
    };

    return (
        <div className="glass-card p-6 rounded-3xl flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold flex items-center gap-2">
                    <Users className="text-[var(--sb-accent)]" />
                    Participants
                </h3>
                <span className="text-xs font-medium px-2 py-1 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)]">
                    {devices.filter(d => d.status === 'online').length} online
                </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                {devices.map((device) => (
                    <div key={device.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--sb-surface-1)] border border-[var(--sb-border)]">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${device.status === 'online' ? 'bg-[var(--sb-primary)]/10 text-[var(--sb-primary)]' : 'bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)]'}`}>
                                {getIcon(device.type)}
                            </div>
                            <div>
                                <h4 className="font-medium text-sm text-[var(--sb-text-main)]">{device.name}</h4>
                                <div className="flex items-center gap-2">
                                    <span className={`w-1.5 h-1.5 rounded-full ${device.status === 'online' ? 'bg-[var(--sb-success)]' : 'bg-[var(--sb-text-muted)]'}`}></span>
                                    <span className="text-xs text-[var(--sb-text-muted)] capitalize">{device.status}</span>
                                </div>
                            </div>
                        </div>
                        {device.status === 'online' && (
                            <div className="text-xs font-mono text-[var(--sb-text-muted)]">
                                {device.ping}ms
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
