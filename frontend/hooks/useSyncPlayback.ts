"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import TimeSyncCalculator from "@/lib/TimeSyncCalculator"
import { SyncOptimization } from "@/lib/SyncOptimization"
import { SYNC_TYPES } from "@/lib/SyncMessageTypes"
import { audioContextManager } from "@/lib/audioContextManager"
import { scheduleWebAudio, stopSource } from "@/lib/WebAudioScheduler"
//

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
  audioDriftMs?: number
  isSynced?: boolean
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
  const commandQueueRef = useRef<any[]>([])
  const joinedRef = useRef<boolean>(false)
  const onSyncRef = useRef(onSync)
  const onErrorRef = useRef(onError)
  const onPositionUpdateRef = useRef(onPositionUpdate)


  const timeSyncCalcRef = useRef<TimeSyncCalculator>(new TimeSyncCalculator(8))
  const offsetSmootherRef = useRef(new SyncOptimization.OffsetSmoother(16))
  const scheduledMasterClockMsRef = useRef<number | null>(null)
  const scheduledStartPositionMsRef = useRef<number>(0)
  const monotonicToUnixDeltaRef = useRef<number>(0)
  const lastFilteredOffsetRef = useRef<number>(0)

  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentPosition: 0,
    serverOffsetMs: 0,
    drift: 0,
    rttMs: 0,
    latencyMs: 0,
    audioDriftMs: 0,
    isSynced: false
  })

  // Track pending autoplay attempt (mobile gesture lock) and whether user gesture required.
  const awaitingGestureRef = useRef<boolean>(false)
  const pendingPlayParamsRef = useRef<null | { audioUrl: string; masterClockMs: number; duration: number; latencyMs: number; startPositionMs: number }>(null)



  useEffect(() => {
    onSyncRef.current = onSync
    onErrorRef.current = onError
    onPositionUpdateRef.current = onPositionUpdate
  }, [onSync, onError, onPositionUpdate])

  const isHost = userId === hostId
  const timeSyncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const driftCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const driftAutoCorrectIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastRateAdjustmentAtRef = useRef<number>(0)
  const rateAdjustmentActiveRef = useRef<boolean>(false)
  const webAudioEnabledRef = useRef<boolean>(false)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const positionRafRef = useRef<number | null>(null)
  const lastPositionBroadcastRef = useRef<number>(0)
  const lastSeekOrResumeAtRef = useRef<number>(0)
  const trackDurationRef = useRef<number>(0)
  const stateFetchAttemptsRef = useRef<number>(0)
  const stateFetchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const scheduledOrPlayingRef = useRef<boolean>(false)
  const scheduledOnceRef = useRef<boolean>(false)
  const unlockedRef = useRef<boolean>(false)
  const [joiningSync, setJoiningSync] = useState<boolean>(false)
  const pendingPreloadRef = useRef<null | { audioUrl: string; duration: number; checkId: string }>(null)
  const processedPrepareIdsRef = useRef<Set<string>>(new Set())
  const respondedHealthCheckIdsRef = useRef<Set<string>>(new Set())

  const syncClientTime = useCallback(() => {
    const ws = wsRef.current
    if (!ws) return
    if (ws.readyState !== 1) return
    try {
      const t0 = Date.now()
      const pingId = Math.random().toString(36)
      ws.send(JSON.stringify({ type: SYNC_TYPES.TIME_PING, id: pingId, t0 }))
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
    const smoother = offsetSmootherRef.current.add(t0, t1, serverTimeUnix)
    if (typeof serverTimeMonotonic === 'number') {
      ; (timeSyncCalcRef.current as any)._monotonicToUnixDelta = serverTimeUnix - serverTimeMonotonic
      monotonicToUnixDeltaRef.current = serverTimeUnix - serverTimeMonotonic
    }
    const rtt = sample.rtt
    const latency = sample.latency
    const effectiveOffset = sample.filteredOffset ?? smoother?.averageOffset ?? sample.offset
    const jitter = sample.jitter
    // Passive playback position correction using authoritative playbackPosition + masterClock mapping from time pong
    try {
      const reportedPlaybackPosition = (msg.playbackPosition as number) || 0
      const serverMonotonicReported = serverTimeMonotonic || 0
      const monoDelta = monotonicToUnixDeltaRef.current || (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0
      // Estimate server monotonic now at receipt time
      const serverMonotonicNowEst = (Date.now() + effectiveOffset) - monoDelta
      const elapsedSinceReport = serverMonotonicNowEst - serverMonotonicReported
      const expectedPositionNow = reportedPlaybackPosition + (elapsedSinceReport > 0 ? elapsedSinceReport : 0)
      const el = audioRef.current
      if (el && playbackState.isPlaying && scheduledMasterClockMsRef.current) {
        const actual = (el.currentTime || 0) * 1000
        const passiveDrift = expectedPositionNow - actual
        const passiveDriftAbs = Math.abs(passiveDrift)
        // Only perform gentle passive correction if not within recent seek/resume window
        if (passiveDriftAbs > 150 && passiveDriftAbs < 800 && (performance.now() - lastSeekOrResumeAtRef.current) > 1500) {
          // Nudge currentTime directly (single correction) when drift moderate
          try { el.currentTime = Math.max(0, expectedPositionNow) / 1000 } catch {}
          lastSeekOrResumeAtRef.current = performance.now() // prevent immediate subsequent corrections
        }
      }
      setPlaybackState(prev => ({
        ...prev,
        serverOffsetMs: effectiveOffset,
        drift: jitter,
        rttMs: rtt,
        latencyMs: latency
      }))
    } catch {
      setPlaybackState(prev => ({
        ...prev,
        serverOffsetMs: effectiveOffset,
        drift: jitter,
        rttMs: rtt,
        latencyMs: latency
      }))
    }
  }, [log])

  const scheduleSync = useCallback(async (
    audioUrl: string,
    masterClockMs: number,
    duration: number,
    masterClockLatencyMs: number,
    playbackPosition: number = 0
  ) => {
    const el = audioRef.current
    if (!el) return
    try {
      // Ensure source
      if (el.src !== audioUrl) {
        el.src = audioUrl
        el.load()
      }
      // Wait for metadata ALWAYS before touching currentTime (Safari negative currentTime bug)
      if (el.readyState < 1) {
        await new Promise<void>((resolve) => {
          const onMeta = () => { el.removeEventListener('loadedmetadata', onMeta); resolve() }
          el.addEventListener('loadedmetadata', onMeta, { once: true })
        })
      }
      // Reset playback rate to neutral before any scheduling
      try { el.playbackRate = 1.0 } catch {}
      const durationMs = duration > 1000 ? duration : Math.round(duration * 1000)
      trackDurationRef.current = durationMs
      // Mapping
      const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
      lastFilteredOffsetRef.current = filteredOffset
      const monoDelta = monotonicToUnixDeltaRef.current || (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0
      // Estimate server monotonic now from client unix + offset - delta
      const serverMonotonicNowEst = (Date.now() + filteredOffset) - monoDelta
      let delayMs = masterClockMs - serverMonotonicNowEst + masterClockLatencyMs
      let startPositionMs = playbackPosition
      if (delayMs < 0) {
        startPositionMs += (-delayMs)
        delayMs = 0
      }
      if (startPositionMs < 0) startPositionMs = 0
      try { el.currentTime = startPositionMs / 1000 } catch {}
      scheduledMasterClockMsRef.current = masterClockMs
      scheduledStartPositionMsRef.current = startPositionMs
      // Mark playing only after play resolves
      // On Safari, ensure we have some data buffered before playing
      if (el.readyState < 2) {
        await new Promise<void>((resolve) => {
          let settled = false
          const onCanPlay = () => { if (!settled) { settled = true; el.removeEventListener('canplay', onCanPlay); resolve() } }
          el.addEventListener('canplay', onCanPlay, { once: true })
          setTimeout(() => { if (!settled) { settled = true; el.removeEventListener('canplay', onCanPlay); resolve() } }, 500)
        })
      }
      // Start playback at the intended wall-clock time
      await new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, Math.floor(delayMs))))
      const playPromise = el.play()
      if (playPromise && typeof playPromise.then === 'function') {
        try {
          await playPromise
          setPlaybackState(prev => ({ ...prev, isPlaying: true }))
        } catch (err) {
          // Autoplay gesture lock handling
          const message = (err as any)?.message || ''
          if ((err as any)?.name === 'NotAllowedError' || /gesture|user/i.test(message)) {
            awaitingGestureRef.current = true
            pendingPlayParamsRef.current = { audioUrl, masterClockMs, duration: durationMs, latencyMs: masterClockLatencyMs, startPositionMs }
            if (devMode) console.warn('Autoplay blocked; awaiting user gesture to start playback')
          } else {
            if (devMode) console.warn('HTMLAudio play() failed', err)
          }
          setPlaybackState(prev => ({ ...prev, isPlaying: false }))
        }
      } else {
        setPlaybackState(prev => ({ ...prev, isPlaying: !el.paused }))
      }
      lastSeekOrResumeAtRef.current = performance.now()
      // Removed per-frame state updates to avoid Safari timer throttling
    } catch (err) {
      console.error('Failed to schedule HTML5 audio', err)
      onErrorRef.current?.('Playback scheduling failed')
    }
  }, [audioRef])

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
      const el = audioRef.current; if (!el) return;
      try { await el.play() } catch (e) { console.warn('HTMLAudio play failed', e) }
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
    // Single user interaction unlock for iOS/Safari + attempt WebAudio resume
    const unlock = () => {
      if (unlockedRef.current) return
      const el = audioRef.current
      if (!el) return
      el.muted = true
      const p = el.play()
      if (p && typeof p.then === 'function') {
        p.then(() => { try { el.pause() } catch {}; unlockedRef.current = true }).catch(() => { unlockedRef.current = true })
      } else {
        unlockedRef.current = true
      }
      try {
        audioContextManager.getContext()
        audioContextManager.resume().then(() => {
          webAudioEnabledRef.current = audioContextManager.isReady()
        }).catch(()=>{})
      } catch {}
      // Retry pending autoplay after successful gesture unlock
      if (awaitingGestureRef.current && pendingPlayParamsRef.current) {
        const params = pendingPlayParamsRef.current
        awaitingGestureRef.current = false
        pendingPlayParamsRef.current = null
        // Minor re-schedule lead to align with current master clock estimation
        const monoDelta = monotonicToUnixDeltaRef.current || (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0
        const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() || timeSyncCalcRef.current.getOffset()
        const serverMonotonicNowEst = (Date.now() + filteredOffset) - monoDelta
        const adjustedMasterClock = serverMonotonicNowEst + 250
        scheduleSync(params.audioUrl, adjustedMasterClock, params.duration, params.latencyMs, params.startPositionMs).catch(()=>{})
      }
    }
    window.addEventListener('touchstart', unlock, { passive: true })
    window.addEventListener('click', unlock)
    return () => {
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('click', unlock)
    }
  }, [audioRef])

  const play = useCallback((audioUrl: string, duration: number, startDelayMs: number = 200) => {
    // Host initiates; rely on server PLAY/PLAY_SYNC for actual start — no local immediate play to avoid glitch.
    let effectiveStartDelayMs = startDelayMs
    const smootherCurrent = offsetSmootherRef.current.getCurrent()
    if (smootherCurrent) {
      const targetServerTime = Date.now() + (smootherCurrent.averageOffset || 0) + startDelayMs
      const waitMs = SyncOptimization.calcWaitMs(targetServerTime, smootherCurrent.averageOffset || 0)
      if (SyncOptimization.isLateSchedule(waitMs, playbackState.rttMs)) effectiveStartDelayMs += 150
    }
    const msg = { type: "PLAY", roomCode, audioUrl, duration, startDelayMs: effectiveStartDelayMs, rttMs: playbackState.rttMs, timestamp: Date.now() }
    if (wsRef.current?.readyState === 1) {
      if (devMode) console.log("▶️ PLAY command sent:", { audioUrl: audioUrl.substring(0,40), duration, startDelayMs: effectiveStartDelayMs })
      wsRef.current.send(JSON.stringify(msg))
    } else {
      commandQueueRef.current.push(msg)
    }
  }, [roomCode, playbackState.rttMs])

  const pause = useCallback(() => {
    // Optimistic local stop; let server broadcast authoritative PAUSE.
    const currentPosition = (audioRef.current?.currentTime || 0) * 1000
    if (devMode) console.log("⏸️ PAUSE command sent:", { currentPosition: currentPosition.toFixed(0) })
    if (currentSourceRef.current) { stopSource(currentSourceRef.current); currentSourceRef.current = null }
    audioHelpers.current.pause()
    const msg = { type: "PAUSE", roomCode, currentTime: currentPosition / 1000, timestamp: Date.now() }
    if (wsRef.current?.readyState === 1) wsRef.current.send(JSON.stringify(msg)); else commandQueueRef.current.push(msg)
  }, [roomCode])

  const resume = useCallback(() => {
    const currentPosition = (audioRef.current?.currentTime || 0) * 1000
    if (devMode) console.log("▶️ RESUME command requested:", { currentPosition: currentPosition.toFixed(0) })
    const smootherCurrent = offsetSmootherRef.current.getCurrent()
    const baseDelay = 200
    const adaptiveExtra = smootherCurrent && playbackState.rttMs > 250 ? 120 : 0
    const msg = {
      type: "RESUME",
      roomCode,
      currentTime: currentPosition / 1000,
      startDelayMs: baseDelay + adaptiveExtra,
      timestamp: Date.now()
    }
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      if (devMode) console.log("WS not ready, queuing RESUME")
      commandQueueRef.current.push(msg)
    }
  }, [roomCode, playbackState.rttMs])

  const seek = useCallback((positionMs: number) => {
    if (devMode) console.log("⏩ SEEK command sent:", { positionMs, positionSeconds: (positionMs / 1000).toFixed(2) })
    // Reset any active playbackRate nudge for fresh seek mapping
    try { if (rateAdjustmentActiveRef.current && audioRef.current) { audioRef.current.playbackRate = 1 } } catch {}
    rateAdjustmentActiveRef.current = false
    const msg = {
      type: "SEEK",
      roomCode,
      seekPositionMs: positionMs,
      timestamp: Date.now()
    }
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      if (devMode) console.log("WS not ready, queuing SEEK")
      commandQueueRef.current.push(msg)
    }
  }, [roomCode])

  const checkDrift = useCallback(() => {
    if (!audioRef.current || audioRef.current.paused || !playbackState.isPlaying) return

    const clientPosition = (audioRef.current.currentTime || 0) * 1000

    if (!wsRef.current) return

    if (devMode) {
      console.log(`⏱️ Drift check - HTMLAudio position: ${clientPosition.toFixed(0)}ms`)
    }

    wsRef.current.send(JSON.stringify({
      type: "sync_check",
      roomCode,
      clientPosition,
      timestamp: Date.now()
    }))
  }, [devMode, roomCode, playbackState.isPlaying])

  const autoCorrectLocalDrift = useCallback(() => {
    const el = audioRef.current
    if (!el || el.paused || !playbackState.isPlaying) return
    // Skip corrections briefly after seeks/resumes to avoid oscillation
    const now = performance.now()
    if (now - lastSeekOrResumeAtRef.current < 1200) return
    const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
    const monoDelta = monotonicToUnixDeltaRef.current
    if (typeof monoDelta !== 'number') return
    const masterStart = scheduledMasterClockMsRef.current
    if (masterStart == null) return
    // expected position from master clock mapping
    const serverUnixNowEst = Date.now() + filteredOffset
    const serverMonotonicNowEst = serverUnixNowEst - monoDelta
    const elapsedSinceMaster = serverMonotonicNowEst - masterStart
    const expected = scheduledStartPositionMsRef.current + elapsedSinceMaster
    const actual = (el.currentTime || 0) * 1000
    const drift = expected - actual
    const driftAbs = Math.abs(drift)
    // Apply simplified correction: only hard seek if large drift
    if (driftAbs > 400) {
      try { el.currentTime = Math.max(0, expected) / 1000 } catch {}
      lastSeekOrResumeAtRef.current = performance.now()
      // Reset any rate adjustment after hard correction
      try { el.playbackRate = 1 } catch {}
      rateAdjustmentActiveRef.current = false
    }
    else if (driftAbs > 25) {
      // Use gentle rate nudging similar to beatsync WebAudio approach
      // Limit how often we start a new nudge window
      const sinceLastAdj = now - lastRateAdjustmentAtRef.current
      if (!rateAdjustmentActiveRef.current || sinceLastAdj > 2500) {
        rateAdjustmentActiveRef.current = true
        lastRateAdjustmentAtRef.current = now
      }
      if (rateAdjustmentActiveRef.current) {
        // Target fractional correction over a short window
        const windowMs = 1500
        const fractional = Math.min(Math.max(drift / windowMs, -0.02), 0.02)
        const targetRate = 1 + fractional
        try { el.playbackRate = targetRate } catch {}
        // If drift nearly gone, restore
        if (driftAbs < 10) {
          try { el.playbackRate = 1 } catch {}
          rateAdjustmentActiveRef.current = false
        }
        // Auto restore after window
        if (sinceLastAdj > windowMs) {
          try { el.playbackRate = 1 } catch {}
          rateAdjustmentActiveRef.current = false
        }
      }
    } else {
      // In tight sync range, ensure rate normalized
      if (rateAdjustmentActiveRef.current) {
        try { el.playbackRate = 1 } catch {}
        rateAdjustmentActiveRef.current = false
      }
    }
    setPlaybackState(prev => ({ ...prev, audioDriftMs: driftAbs, isSynced: driftAbs < 40 }))
  }, [audioRef, playbackState.isPlaying])

  // Lightweight position update loop for progress UI
  const startPositionLoop = useCallback(() => {
    if (positionRafRef.current !== null) return
    const tick = () => {
      const el = audioRef.current
      if (el) {
        const nowMs = (el.currentTime || 0) * 1000
        const t = performance.now()
        // Throttle state updates to ~5/sec
        if (t - lastPositionBroadcastRef.current > 180) {
          lastPositionBroadcastRef.current = t
          setPlaybackState(prev => ({
            ...prev,
            currentPosition: nowMs
          }))
          onPositionUpdateRef.current?.({
            positionMs: nowMs,
            clampedMs: Math.max(0, Math.min(trackDurationRef.current || nowMs, nowMs)),
            durationMs: trackDurationRef.current || 0,
            playing: !el.paused
          })
        }
      }
      positionRafRef.current = requestAnimationFrame(tick)
    }
    positionRafRef.current = requestAnimationFrame(tick)
  }, [audioRef])

  const trackChange = useCallback((trackData: {
    id: string
    title: string
    artist: string
    duration: number
    audioUrl: string
  }) => {
    if (devMode) console.log("TRACK_CHANGE command sent:", { title: trackData.title, artist: trackData.artist })
    const msg = { type: "TRACK_CHANGE", roomCode, trackData, timestamp: Date.now() }
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      console.log("WS not ready, queuing TRACK_CHANGE")
      commandQueueRef.current.push(msg)
    }
  }, [isHost])

  useEffect(() => {
    let isMounted = true
    let reconnectTimeout: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = Number.POSITIVE_INFINITY

    if (!roomCode || !userId || !hostId) {
      if (devMode) console.log('[SyncPlayback] Deferring WS connect until identifiers ready', { roomCode, userId, hostId })
      return () => { }
    }

    const connect = () => {
      if (!isMounted) return
      let url: string
      try {
        const raw = process.env.NEXT_PUBLIC_SOCKET_HOST
        if (raw && raw.trim()) {
          const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
          // If page is https and env uses ws://, upgrade to wss:// to avoid mixed content
          const upgraded = isHttps && raw.startsWith('ws://') ? raw.replace(/^ws:\/\//, 'wss://') : raw
          url = `${upgraded}/ws/sync?roomCode=${roomCode}&userId=${userId}`
        } else {
          const loc = typeof window !== 'undefined' ? window.location : { protocol: 'http:', host: 'localhost:3000' } as any
          const proto = loc.protocol === 'https:' ? 'wss' : 'ws'
          // Default sockets dev port 6001 on same host
          const host = loc.host.includes(':') ? loc.host.split(':')[0] : loc.host
          url = `${proto}://${host}:6001/ws/sync?roomCode=${roomCode}&userId=${userId}`
        }
      } catch {
        url = `${process.env.NEXT_PUBLIC_SOCKET_HOST}/ws/sync?roomCode=${roomCode}&userId=${userId}`
      }

      try {
        const ws = new WebSocket(url)
        wsRef.current = ws

        ws.onopen = () => {
          if (devMode) console.log("Sync WebSocket connected")
          if (devMode) console.log("Mobile Connection:", { isMobile, roomCode, userId, isHost })
          reconnectAttempts = 0
          // No WebAudio scheduler; HTMLAudio is used

          ws.send(JSON.stringify({
            type: "join",
            roomCode,
            userId,
            hostId
          }))
          joinedRef.current = false
          startPingBurst();
          timeSyncIntervalRef.current = setInterval(startPingBurst, 1500)
          driftCheckIntervalRef.current = setInterval(checkDrift, 5000)
          driftAutoCorrectIntervalRef.current = setInterval(autoCorrectLocalDrift, 1200)
          startPositionLoop()
          const requestState = () => {
            if (!wsRef.current || wsRef.current.readyState !== 1) return
            try {
              wsRef.current.send(JSON.stringify({ type: 'get_playback_state', roomCode, timestamp: Date.now() }))
            } catch {}
          }
          stateFetchAttemptsRef.current = 0
          if (stateFetchTimerRef.current) clearTimeout(stateFetchTimerRef.current)
          setJoiningSync(true)
          requestState()
          stateFetchTimerRef.current = setTimeout(function poll(){
            if (scheduledOrPlayingRef.current) return
            if (stateFetchAttemptsRef.current >= 6) return
            stateFetchAttemptsRef.current += 1
            requestState()
            stateFetchTimerRef.current = setTimeout(poll, 600)
          }, 600)
        }

        ws.onmessage = (event) => {
          let msg: SyncMessage
          try {
            msg = JSON.parse(event.data) as SyncMessage
          } catch (e) {
            if (devMode) console.warn('⚠️ Invalid JSON from server', e)
            return
          }

          if ((msg as any).type === 'joined') { // server emits lowercase 'joined'
            joinedRef.current = true
            if (commandQueueRef.current.length) {
              if (devMode) console.log(`📤 Flushing ${commandQueueRef.current.length} queued command(s) after join`)
              for (const m of commandQueueRef.current) {
                try { ws.send(JSON.stringify(m)) } catch {}
              }
              commandQueueRef.current = []
            }
          }

          if (msg.type === SYNC_TYPES.DEVICE_HEALTH_CHECK) {
            const { checkId } = msg as any
            if (devMode) console.log("🏥 Received device health check", { checkId })
            const el = audioRef.current
            const audioLoaded = !!el && el.readyState >= 1
            const deviceReady = audioLoaded
            if (!respondedHealthCheckIdsRef.current.has(checkId)) {
              wsRef.current?.send(JSON.stringify({
                type: "device_health_check_response",
                checkId,
                audioLoaded,
                deviceReady,
                timestamp: Date.now()
              }))
              respondedHealthCheckIdsRef.current.add(checkId)
            }
          }

          if (msg.type === SYNC_TYPES.PREPARE_TRACK) {
            const prepMsg = msg as PrepareTrackMessage
            if (processedPrepareIdsRef.current.has(prepMsg.checkId)) {
              if (devMode) console.log('🔁 PREPARE_TRACK duplicate ignored', prepMsg.checkId)
              return
            }
            processedPrepareIdsRef.current.add(prepMsg.checkId)
            ;(async () => {
              try {
                const el = audioRef.current
                if (!el) return
                if (el.src !== prepMsg.audioUrl) {
                  el.src = prepMsg.audioUrl
                  el.load()
                }
                // Send NOT READY (without marking responded set) if metadata not loaded
                if (el.readyState < 1) {
                  wsRef.current?.send(JSON.stringify({
                    type: 'device_health_check_response',
                    roomCode,
                    checkId: prepMsg.checkId,
                    audioLoaded: false,
                    deviceReady: false,
                    rttMs: playbackState.rttMs,
                    timestamp: Date.now()
                  }))
                  await new Promise<void>((resolve) => {
                    const onMeta = () => { el.removeEventListener('loadedmetadata', onMeta); resolve() }
                    el.addEventListener('loadedmetadata', onMeta, { once: true })
                  })
                }
                // Now READY
                wsRef.current?.send(JSON.stringify({
                  type: 'device_health_check_response',
                  roomCode,
                  checkId: prepMsg.checkId,
                  audioLoaded: true,
                  deviceReady: true,
                  rttMs: playbackState.rttMs,
                  timestamp: Date.now()
                }))
                wsRef.current?.send(JSON.stringify({
                  type: 'track_prepared',
                  roomCode,
                  checkId: prepMsg.checkId,
                  audioUrl: prepMsg.audioUrl,
                  timestamp: Date.now()
                }))
                if (devMode) console.log('✅ Track metadata prepared', { checkId: prepMsg.checkId })
              } catch (e) {
                console.error('Failed to preload track', e)
                onErrorRef.current?.('Failed to preload track')
              }
            })()
          }

          if (msg.type === SYNC_TYPES.TIME_PONG) {
            handleTimePong(msg as Record<string, unknown>)
          }

          if (msg.type === SYNC_TYPES.PLAY_SYNC) {
            const playSyncMsg = msg as PlaySyncMessage
            if (scheduledOnceRef.current) {
              if (devMode) console.log('🛑 Ignoring PLAY_SYNC (already scheduled)')
              return
            }
            if (devMode) console.log("🎵 PLAY_SYNC schedule:", {
              audioUrl: playSyncMsg.audioUrl?.substring(0, 40),
              playbackPosition: playSyncMsg.playbackPosition,
              masterClockMs: playSyncMsg.masterClockMs,
              duration: playSyncMsg.duration
            })
            const latencyMs = playbackState.latencyMs || 20
            if (playSyncMsg.audioUrl) {
              audioHelpers.current.ensureSrc(playSyncMsg.audioUrl)
            }
            scheduleSync(
              playSyncMsg.audioUrl,
              playSyncMsg.masterClockMs,
              playSyncMsg.duration,
              latencyMs,
              playSyncMsg.playbackPosition
            ).catch(err => {
              console.error("Failed to schedule PLAY_SYNC:", err)
            })
            scheduledOrPlayingRef.current = true
            scheduledOnceRef.current = true
            setJoiningSync(false)
            setPlaybackState(prev => ({ ...prev, isPlaying: !!playSyncMsg.isPlaying }))
            onSyncRef.current?.(msg)
          }
          if ((msg as any).type === SYNC_TYPES.PAUSE_STATE) {
            const p = msg as any
            if (devMode) console.log('⏸️ PAUSE_STATE received', { pausedPositionMs: p.pausedPositionMs })
            const el = audioRef.current
            if (el && typeof p.pausedPositionMs === 'number') {
              try { el.currentTime = p.pausedPositionMs / 1000 } catch {}
            }
            scheduledMasterClockMsRef.current = p.masterClockMs
            scheduledStartPositionMsRef.current = p.pausedPositionMs || 0
            setPlaybackState(prev => ({ ...prev, isPlaying: false }))
            scheduledOrPlayingRef.current = true
            scheduledOnceRef.current = true
            setJoiningSync(false)
          }

          if (msg.type === "playback_state") { // initial empty snapshot when no track active
            const state = msg as any
            // Removed console log to reduce noise; keep logic for late join scheduling
            if (state.currentTrack) {
              if (scheduledOnceRef.current) {
                if (devMode) console.log('🔁 Ignoring playback_state (already scheduled)')
                return
              }
              const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
              const monoDelta = (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0
              const serverUnixNow = state.serverNow || Date.now()
              const serverMonotonicNow = serverUnixNow - monoDelta
              const startDelayMs = 800
              const targetMasterClockMs = serverMonotonicNow + startDelayMs
              const startPlaybackPosition = (state.playbackPosition || 0)
              audioHelpers.current.ensureSrc(state.currentTrack)
              const latencyMs = playbackState.latencyMs || 20
              scheduleSync(
                state.currentTrack,
                targetMasterClockMs,
                state.duration || 0,
                latencyMs,
                startPlaybackPosition
              ).catch(err => console.error("Failed to schedule from playback_state:", err))
              setPlaybackState(prev => ({ ...prev, isPlaying: !!state.isPlaying }))
              scheduledOrPlayingRef.current = true
              scheduledOnceRef.current = true
              setJoiningSync(false)
            } else {
              if (!scheduledOrPlayingRef.current && stateFetchAttemptsRef.current < 6) {
                try { wsRef.current?.send(JSON.stringify({ type: 'get_playback_state', roomCode, timestamp: Date.now() })) } catch {}
                stateFetchAttemptsRef.current += 1
              }
            }
          }

          if (msg.type === SYNC_TYPES.PLAY) {
            const playMsg = msg as PlayMessage
            if (devMode) console.log("🎵 PLAY message received:", { audioUrl: playMsg.audioUrl?.substring(0, 40), masterClockMs: playMsg.masterClockMs, masterClockLatencyMs: playMsg.masterClockLatencyMs, duration: playMsg.duration })
            if (webAudioEnabledRef.current) {
              scheduleWebAudio({
                audioUrl: playMsg.audioUrl,
                offsetSeconds: 0,
                targetServerTimeMs: playMsg.masterClockMs,
                serverOffsetMs: playbackState.serverOffsetMs
              }).then(r => {
                if (!r.started) {
                  if (devMode) console.warn('Late schedule; requesting state')
                  wsRef.current?.send(JSON.stringify({ type: 'get_playback_state', roomCode, timestamp: Date.now() }))
                  return
                }
                currentSourceRef.current = r.source
                setPlaybackState(prev => ({ ...prev, isPlaying: true, currentPosition: 0 }))
              }).catch(err => {
                console.error('WebAudio PLAY failed, fallback', err)
                audioHelpers.current.ensureSrc(playMsg.audioUrl)
                scheduleSync(playMsg.audioUrl, playMsg.masterClockMs, playMsg.duration, playMsg.masterClockLatencyMs, 0).catch(e => console.error('Fallback PLAY error', e))
                setPlaybackState(prev => ({ ...prev, isPlaying: true, currentPosition: 0 }))
              })
            } else {
              audioHelpers.current.ensureSrc(playMsg.audioUrl)
              scheduleSync(playMsg.audioUrl, playMsg.masterClockMs, playMsg.duration, playMsg.masterClockLatencyMs, 0).catch(err => console.error("Failed to schedule PLAY:", err))
              setPlaybackState(prev => ({ ...prev, isPlaying: true, currentPosition: 0 }))
            }
            setJoiningSync(false)
            onSyncRef.current?.(playMsg)
          }

          if (msg.type === SYNC_TYPES.DEVICE_READY) {
            const { wsId } = msg as any
            if (devMode) console.log("Device is ready:", wsId)
          }

          if (msg.type === SYNC_TYPES.PAUSE) {
            const pauseMsg = msg as PauseMessage
            if (devMode) console.log("⏸️ PAUSE message received:", { pausedAtMs: pauseMsg.pausedAtMs })
            if (currentSourceRef.current) { stopSource(currentSourceRef.current); currentSourceRef.current = null }
            audioHelpers.current.pause()
            setPlaybackState(prev => ({ ...prev, isPlaying: false, currentPosition: pauseMsg.pausedAtMs || prev.currentPosition }))
            onSyncRef.current?.(msg)
          }

          if (msg.type === SYNC_TYPES.RESUME) {
            const resumeMsg = msg as ResumeMessage
            if (devMode) console.log("▶️ RESUME message received:", { masterClockMs: resumeMsg.masterClockMs, playbackPositionMs: resumeMsg.playbackPositionMs })
            // Align paused position to authoritative server position before resuming
            ;(async () => {
              const el = audioRef.current
              if (!el) return
              const pos = typeof resumeMsg.playbackPositionMs === 'number' ? resumeMsg.playbackPositionMs : 0
              if (el.readyState < 1) {
                await new Promise<void>((resolve) => {
                  const onMeta = () => { el.removeEventListener('loadedmetadata', onMeta); resolve() }
                  el.addEventListener('loadedmetadata', onMeta, { once: true })
                  el.load()
                })
              }
              try { el.currentTime = pos / 1000 } catch {}
              if (el.readyState < 2) {
                await new Promise<void>((resolve) => {
                  let settled = false
                  const onCanPlay = () => { if (!settled) { settled = true; el.removeEventListener('canplay', onCanPlay); resolve() } }
                  el.addEventListener('canplay', onCanPlay, { once: true })
                  setTimeout(() => { if (!settled) { settled = true; el.removeEventListener('canplay', onCanPlay); resolve() } }, 500)
                })
              }
              if (webAudioEnabledRef.current) {
                scheduleWebAudio({
                  audioUrl: el.src,
                  offsetSeconds: pos / 1000,
                  targetServerTimeMs: resumeMsg.masterClockMs,
                  serverOffsetMs: playbackState.serverOffsetMs
                }).then(r => { if (r.started) currentSourceRef.current = r.source; else el.play().catch(()=>{}) })
                  .catch(()=>{ el.play().catch(()=>{}) })
              } else {
                el.play().catch(()=>{})
              }
              scheduledStartPositionMsRef.current = pos
              scheduledMasterClockMsRef.current = resumeMsg.masterClockMs
              lastSeekOrResumeAtRef.current = performance.now()
            })()
            setPlaybackState(prev => ({ ...prev, isPlaying: true, currentPosition: resumeMsg.playbackPositionMs || prev.currentPosition }))
            onSyncRef.current?.(resumeMsg)
          }

          if (msg.type === SYNC_TYPES.SEEK) {
            const seekMsg = msg as SeekMessage
            if (devMode) console.log("⏩ SEEK message received:", { seekPositionMs: seekMsg.seekPositionMs })
            ;(async () => {
              const el = audioRef.current
              if (!el) return
              if (el.readyState < 1) {
                await new Promise<void>((resolve) => {
                  const onMeta = () => { el.removeEventListener('loadedmetadata', onMeta); resolve() }
                  el.addEventListener('loadedmetadata', onMeta, { once: true })
                  el.load()
                })
              }
              try { el.currentTime = (seekMsg.seekPositionMs || 0) / 1000 } catch {}
              // Update our expected mapping to avoid immediate drift corrections
              const filteredOffset = timeSyncCalcRef.current.getFilteredOffset?.() ?? timeSyncCalcRef.current.getOffset()
              const monoDelta = monotonicToUnixDeltaRef.current || (timeSyncCalcRef.current as any)._monotonicToUnixDelta || 0
              const serverUnixNow = (seekMsg.serverNow as number) || (Date.now() + filteredOffset)
              const serverMonotonicNow = serverUnixNow - monoDelta
              scheduledMasterClockMsRef.current = serverMonotonicNow
              scheduledStartPositionMsRef.current = seekMsg.seekPositionMs || 0
              lastSeekOrResumeAtRef.current = performance.now()
            })()
            setPlaybackState(prev => ({ ...prev, currentPosition: seekMsg.seekPositionMs || 0, isPlaying: true }))
            onSyncRef.current?.(seekMsg)
          }

          if (msg.type === SYNC_TYPES.TRACK_CHANGE) {
            const trackChangeMsg = msg as TrackChangeMessage
            if (devMode) console.log("🎵 TRACK_CHANGE message received:", trackChangeMsg.trackData)

            if (trackChangeMsg.trackData?.audioUrl) {
              if (devMode) console.log("📱 Loading new track:", trackChangeMsg.trackData.title)

              scheduleSync(trackChangeMsg.trackData.audioUrl, Date.now(), trackChangeMsg.trackData.duration, 0, 0)
                .catch(err => { console.error("Track change scheduling error:", err) })

              setPlaybackState(prev => ({ ...prev, isPlaying: true }))
            }

            onSyncRef.current?.(msg)
          }

          if (msg.type === SYNC_TYPES.RESYNC) {
            const resyncMsg = msg as ResyncMessage
            const driftAmount = Math.abs(((audioRef.current?.currentTime || 0) * 1000) - (resyncMsg.correctPositionMs || 0))
            if (devMode) console.log("🔄 RESYNC received - Drift correction")
            const beforeMs = ((audioRef.current?.currentTime || 0) * 1000)
            if (devMode) {
              console.log(`   Before: ${beforeMs.toFixed(0)}ms`)
              console.log(`   After: ${resyncMsg.correctPositionMs.toFixed(0)}ms`)
              console.log(`   Drift: ${driftAmount.toFixed(0)}ms`)
            }

            if (resyncMsg.correctPositionMs !== undefined && resyncMsg.correctPositionMs !== null && audioRef.current) {
              try { audioRef.current.currentTime = resyncMsg.correctPositionMs / 1000 } catch {}
            }
          }

        }

        ws.onclose = (ev) => {
          if (devMode) console.log("🔌 Sync WebSocket disconnected", { code: ev.code, reason: (ev as any).reason, wasClean: (ev as any).wasClean, attempts: reconnectAttempts })
          joinedRef.current = false
          if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current)
          if (driftCheckIntervalRef.current) clearInterval(driftCheckIntervalRef.current)
          if (driftAutoCorrectIntervalRef.current) clearInterval(driftAutoCorrectIntervalRef.current)

          if (isMounted) {
            reconnectAttempts++
            const jitter = Math.floor(Math.random() * 400)
            const delay = Math.min(1000 * Math.pow(1.6, reconnectAttempts - 1), 30000) + jitter
            if (devMode) console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
            reconnectTimeout = setTimeout(connect, delay)
          }
        }

        ws.onerror = (err) => {
          console.warn('⚠️ WebSocket error', err)
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
      if (stateFetchTimerRef.current) clearTimeout(stateFetchTimerRef.current)
      if (timeSyncIntervalRef.current) clearInterval(timeSyncIntervalRef.current)
      if (driftCheckIntervalRef.current) clearInterval(driftCheckIntervalRef.current)
      if (driftAutoCorrectIntervalRef.current) clearInterval(driftAutoCorrectIntervalRef.current)
      if (positionRafRef.current !== null) cancelAnimationFrame(positionRafRef.current)
      positionRafRef.current = null
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      // HTMLAudio cleanup handled by page; no WebAudio scheduler
    }
  }, [roomCode, userId, hostId])

  return {
    playbackState,
    commands: { play, pause, resume, seek, trackChange },
    syncClientTime,
    isHost,
    timeSync: timeSyncCalcRef.current,
    joiningSync
  }
}
