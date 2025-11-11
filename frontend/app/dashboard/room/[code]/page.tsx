"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { toast } from "react-toastify"

type RoomParticipant = {
  userId: string
  user?: { name?: string }
}

type RoomResponse = {
  name: string
  hostId: string
  participants?: RoomParticipant[]
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomcode = params.code as string

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [trackUrl, setTrackUrl] = useState<string | null>(null)
  const [trackName, setTrackName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const wsRef = useRef<WebSocket | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const globalMappingRef = useRef<{ offsetMs: number; mapPair: { clientNowMs: number; audioNowSec: number } } | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
  const wsUrl = process.env.NEXT_PUBLIC_REALTIME_URL?.replace('http', 'ws') || "ws://localhost:5002"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch room data
  useEffect(() => {
    if (!mounted) return

    const fetchRoomData = async () => {
      try {
        setLoading(true)
        const token = localStorage.getItem("token")
        if (!token) {
          toast.error("Please login first")
          router.push("/")
          return
        }

        const res = await fetch(`${apiUrl}/api/room/${roomcode}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        })

        const data = await res.json()
        if (res.ok && data.room) {
          setRoomData(data.room as RoomResponse)
          setUserId(data.userId as string)
          setIsHost(data.room.hostId === data.userId)
        } else {
          toast.error("Failed to load room")
          router.push("/dashboard")
        }
      } catch (err) {
        console.error("Room fetch error:", err)
        toast.error("Error loading room")
      } finally {
        setLoading(false)
      }
    }

    if (roomcode) {
      void fetchRoomData()
    }
  }, [mounted, roomcode, router, apiUrl])

  // WebSocket connection
  useEffect(() => {
    if (!userId || !roomcode) return

    const token = localStorage.getItem("token")
    const ws = new WebSocket(`${wsUrl}?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      console.log("✅ WS connected")
      ws.send(JSON.stringify({ type: "join", roomId: roomcode }))
      // Initialize Web Audio
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }

    ws.onmessage = async (ev) => {
      const msg = JSON.parse(ev.data)
      switch (msg.type) {
        case "joined":
          console.log(`Joined room=${msg.roomId}`)
          break
        case "time_pong":
          handlePong(msg)
          break
        case "PLAY":
          console.log(`PLAY cmd received: startServerMs=${msg.startServerMs}`)
          await handlePlay(msg.audioUrl, msg.startServerMs)
          break
        case "PAUSE":
          console.log("PAUSE received")
          if (currentSourceRef.current) {
            currentSourceRef.current.stop()
            currentSourceRef.current = null
          }
          setIsPlaying(false)
          break
      }
    }

    ws.onclose = () => {
      console.log("WS closed")
    }

    return () => {
      ws.close()
    }
  }, [userId, roomcode, wsUrl])

  // Clock sync functions
  const pendingPings = useRef(new Map())

  const sendPing = () => {
    return new Promise((resolve, reject) => {
      const id = Math.random().toString(36).slice(2, 9)
      const t0 = Date.now()
      pendingPings.current.set(id, { t0, resolve })
      wsRef.current?.send(JSON.stringify({ type: "time_ping", id, t0 }))
      setTimeout(() => {
        if (pendingPings.current.has(id)) {
          pendingPings.current.delete(id)
          reject("Ping timeout")
        }
      }, 1500)
    })
  }

  const estimateOffset = async (samples = 6) => {
    const results: Array<{ offset: number; rtt: number }> = []
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return null

    for (let i = 0; i < samples; i++) {
      try {
        const pong = await sendPing() as any
        const t3 = Date.now()
        const serverTime = pong.serverTime
        const rtt = t3 - pong.t0
        const offset = serverTime - (pong.t0 + rtt / 2)
        results.push({ offset, rtt })
      } catch (e) {
        console.error("Ping failed", e)
      }
      await new Promise(r => setTimeout(r, 100))
    }

    results.sort((a, b) => a.rtt - b.rtt)
    const best = results[0]
    const mapPair = { clientNowMs: Date.now(), audioNowSec: audioCtx.currentTime }
    console.log(`⏱️ Offset=${best.offset.toFixed(2)}ms RTT=${best.rtt.toFixed(2)}ms`)
    return { offsetMs: best.offset, mapPair }
  }

  const handlePong = (msg: any) => {
    const pendingPing = pendingPings.current.get(msg.id)
    if (!pendingPing) return
    pendingPing.resolve(msg)
    pendingPings.current.delete(msg.id)
  }

  const serverMsToAudioCtxTime = (serverMs: number, mapping: { offsetMs: number; mapPair: { clientNowMs: number; audioNowSec: number } }) => {
    const clientEquivalentMs = serverMs - mapping.offsetMs
    const deltaMs = clientEquivalentMs - mapping.mapPair.clientNowMs
    return mapping.mapPair.audioNowSec + deltaMs / 1000
  }

  // Web Audio playback
  const handlePlay = async (audioUrl: string, startServerMs: number) => {
    const audioCtx = audioCtxRef.current
    if (!audioCtx) return

    if (audioCtx.state === 'suspended') await audioCtx.resume()

    // Stop any current playback
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
    }

    const mapping = await estimateOffset()
    if (!mapping) return
    globalMappingRef.current = mapping

    const startAudioCtxTime = serverMsToAudioCtxTime(startServerMs, mapping)
    const now = audioCtx.currentTime
    const safeStart = Math.max(startAudioCtxTime, now + 0.2)
    console.log(`🎧 Scheduling audio at ${safeStart.toFixed(3)} (current ${now.toFixed(3)})`)

    try {
      const fullUrl = audioUrl.startsWith('http') ? audioUrl : window.location.origin + audioUrl
      const res = await fetch(fullUrl)
      const buf = await res.arrayBuffer()
      const audioBuffer = await audioCtx.decodeAudioData(buf)

      const src = audioCtx.createBufferSource()
      src.buffer = audioBuffer
      src.connect(audioCtx.destination)
      src.start(safeStart)
      currentSourceRef.current = src
      src.onended = () => {
        console.log("Audio ended.")
        setIsPlaying(false)
        currentSourceRef.current = null
      }
      setIsPlaying(true)
      setTrackUrl(audioUrl)
      setTrackName(audioUrl.split('/').pop() || audioUrl)
    } catch (e) {
      console.error('Playback failed:', e)
      toast.error('Playback failed')
    }
  }

  const handlePause = () => {
    wsRef.current?.send(JSON.stringify({ type: "PAUSE" }))
    toast.info("Pause sent")
  }

  const handlePlaySync = () => {
    if (!trackUrl) return
    const startServerMs = Date.now() + 2000 // Schedule play in 2 seconds
    wsRef.current?.send(JSON.stringify({ type: "PLAY", audioUrl: trackUrl, startServerMs }))
    toast.info("Play command sent")
  }

  const handleLeaveRoom = () => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop()
      currentSourceRef.current = null
    }
    wsRef.current?.send(JSON.stringify({ type: "leave" }))
    toast.info("Left the room")
    router.push("/dashboard")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
        <p className="text-xl">Loading room...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{roomData?.name}</h1>
        <p className="text-gray-400 mb-2">
          Room Code: <span className="text-blue-400 font-mono text-xl">{roomcode}</span>
        </p>
        <p className="text-gray-400 mb-6">
          Status: Connected
        </p>

        <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Now Playing</h2>
          {trackName ? (
            <div>
              <p className="text-lg font-semibold mb-2">{trackName}</p>
              <p className="text-lg">{isPlaying ? "▶️ Playing" : "⏸️ Paused"}</p>
            </div>
          ) : (
            <p className="text-gray-500">No track loaded</p>
          )}
        </div>

        {isHost && (
          <div className="bg-blue-900/40 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">🎛️ Host Controls</h3>
            <div className="flex flex-col gap-4">
              <button
                onClick={() => {
                  setTrackUrl("/sample.mp3")
                  setTrackName("Sample Track")
                  toast.success("Sample track loaded")
                }}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700"
              >
                🎵 Load Sample Track
              </button>
              <div className="flex gap-3">
                <button
                  onClick={handlePlaySync}
                  className="px-4 py-2 rounded bg-green-600 hover:bg-green-700"
                  disabled={!trackUrl}
                >
                  ▶️ Play (Sync)
                </button>
                <button
                  onClick={handlePause}
                  className="px-4 py-2 rounded bg-gray-600 hover:bg-gray-700"
                >
                  ⏸️ Pause
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">👥 Participants ({roomData?.participants?.length || 0})</h3>
          <div className="space-y-2">
            {roomData?.participants?.map((participant) => (
              <div key={participant.userId} className="flex items-center gap-2">
                <span className="text-green-400">●</span>
                <span>{participant.user?.name || participant.userId}</span>
                {participant.userId === roomData.hostId && <span className="text-yellow-400">👑 Host</span>}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleLeaveRoom}
          className="px-6 py-3 rounded bg-red-600 hover:bg-red-700"
        >
          🚪 Leave Room
        </button>
      </div>
    </div>
  )
}
