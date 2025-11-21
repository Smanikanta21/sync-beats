"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import TimeSyncCalculator from "@/lib/TimeSyncCalculator"
import WebAudioScheduler from "@/lib/WebAudioScheduler"
import { url } from "inspector"

interface SyncConfig {
  roomCode: string
  userId: string | null
  hostId: string
  audioRef: React.RefObject<HTMLAudioElement>
  onSync?: (data: SyncMessage) => void
  onError?: (error: string) => void
  onPositionUpdate?: (data: { positionMs: number; clampedMs: number; durationMs: number; playing: boolean }) => void
}

interface PlaybackState {
  isPlaying: boolean
  currentPosition: number
  serverOffsetMs: number
  drift: number
  rttMs: number
  latencyMs: number
}

interface PlaySyncMessage {
  type: 'PLAY_SYNC'
  audioUrl: string
  duration: number
  playbackPosition: number
  startServerMs: number
  serverNow: number
  masterClockMs: number
  isPlaying?: boolean
}

interface PlayMessage {
  type: 'PLAY'
  audioUrl: string
  duration: number
  startServerMs: number
  serverNow: number
  startDelayMs: number
  masterClockMs: number
  masterClockLatencyMs: number
  timestamp: number
}

interface PrepareTrackMessage {
  type: 'PREPARE_TRACK'
  audioUrl: string
  duration: number
  checkId: string
  timestamp: number
}

interface PauseMessage {
  type: 'PAUSE'
  pausedAt: number
  pausedAtMs: number
  timestamp: number
}

interface ResumeMessage {
  type: 'RESUME'
  resumeServerMs: number
  serverNow: number
  masterClockMs: number
  timestamp: number
  playbackPositionMs?: number
}

interface SeekMessage {
  type: 'SEEK'
  seekPositionMs: number
  seekServerMs: number
  serverNow: number
  timestamp: number
}

interface TrackChangeMessage {
  type: 'TRACK_CHANGE'
  trackData: {
    id: string
    title: string
    artist: string
    duration: number
    audioUrl: string
  }
  timestamp: number
}

interface ResyncMessage {
  type: 'RESYNC'
  correctPosition: number
  correctPositionMs: number
  serverNow: number
  timestamp: number
}

export type SyncMessage = PlaySyncMessage | PlayMessage | PauseMessage | ResumeMessage | SeekMessage | TrackChangeMessage | ResyncMessage | PrepareTrackMessage | Record<string, unknown>

export type { PlaySyncMessage, PlayMessage, PauseMessage, ResumeMessage, SeekMessage, TrackChangeMessage, ResyncMessage }

const isMobileDevice = (): boolean => {
  if (process.env.PRODUCTION === 'true') return false
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|android|mobile|tablet|blackberry|windows phone/.test(userAgent)
}

const isDevelopment = (): boolean => {
  if (typeof window === 'undefined') return false
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
}

export function useSyncPlayback({
  roomCode,
  userId,
  hostId,
  audioRef,
  onSync,
  onError,
  onPositionUpdate
}: SyncConfig) {
  const isMobile = isMobileDevice()
  const devMode = isDevelopment()
  
  const log = (message: string, data?: Record<string, any>): void => {
    if (devMode) {
      if (data) {
        console.log(message, data)
      } else {
        console.log(message)
      }
    }
  }
  
  const wsRef = useRef<WebSocket | null>(null)
  const onSyncRef = useRef(onSync)
  const onErrorRef = useRef(onError)
  const onPositionUpdateRef = useRef(onPositionUpdate)
  
  
  const timeSyncCalcRef = useRef<TimeSyncCalculator>(new TimeSyncCalculator(8))
  const schedulerRef = useRef<WebAudioScheduler | null>(null)
  const webAudioDisabledRef = useRef<boolean>(false)
  
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentPosition: 0,
    serverOffsetMs: 0,
    drift: 0,
    rttMs: 0,
    latencyMs: 0
  })

  

  useEffect(() => {
    onSyncRef.current = onSync
    onErrorRef.current = onError
    onPositionUpdateRef.current = onPositionUpdate
  }, [onSync, onError, onPositionUpdate])

  const isHost = userId === hostId
  const timeSyncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const driftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const driftAutoCorrectIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const positionRafRef = useRef<number | null>(null)
  const lastPositionPushRef = useRef<number>(0)
  const trackDurationRef = useRef<number>(0)

  const syncClientTime = useCallback(() => {
    const ws = wsRef.current
    if (!ws) return
    if (ws.readyState !== 1) return
    try {
      const t0 = Date.now()
      const pingId = Math.random().toString(36)
      ws.send(JSON.stringify({ type: "time_ping", id: pingId, t0 }))
    } catch (e) {
      if (devMode) console.warn('⚠️ time_ping send failed', e)
    }
  }, [devMode])

  const startPingBurst = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== 1) return
    const burstCount = 7
    const totalWindowMs = 500
    const spacing = Math.floor(totalWindowMs / (burstCount - 1))
    for (let i = 0; i < burstCount; i++) {
      setTimeout(() => {
        if (!wsRef.current || wsRef.current.readyState !== 1) return
        syncClientTime()
      }, i * spacing)
    }
  }, [syncClientTime])

  const handleTimePong = useCallback((msg: Record<string, unknown>) => {
    const t0 = msg.t0 as number
    const t1 = Date.now()
    const serverTimeUnix = msg.serverTimeUnix as number
    const serverTimeMonotonic = msg.serverTimeMonotonic as number | undefined
    const sample = timeSyncCalcRef.current.addSample(t0, t1, serverTimeUnix)
    if (typeof serverTimeMonotonic === 'number') {
      ;(timeSyncCalcRef.current as any)._monotonicToUnixDelta = serverTimeUnix - serverTimeMonotonic
    }
    const rtt = sample.rtt
    const latency = sample.latency
    setPlaybackState(prev => ({
      ...prev,
      serverOffsetMs: sample.filteredOffset ?? sample.offset,
      drift: sample.jitter,
      rttMs: rtt,
      latencyMs: latency
    }))
  }, [log])

  const scheduleSync = useCallback(async (
    audioUrl: string,
    masterClockMs: number,
    duration: number,
    masterClockLatencyMs: number,
    playbackPosition: number = 0
  ) => {
    if (!schedulerRef.current) {
      console.error("❌ Scheduler not initialized")
      return
    }

    try {
      console.log("📱 Scheduling playback with Web Audio API:", { 
        audioUrl: audioUrl.substring(0, 40), 
        masterClockMs, 
        masterClockLatencyMs,
        playbackPosition,
        isMobile 
      })

      await schedulerRef.current.schedule({
        audioUrl,
        playbackPosition,
        masterClockMs,
        masterClockLatencyMs,
        durationMs: duration,
        monotonicToUnixDelta: (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0,
        filteredOffset: timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
      })
      trackDurationRef.current = duration
      if (positionRafRef.current === null) {
        const loop = () => {
          positionRafRef.current = requestAnimationFrame(loop)
          if (!schedulerRef.current || !playbackState.isPlaying) return
          const rawPos = schedulerRef.current.getCurrentPosition()
          const clamped = Math.min(rawPos, trackDurationRef.current)
          const now = performance.now()
          if (now - lastPositionPushRef.current > 33) {
            lastPositionPushRef.current = now
            setPlaybackState(prev => ({ ...prev, currentPosition: clamped }))
            if (onPositionUpdateRef.current) {
              onPositionUpdateRef.current({ positionMs: rawPos, clampedMs: clamped, durationMs: trackDurationRef.current, playing: playbackState.isPlaying })
            }
            const el = audioRef.current
            if (el && !el.paused) {
              const desiredSeconds = clamped / 1000
              if (Math.abs(el.currentTime - desiredSeconds) > 0.25) {
                try { el.currentTime = desiredSeconds } catch {}
              }
            }
          }
        }
        positionRafRef.current = requestAnimationFrame(loop)
      }

      setPlaybackState(prev => ({ ...prev, isPlaying: true }))
    } catch (err) {
      console.error("❌ Failed to schedule playback:", err)
      onErrorRef.current?.(`Playback scheduling failed: ${err}`)
    }
  }, [])

  const audioHelpers = useRef({
    ensureSrc: (src: string) => {
      const el = audioRef.current;
      if (!el) return;
      if (el.src !== src) {
        try {
          el.src = src;
          el.load();
        } catch (e) {
          console.warn('Audio ensureSrc failed', e);
        }
      }
    },
    play: async () => {
      const el = audioRef.current;
      if (!el) return;
      if (el.readyState < 2) {
        await new Promise<void>(resolve => {
          const onCanPlay = () => { el.removeEventListener('canplay', onCanPlay); resolve(); };
          el.addEventListener('canplay', onCanPlay, { once: true });
          setTimeout(resolve, 1500);
        });
      }
      try {
        const p = el.play();
        if (p && typeof p.then === 'function') await p.catch(err => {
          console.warn('HTMLAudio play failed', err);
        });
      } catch (e:any) {
        console.warn('Safe play caught', e?.name || e);
      }
    },
    pause: () => {
      const el = audioRef.current;
      if (!el || el.paused) return;
      try { el.pause(); } catch (e) { console.warn('Safe pause error', e); }
    },
    seek: (ms: number) => {
      const el = audioRef.current;
      if (!el) return;
      try { el.currentTime = ms / 1000; } catch (e) { console.warn('Seek failed', e); }
    }
  });

  useEffect(() => {
    const unlock = async () => {
      if (schedulerRef.current) {
        try {
          await schedulerRef.current.initialize();
          await schedulerRef.current.resumeContext();
        } catch (e) {
          console.warn("AudioContext unlock attempt failed", e);
        }
      }
    };
    const handler = () => {
      unlock();
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
    };
    window.addEventListener('touchstart', handler, { passive: true });
    window.addEventListener('click', handler);
    return () => {
      window.removeEventListener('touchstart', handler);
      window.removeEventListener('click', handler);
    };
  }, []);

  const play = useCallback((
    audioUrl: string,
    duration: number,
    startDelayMs: number = 200
  ) => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("▶️ PLAY command sent:", { audioUrl: audioUrl.substring(0, 40), duration, startDelayMs })
    wsRef.current.send(JSON.stringify({
      type: "PLAY",
      roomCode,
      audioUrl,
      duration,
      startDelayMs,
      rttMs: playbackState.rttMs,
      timestamp: Date.now()
    }))

    setPlaybackState(prev => ({ ...prev, isPlaying: true }))
  }, [roomCode, playbackState.rttMs])

  const pause = useCallback(() => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    const currentPosition = schedulerRef.current?.getCurrentPosition() || 0
    console.log("⏸️ PAUSE command sent:", { currentPosition: currentPosition.toFixed(0) })
    
    if (schedulerRef.current) {
      schedulerRef.current.pause()
    }

    wsRef.current.send(JSON.stringify({
      type: "PAUSE",
      roomCode,
      currentTime: currentPosition / 1000,
      timestamp: Date.now()
    }))

    setPlaybackState(prev => ({ ...prev, isPlaying: false }))
  }, [roomCode])

  const resume = useCallback(() => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    const currentPosition = schedulerRef.current?.getCurrentPosition() || 0
    console.log("▶️ RESUME command requested:", { currentPosition: currentPosition.toFixed(0) })

    wsRef.current.send(JSON.stringify({
      type: "RESUME",
      roomCode,
      currentTime: currentPosition / 1000,
      startDelayMs: 200,
      timestamp: Date.now()
    }))
  }, [roomCode])

  const seek = useCallback((positionMs: number) => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("⏩ SEEK command sent:", { positionMs, positionSeconds: (positionMs / 1000).toFixed(2) })

    wsRef.current.send(JSON.stringify({
      type: "SEEK",
      roomCode,
      seekPositionMs: positionMs,
      timestamp: Date.now()
    }))
  }, [roomCode])

  const checkDrift = useCallback(() => {
    if (!schedulerRef.current || !playbackState.isPlaying) return

    const clientPosition = schedulerRef.current.getCurrentPosition()

    if (!wsRef.current) return

    if (devMode) {
      console.log(`⏱️ Drift check - Web Audio position: ${clientPosition.toFixed(0)}ms`)
    }

    wsRef.current.send(JSON.stringify({
      type: "sync_check",
      roomCode,
      clientPosition,
      timestamp: Date.now()
    }))
  }, [devMode, roomCode, playbackState.isPlaying])

  const autoCorrectLocalDrift = useCallback(() => {
    if (!schedulerRef.current || !playbackState.isPlaying) return
    const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
    const monotonicDelta = (timeSyncCalcRef.current as any)._monotonicToUnixDelta
    if (typeof monotonicDelta !== 'number') return
    schedulerRef.current.autoCorrectDrift(filteredOffset, monotonicDelta)
  }, [playbackState.isPlaying])

  const trackChange = useCallback((trackData: {
    id: string
    title: string
    artist: string
    duration: number
    audioUrl: string
  }) => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("TRACK_CHANGE command sent:", { title: trackData.title, artist: trackData.artist })
    wsRef.current.send(JSON.stringify({
      type: "TRACK_CHANGE",
      roomCode,
      trackData,
      timestamp: Date.now()
    }))
  }, [isHost])

  useEffect(() => {
    let isMounted = true
    let reconnectTimeout: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 5

    if (!roomCode || !userId || !hostId) {
      if (devMode) console.log('[SyncPlayback] Deferring WS connect until identifiers ready', { roomCode, userId, hostId })
      return () => {}
    }

    const connect = () => {
      const urlcheck = process.env.NEXT_PUBLIC_PRODUCTION
      const rawSocketHost = process.env.NEXT_PUBLIC_SOCKET_URL
      const socketsserver = (rawSocketHost && rawSocketHost !== 'undefined' && rawSocketHost.trim() !== '') ? rawSocketHost.trim() : 'localhost:6001'
      const portFallback = process.env.NEXT_PUBLIC_SOCKET_PORT || '6001'
      if (!isMounted) return
      let url: string
      if (urlcheck === 'true') {
        url = `wss://sync-beats-backend.onrender.com/ws/sync?roomCode=${roomCode}&userId=${userId}`
      } else {
        const isSecurePage = typeof window !== 'undefined' && window.location && window.location.protocol === 'https:'
        const hostWithPort = socketsserver.includes(':') ? socketsserver : `${socketsserver}:${portFallback}`
        let selectedHost = hostWithPort
        if (isSecurePage && (selectedHost.includes('localhost') || selectedHost.includes('127.0.0.1'))) {
          if (devMode) console.warn('[SyncPlayback] HTTPS page cannot use ws://localhost. Falling back to public WSS host.')
          selectedHost = 'sync-beats-backend.onrender.com'
        }
        const scheme = isSecurePage ? 'wss' : 'ws'
        url = `${scheme}://${selectedHost}/ws/sync?roomCode=${roomCode}&userId=${userId}`
      }
      if (devMode) {
        console.log('[SyncPlayback] WS resolved host:', { rawSocketHost, socketsserver, urlcheck, finalUrl: url })
      }

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          console.log("Sync WebSocket connected")
          console.log("Mobile Connection:", { isMobile, roomCode, userId, isHost })
          reconnectAttempts = 0
          if (!schedulerRef.current) {
            try {
              schedulerRef.current = new WebAudioScheduler(timeSyncCalcRef.current)
              schedulerRef.current.initialize().then(() => {
                console.log("Web Audio Scheduler initialized")
              }).catch(err => {
                console.warn("Web Audio initialization deferred (needs user interaction):", err)
              })
            } catch (err) {
              console.error("Failed to create scheduler:", err)
            }
          }

          ws.send(JSON.stringify({
            type: "join",
            roomCode,
            userId,
            hostId
          }))
          startPingBurst();
          timeSyncIntervalRef.current = setInterval(startPingBurst, 800)
          driftCheckIntervalRef.current = setInterval(checkDrift, 4000)
          driftAutoCorrectIntervalRef.current = setInterval(autoCorrectLocalDrift, 1500)
        }

        ws.onmessage = (event) => {
          const msg = JSON.parse(event.data) as SyncMessage

          if (msg.type === "device_health_check") {
            const { checkId } = msg as any
            console.log("🏥 Received device health check", { checkId })
            const audioLoaded = schedulerRef.current?.hasBuffer() || false
            const deviceReady = audioLoaded
            wsRef.current?.send(JSON.stringify({
              type: "device_health_check_response",
              checkId,
              audioLoaded,
              deviceReady,
              timestamp: Date.now()
            }))
          }

          if (msg.type === "PREPARE_TRACK") {
            const prepMsg = msg as PrepareTrackMessage
            console.log("🎬 PREPARE_TRACK received, preloading:", { url: prepMsg.audioUrl.substring(0,40), duration: prepMsg.duration })
            ;(async () => {
              try {
                // Initialize scheduler if needed
                if (!schedulerRef.current) {
                  schedulerRef.current = new WebAudioScheduler(timeSyncCalcRef.current)
                  await schedulerRef.current.initialize()
                }
                audioHelpers.current.ensureSrc(prepMsg.audioUrl)
                await schedulerRef.current.loadAudio(prepMsg.audioUrl)
                if (wsRef.current) {
                  // Inform server track buffered & device is ready
                  wsRef.current.send(JSON.stringify({
                    type: 'device_health_check_response',
                    roomCode,
                    checkId: prepMsg.checkId,
                    audioLoaded: true,
                    deviceReady: true,
                    rttMs: playbackState.rttMs,
                    timestamp: Date.now()
                  }))
                  // Optional: still send track_prepared for legacy observers
                  wsRef.current.send(JSON.stringify({
                    type: 'track_prepared',
                    roomCode,
                    checkId: prepMsg.checkId,
                    audioUrl: prepMsg.audioUrl,
                    timestamp: Date.now()
                  }))
                }
                console.log("✅ Track preloaded")
              } catch (e) {
                console.error("❌ Failed to preload track", e)
                onErrorRef.current?.("Failed to preload track")
              }
            })()
          }

          if (msg.type === "time_pong") {
            handleTimePong(msg as Record<string, unknown>)
          }

          if (msg.type === "PLAY_SYNC") {
            const playSyncMsg = msg as PlaySyncMessage
            console.log("🎵 PLAY_SYNC message received (late join):", { 
              audioUrl: playSyncMsg.audioUrl?.substring(0, 40), 
              playbackPosition: playSyncMsg.playbackPosition, 
              masterClockMs: playSyncMsg.masterClockMs,
              duration: playSyncMsg.duration 
            })

            // Use scheduler with master clock for precise sync
            const latencyMs = playbackState.latencyMs || 20
            scheduleSync(
              playSyncMsg.audioUrl,
              playSyncMsg.masterClockMs,
              playSyncMsg.duration,
              latencyMs,
              playSyncMsg.playbackPosition
            ).catch(err => {
              console.error("Failed to schedule PLAY_SYNC:", err)
            })

            setPlaybackState(prev => ({ ...prev, isPlaying: playSyncMsg.isPlaying || false }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "PLAY") {
            const playMsg = msg as PlayMessage
            console.log("🎵 PLAY message received:", { audioUrl: playMsg.audioUrl?.substring(0, 40), masterClockMs: playMsg.masterClockMs, masterClockLatencyMs: playMsg.masterClockLatencyMs, duration: playMsg.duration })
            audioHelpers.current.ensureSrc(playMsg.audioUrl)
            scheduleSync(playMsg.audioUrl, playMsg.masterClockMs, playMsg.duration, playMsg.masterClockLatencyMs, 0).catch(err => console.error("Failed to schedule PLAY:", err))
            // Attempt HTML element play for UI alignment
            audioHelpers.current.play();
            setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            onSyncRef.current?.(playMsg)
          }

          if (msg.type === "device_ready") {
            const { wsId } = msg as any
            console.log("✅ Device is ready:", wsId)
          }

          if (msg.type === "PAUSE") {
            const pauseMsg = msg as PauseMessage
            console.log("⏸️ PAUSE message received:", { pausedAtMs: pauseMsg.pausedAtMs })

            if (schedulerRef.current) {
              schedulerRef.current.pause()
            }
            audioHelpers.current.pause();
            
            setPlaybackState(prev => ({ ...prev, isPlaying: false }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "RESUME") {
            const resumeMsg = msg as ResumeMessage
            console.log("▶️ RESUME message received:", { masterClockMs: resumeMsg.masterClockMs, playbackPositionMs: resumeMsg.playbackPositionMs })
            // Align paused position to authoritative server position before resuming
            if (schedulerRef.current && typeof resumeMsg.playbackPositionMs === 'number') {
              schedulerRef.current.setPausedPosition(resumeMsg.playbackPositionMs)
            }
            if (!webAudioDisabledRef.current) {
              schedulerRef.current?.resume()
              audioHelpers.current.play();
            } else {
              // Fallback: seek and play via HTMLAudio
              if (typeof resumeMsg.playbackPositionMs === 'number') {
                audioHelpers.current.seek(resumeMsg.playbackPositionMs)
              }
              audioHelpers.current.play()
            }
            setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            onSyncRef.current?.(resumeMsg)
          }

          if (msg.type === "SEEK") {
            const seekMsg = msg as SeekMessage
            console.log("⏩ SEEK message received:", { seekPositionMs: seekMsg.seekPositionMs })
            if (!webAudioDisabledRef.current) {
              if (schedulerRef.current && seekMsg.seekPositionMs !== undefined) {
                schedulerRef.current.seek(seekMsg.seekPositionMs).catch(err => console.error("Seek error", err))
              }
              audioHelpers.current.seek(seekMsg.seekPositionMs)
            } else {
              audioHelpers.current.seek(seekMsg.seekPositionMs)
            }
            setPlaybackState(prev => ({ ...prev, currentPosition: seekMsg.seekPositionMs || 0, isPlaying: true }))
            onSyncRef.current?.(seekMsg)
          }

          if (msg.type === "TRACK_CHANGE") {
            const trackChangeMsg = msg as TrackChangeMessage
            console.log("🎵 TRACK_CHANGE message received:", trackChangeMsg.trackData)

            if (trackChangeMsg.trackData?.audioUrl && schedulerRef.current) {
              console.log("📱 Loading new track:", trackChangeMsg.trackData.title)
              
              scheduleSync(
                trackChangeMsg.trackData.audioUrl,
                Date.now(),
                trackChangeMsg.trackData.duration,
                0,
                0
              ).catch(err => {
                console.error("Track change scheduling error:", err)
              })
              
              setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            }
            
            onSyncRef.current?.(msg)
          }

          if (msg.type === "RESYNC") {
            const resyncMsg = msg as ResyncMessage
            const driftAmount = schedulerRef.current 
              ? Math.abs(schedulerRef.current.getCurrentPosition() - resyncMsg.correctPositionMs) 
              : 0
            console.log("🔄 RESYNC received - Drift correction")
            console.log(`   Before: ${(schedulerRef.current?.getCurrentPosition() || 0).toFixed(0)}ms`)
            console.log(`   After: ${resyncMsg.correctPositionMs.toFixed(0)}ms`)
            console.log(`   Drift: ${driftAmount.toFixed(0)}ms`)

            if (schedulerRef.current && resyncMsg.correctPositionMs !== undefined && resyncMsg.correctPositionMs !== null) {
              schedulerRef.current.seek(resyncMsg.correctPositionMs).catch(err => {
                console.error("Resync seek error:", err)
              })
            }
          }

        }

        ws.onclose = () => {
          console.log("🔌 Sync WebSocket disconnected")
          if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current)
          if (driftCheckIntervalRef.current) clearInterval(driftCheckIntervalRef.current)

          if (isMounted && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), 30000)
            console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
            reconnectTimeout = setTimeout(connect, delay)
          } else if (isMounted) {
            console.error("Max reconnection attempts reached")
            onErrorRef.current?.("Connection failed. Please refresh the page.")
          }
        }
      } catch (err) {
        console.error("WebSocket connection error:", err)
        onErrorRef.current?.("Failed to connect to sync server")
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current)
      if (driftCheckIntervalRef.current) clearInterval(driftCheckIntervalRef.current)
      if (driftAutoCorrectIntervalRef.current) clearInterval(driftAutoCorrectIntervalRef.current)
      if (positionRafRef.current !== null) cancelAnimationFrame(positionRafRef.current)
      positionRafRef.current = null
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (schedulerRef.current) {
        schedulerRef.current.stop()
        schedulerRef.current = null
      }
    }
  }, [roomCode, userId, hostId]) 

  return {
    playbackState,
    commands: { play, pause, resume, seek, trackChange },
    syncClientTime,
    isHost,
    scheduler: schedulerRef.current,
    timeSync: timeSyncCalcRef.current
  }
}
