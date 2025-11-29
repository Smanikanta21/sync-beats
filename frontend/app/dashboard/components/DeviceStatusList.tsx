"use client"
import React from 'react'

interface Device {
  wsId?: string
  id?: string
  name?: string
  userId?: string
  isHost: boolean
  isReady: boolean
  isPlaying: boolean
  playbackPositionMs?: number
  lastSeen: number
}

interface Props {
  devices: Device[]
}

export const DeviceStatusList: React.FC<Props> = ({ devices }) => {
  return (
    <div className="mt-4 space-y-2">
      <h3 className="text-sm font-semibold tracking-wide text-neutral-300">Devices</h3>
      <ul className="space-y-1">
        {devices.map(d => {
          const offline = Date.now() - d.lastSeen > 8000
          const playing = d.isPlaying
          const posMs = d.playbackPositionMs || 0
          const mm = Math.floor(posMs / 60000)
          const ss = Math.floor((posMs % 60000) / 1000)
          const timeStr = `${mm}:${ss.toString().padStart(2, '0')}`
          return (
            <li key={d.id || d.wsId} className="flex items-center gap-3 p-2 rounded border border-neutral-700" style={{ opacity: offline ? 0.4 : 1 }}>
              <div className={`h-2 w-2 rounded-full ${offline ? 'bg-red-600 animate-pulse' : playing ? 'bg-emerald-500 animate-pulse' : d.isReady ? 'bg-green-500' : 'bg-yellow-500'} transition-colors`}></div>
              <div className="flex flex-col">
                <span className="text-xs font-medium text-neutral-200">{d.userId || d.wsId}{d.isHost ? ' (Host)' : ''}</span>
                <span className="text-[10px] uppercase tracking-wide text-neutral-400">
                  {offline ? 'OFFLINE' : playing ? 'PLAYING' : d.isReady ? 'ACTIVE' : 'LOADING'}
                </span>
              </div>
              {!offline && playing && (
                <span className="text-[10px] font-mono text-emerald-400 ml-auto mr-2">{timeStr}</span>
              )}
              {!offline && (
                <span className="ml-auto text-[10px] text-neutral-500">{Math.round((Date.now() - d.lastSeen) / 1000)}s ago</span>
              )}
            </li>
          )
        })}
        {devices.length === 0 && (
          <li className="text-xs text-neutral-500 italic">No devices connected</li>
        )}
      </ul>
    </div>
  )
}

export default DeviceStatusList
