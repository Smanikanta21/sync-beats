"use client"

import { useEffect, useRef, useState, useCallback } from "react"

interface SyncConfig {
  roomCode: string
  userId: string | null
  hostId: string
  audioRef: React.RefObject<HTMLAudioElement>
  onSync?: (data: SyncMessage) => void
  onError?: (error: string) => void
}

interface PlaybackState {
  isPlaying: boolean
  currentPosition: number
  serverOffsetMs: number
  drift: number
  rttMs: number
  latencyMs: number
}

interface SyncMessage {
  type: string
  [key: string]: any
}

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
  onError
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
  }, [onSync, onError])

  const isHost = userId === hostId
  const timeSyncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const driftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const syncClientTime = useCallback(() => {
    if (!wsRef.current) return

    const t0 = Date.now()
    const pingId = Math.random().toString(36)

    wsRef.current.send(JSON.stringify({
      type: "time_ping",
      id: pingId,
      t0: t0
    }))

    if (!(wsRef.current as any)._pendingPings) {
      (wsRef.current as any)._pendingPings = {}
    }
    (wsRef.current as any)._pendingPings[pingId] = t0
  }, [])

  const handleTimePong = useCallback((msg: any) => {
    const timeOffset = msg.timeOffset ?? 0
    const rtt = msg.t0 ? Date.now() - msg.t0 : 0
    const latency = rtt / 2

    setPlaybackState(prev => ({
      ...prev,
      serverOffsetMs: timeOffset,
      drift: latency,
      rttMs: rtt,
      latencyMs: latency
    }))

    log("⏱️ Time sync received", { serverOffsetMs: timeOffset, rttMs: rtt, latencyMs: latency })
  }, [log])

  const updatePlaybackState = useCallback((data: { isPlaying?: boolean; currentPosition?: number }) => {
    if (data.isPlaying !== undefined) {
      if (audioRef.current) {
        if (data.isPlaying) {
          console.log("📱 updatePlaybackState: Attempting to play audio on mobile")
          const playPromise = audioRef.current.play()
          if (playPromise) {
            playPromise
              .then(() => {
                console.log("📱 Play promise resolved - audio should be playing")
                setPlaybackState(prev => ({ ...prev, isPlaying: true }))
              })
              .catch(err => {
                console.warn("📱 Play promise rejected:", err.name, err.message)
                if (err.name === 'NotAllowedError') {
                  console.warn("📱 Mobile autoplay blocked - user interaction required")
                }
              })
          }
        } else {
          console.log("📱 updatePlaybackState: Pausing audio")
          audioRef.current.pause()
          setPlaybackState(prev => ({ ...prev, isPlaying: false }))
        }
      }
    }
  }, [])

  const scheduleSync = useCallback((
    audioUrl: string,
    startServerMs: number,
    duration: number,
    startDelayMs: number
  ) => {
    if (!audioRef.current) {
      console.log("scheduleSync: No audioRef")
      return
    }

    console.log("📱 Mobile scheduleSync called with:", { audioUrl: audioUrl.substring(0, 40), startServerMs, duration, startDelayMs, isMobile })
    audioRef.current.src = audioUrl
    
    const handleLoadedMetadata = () => {
      console.log("✅ Audio metadata loaded - duration:", audioRef.current?.duration)
      console.log("📱 Mobile metadata loaded:", { duration: audioRef.current?.duration, providedDuration: duration })
      const now = Date.now() + playbackState.serverOffsetMs
      const delay = startServerMs - now

      console.log("Schedule sync:", {
        startServerMs,
        now,
        delay,
        offset: playbackState.serverOffsetMs,
        audioCurrentTime: audioRef.current?.currentTime,
        audioDuration: audioRef.current?.duration
      })

      if (delay > 0) {
        console.log(`⏳ Waiting ${delay}ms before playing`)
        setTimeout(() => {
          console.log("▶️ Starting playback after delay")
          const playPromise = audioRef.current?.play()
          if (playPromise) {
            playPromise.catch(err => {
              if (err.name === 'NotAllowedError') {
                console.warn("📱 Autoplay blocked on mobile - user interaction required")
              } else {
                console.error("Play error:", err)
              }
            })
          }
        }, delay)
      } else {
        const lateBy = -delay
        const jumpPosition = lateBy / 1000
        if (audioRef.current) {
          audioRef.current.currentTime = jumpPosition
        }

        console.log("⏩ Starting late, jumping to", jumpPosition, "seconds")
        console.log("📱 Mobile late start:", { jumpPosition, audioDuration: audioRef.current?.duration })
        const playPromise = audioRef.current?.play()
        if (playPromise) {
          playPromise.catch(err => {
            if (err.name === 'NotAllowedError') {
              console.warn("📱 Autoplay blocked on mobile - user interaction required")
            } else {
              console.error("Play error:", err)
            }
          })
        }
      }
    }

    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true })
    
    // Fallback in case loadedmetadata doesn't fire
    const fallbackTimeout = setTimeout(() => {
      console.log("⏱️ Fallback: loadedmetadata didn't fire, starting playback anyway")
      console.log("📱 Mobile fallback timeout - duration:", audioRef.current?.duration)
      handleLoadedMetadata()
    }, 1000)

    const cleanupFallback = () => clearTimeout(fallbackTimeout)
    audioRef.current.addEventListener("play", cleanupFallback, { once: true })
  }, [playbackState.serverOffsetMs])

  const play = useCallback((
    audioUrl: string,
    duration: number,
    startDelayMs: number = 200
  ) => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("PLAY command sent:", { audioUrl, duration, startDelayMs })
    console.log("📱 Mobile PLAY:", { isMobile, audioUrl: audioUrl.substring(0, 40), duration, startDelayMs })
    wsRef.current.send(JSON.stringify({
      type: "PLAY",
      roomCode,
      audioUrl,
      duration,
      startDelayMs,
      timestamp: Date.now()
    }))

    setPlaybackState(prev => ({ ...prev, isPlaying: true }))
  }, [isHost, roomCode])

  const pause = useCallback(() => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("PAUSE command sent:", { currentTime: audioRef.current?.currentTime || 0 })
    wsRef.current.send(JSON.stringify({
      type: "PAUSE",
      roomCode,
      currentTime: audioRef.current?.currentTime || 0,
      timestamp: Date.now()
    }))

    if (audioRef.current) {
      audioRef.current.pause()
    }
    setPlaybackState(prev => ({ ...prev, isPlaying: false }))
  }, [isHost])

  const resume = useCallback(() => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("RESUME command sent:", { currentTime: audioRef.current?.currentTime || 0 })
    wsRef.current.send(JSON.stringify({
      type: "RESUME",
      roomCode,
      currentTime: audioRef.current?.currentTime || 0,
      startDelayMs: 200,
      timestamp: Date.now()
    }))

    setPlaybackState(prev => ({ ...prev, isPlaying: true }))
  }, [isHost])

  const seek = useCallback((positionMs: number) => {
    if (!wsRef.current) {
      console.log("WebSocket not connected")
      return
    }

    console.log("SEEK command sent:", { positionMs, positionSeconds: (positionMs / 1000).toFixed(2) })
    wsRef.current.send(JSON.stringify({
      type: "SEEK",
      roomCode,
      seekPositionMs: positionMs,
      timestamp: Date.now()
    }))
  }, [isHost])

  const checkDrift = useCallback(() => {
    if (!audioRef.current || !playbackState.isPlaying) return

    const clientPosition = audioRef.current.currentTime * 1000

    if (!wsRef.current) return

    wsRef.current.send(JSON.stringify({
      type: "sync_check",
      roomCode,
      clientPosition,
      timestamp: Date.now()
    }))
  }, [])

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

    const connect = () => {
      if (!isMounted) return

      const host = process.env.NEXT_PUBLIC_SOCKET_HOST || "localhost:6001"
      const isProduction = host.includes("onrender.com")
      const protocol = isProduction ? "wss" : "ws"
      
      let url: string
      if (host.includes(":")) {
        url = `${protocol}://${host}`
      } else {
        const port = process.env.NEXT_PUBLIC_SOCKET_PORT || "6001"
        url = `${protocol}://${host}:${port}`
      }

      url = `${url}/ws/sync?roomCode=${roomCode}&userId=${userId}`

      // url = `wss://sync-beats-qoe8.onrender.com`

      console.log("Connecting to WebSocket:", url)

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          console.log("🟢 Sync WebSocket connected")
          console.log("📱 Mobile Connection:", { isMobile, roomCode, userId, isHost })
          reconnectAttempts = 0

          ws.send(JSON.stringify({
            type: "join",
            roomCode,
            userId,
            hostId
          }))

          timeSyncIntervalRef.current = setInterval(syncClientTime, 3000)
          driftCheckIntervalRef.current = setInterval(checkDrift, 2000)
        }

        ws.onmessage = (event) => {
          const msg: SyncMessage = JSON.parse(event.data)

          if (msg.type === "time_pong") {
            handleTimePong(msg)
          }

          if (msg.type === "PLAY_SYNC") {
            console.log("🎵 PLAY_SYNC message received (late join):", { audioUrl: msg.audioUrl?.substring(0, 40), playbackPosition: msg.playbackPosition, duration: msg.duration })
            console.log("📱 Mobile PLAY_SYNC received:", { isMobile, playbackPosition: msg.playbackPosition, duration: msg.duration })
            
            if (audioRef.current) {
              audioRef.current.src = msg.audioUrl
              if (msg.isPlaying) {
                const positionSeconds = (msg.playbackPosition || 0) / 1000
                audioRef.current.currentTime = positionSeconds
                console.log(`⏩ Late join: jumping to ${positionSeconds}s`)
                const playPromise = audioRef.current.play()
                if (playPromise) {
                  playPromise.catch(err => {
                    if (err.name === 'NotAllowedError') {
                      console.warn("📱 Autoplay blocked on mobile - user interaction required")
                    } else {
                      console.error("Play error:", err)
                    }
                  })
                }
              }
            }
            
            setPlaybackState(prev => ({ ...prev, isPlaying: msg.isPlaying || false }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "PLAY") {
            console.log("🎵 PLAY message received:", { audioUrl: msg.audioUrl?.substring(0, 40), startServerMs: msg.startServerMs, duration: msg.duration })
            console.log("📱 Mobile PLAY received:", { isMobile, duration: msg.duration, startServerMs: msg.startServerMs, startDelayMs: msg.startDelayMs })
            scheduleSync(msg.audioUrl, msg.startServerMs, msg.duration, msg.startDelayMs)
            setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "PAUSE") {
            console.log("⏸️ PAUSE message received:", { pausedAt: msg.pausedAt })
            console.log("📱 Mobile PAUSE received:", { isMobile, pausedAt: msg.pausedAt, audioCurrentTime: audioRef.current?.currentTime })
            audioRef.current?.pause()
            setPlaybackState(prev => ({ ...prev, isPlaying: false }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "RESUME") {
            console.log("▶️ RESUME message received:", { resumeServerMs: msg.resumeServerMs })
            console.log("📱 Mobile RESUME received:", { isMobile, resumeServerMs: msg.resumeServerMs, audioCurrentTime: audioRef.current?.currentTime })
            const playPromise = audioRef.current?.play()
            if (playPromise) {
              playPromise.catch(err => {
                if (err.name !== 'NotAllowedError') {
                  console.error("Resume play error:", err)
                } else {
                  console.warn("📱 Mobile NotAllowedError on RESUME - user interaction required")
                }
              })
            }
            setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "SEEK") {
            console.log("SEEK message received:", msg.seekPositionMs)
            console.log("📱 Mobile SEEK received:", { isMobile, seekPositionMs: msg.seekPositionMs })
            if (audioRef.current) {
              audioRef.current.currentTime = msg.seekPositionMs / 1000
            }
            setPlaybackState(prev => ({ ...prev, currentPosition: msg.seekPositionMs }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === "TRACK_CHANGE") {
            console.log("🎵 TRACK_CHANGE message received:", msg.trackData)
            console.log("📱 Mobile TRACK_CHANGE:", { isMobile, title: msg.trackData?.title, audioUrl: msg.trackData?.audioUrl })
            
            // Load and play the new track
            if (msg.trackData?.audioUrl && audioRef.current) {
              console.log("📱 Loading new track:", msg.trackData.title)
              audioRef.current.src = msg.trackData.audioUrl
              audioRef.current.currentTime = 0
              
              // Play the track
              const playPromise = audioRef.current.play()
              if (playPromise) {
                playPromise.catch(err => {
                  if (err.name === 'NotAllowedError') {
                    console.warn("📱 Autoplay blocked on mobile - user interaction required")
                  } else {
                    console.error("Track change play error:", err)
                  }
                })
              }
              setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            }
            
            onSyncRef.current?.(msg)
          }

          if (msg.type === "RESYNC") {
            console.log("Resyncing to", msg.correctPosition, "ms")
            console.log("📱 Mobile RESYNC:", { isMobile, correctPosition: msg.correctPosition })
            if (audioRef.current) {
              audioRef.current.currentTime = msg.correctPosition / 1000
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
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [roomCode, userId, hostId]) 

  return {
    playbackState,
    commands: { play, pause, resume, seek, trackChange },
    syncClientTime,
    isHost
  }
}
