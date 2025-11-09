"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { getSocket, joinRoomSocket, leaveRoomSocket } from "@/lib/sync/sync"
import { syncClock, toClientTime, type Clock } from "@/lib/sync/clock"

type ConnectedUser = {
  socketId: string
  userId: string
  userName?: string
}

type RoomParticipant = {
  userId: string
  user?: { name?: string }
}

type RoomResponse = {
  name: string
  hostId: string
  participants?: RoomParticipant[]
}

const dedupeUsers = (users: ConnectedUser[]): ConnectedUser[] => {
  const map = new Map<string, ConnectedUser>()
  users.forEach((user) => {
    if (user.socketId) {
      map.set(user.socketId, user)
    }
  })
  return Array.from(map.values())
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomcode = params.code as string

  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [socketId, setSocketId] = useState<string | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [socketReady, setSocketReady] = useState(false)
  const [clock, setClock] = useState<Clock | null>(null)
  const [trackUrl, setTrackUrl] = useState<string | null>(null)
  const [trackName, setTrackName] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [trackInput, setTrackInput] = useState("")

  // File transfer state (used by the transfer progress UI)
  const [isTransferring, setIsTransferring] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [downloadProgress, setDownloadProgress] = useState<number>(0)

  const audioRef = useRef<HTMLAudioElement>(null)
  const clockRef = useRef<Clock | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

  useEffect(() => {
    clockRef.current = clock
  }, [clock])

  useEffect(() => {
    if (!audioRef.current) return

    if (trackUrl) {
      audioRef.current.src = trackUrl
      audioRef.current.load()
    } else {
      audioRef.current.removeAttribute("src")
      audioRef.current.load()
    }
  }, [trackUrl])

  const setTrackSource = useCallback((nextUrl: string | null) => {
    if (blobUrlRef.current && blobUrlRef.current !== nextUrl) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    setTrackUrl(nextUrl)

    if (nextUrl && nextUrl.startsWith("blob:")) {
      blobUrlRef.current = nextUrl
    }
  }, [])

  useEffect(() => {
    setMounted(true)

    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current)
        blobUrlRef.current = null
      }
    }
  }, [])

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

  useEffect(() => {
    if (!roomcode || !userId) return

    const socket = joinRoomSocket(roomcode)

    const onConnect = async () => {
      setSocketReady(true)
      setSocketId(socket.id)

      try {
        const clockSync = await syncClock(socket)
        setClock(clockSync)
        console.log("⏰ Clock synced - offset:", clockSync.offset, "ms, rtt:", clockSync.rtt, "ms")
      } catch (err) {
        console.error("Clock sync failed", err)
        toast.error("Clock sync failed")
      }
    }

    const onDisconnect = () => {
      setSocketReady(false)
    }

    const onRoomMembers = ({ users }: { users: ConnectedUser[] }) => {
      setConnectedUsers(dedupeUsers(users))
    }

    const onUserJoined = (payload: ConnectedUser) => {
      toast.info(`${payload.userName || payload.userId} joined the room`)
      setConnectedUsers((prev) => dedupeUsers([...prev, payload]))
    }

    const onUserLeft = ({ socketId: departingId, userId: departingUserId, userName }: ConnectedUser) => {
      toast.info(`${userName || departingUserId} left the room`)
      setConnectedUsers((prev) => prev.filter((user) => user.socketId !== departingId))
    }

    const onSetTrack = ({ from, url, name }: { from?: string; url?: string; name?: string }) => {
      const isSelf = from ? from === socket.id : false

      if (!url) {
        if (!isSelf) {
          setTrackSource(null)
          setTrackName(null)
          setIsPlaying(false)
          toast.info("Host cleared the track")
        }
        return
      }

      const label = name || url
      setTrackName(label)
      setTrackSource(url)
      setIsPlaying(false)

      if (!isSelf) {
        toast.success(`Track loaded: ${label}`)
      }
    }

    const onPlayAt = ({ startAt }: { startAt: number }) => {
      const currentClock = clockRef.current
      if (!audioRef.current || !currentClock || !trackUrl) {
        toast.error("Track not ready for playback")
        return
      }

      const clientTarget = toClientTime(startAt, currentClock.offset)
      const delay = clientTarget - Date.now()
      console.log("▶️  Play scheduled - delay:", delay, "ms")

      const playAudio = () => {
        audioRef.current
          ?.play()
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn("Play failed:", err)
            toast.error("Playback failed - tap play manually")
          })
      }

      if (delay <= 0) {
        playAudio()
      } else {
        setTimeout(playAudio, delay)
      }
    }

    const onPause = () => {
      audioRef.current?.pause()
      setIsPlaying(false)
    }

    const onSeek = ({ position }: { position: number }) => {
      if (audioRef.current) {
        audioRef.current.currentTime = position
      }
    }

    if (socket.connected) {
      void onConnect()
    } else {
      socket.on("connect", onConnect)
    }

    socket.on("disconnect", onDisconnect)
    socket.on("room:members", onRoomMembers)
    socket.on("room:user-joined", onUserJoined)
    socket.on("room:user-left", onUserLeft)
    socket.on("playback:set-track", onSetTrack)
    socket.on("playback:play-at", onPlayAt)
    socket.on("playback:pause", onPause)
    socket.on("playback:seek", onSeek)

    return () => {
      socket.off("connect", onConnect)
      socket.off("disconnect", onDisconnect)
      socket.off("room:members", onRoomMembers)
      socket.off("room:user-joined", onUserJoined)
      socket.off("room:user-left", onUserLeft)
      socket.off("playback:set-track", onSetTrack)
      socket.off("playback:play-at", onPlayAt)
      socket.off("playback:pause", onPause)
      socket.off("playback:seek", onSeek)

      leaveRoomSocket(roomcode)
      setConnectedUsers([])
    }
  }, [roomcode, userId, setTrackSource, trackUrl, socketId])

  const handleTrackLoad = () => {
    const url = trackInput.trim()
    if (!url) {
      toast.error("Enter an audio URL")
      return
    }

    const inferredName = url.split("/").pop() || url
    setTrackInput(url)
    setTrackSource(url)
    setTrackName(inferredName)
    setIsPlaying(false)

    if (audioRef.current) {
      audioRef.current.src = url
      audioRef.current.load()
    }

    const socket = getSocket()
    socket.emit("playback:set-track", {
      code: roomcode,
      url,
      name: inferredName
    })

    toast.success("Track shared with room")
  }

  const handlePlaySync = () => {
    if (!clockRef.current) {
      toast.error("Clock not synced yet")
      return
    }

    if (!trackUrl) {
      toast.error("Load a track before playing")
      return
    }

    const socket = getSocket()
    const startAt = Date.now() + clockRef.current.offset + 1000
    socket.emit("playback:play-at", { code: roomcode, startAt })
    toast.success("Play scheduled in 1s")
  }

  const handlePause = () => {
    const socket = getSocket()
    socket.emit("playback:pause", { code: roomcode })
    toast.info("Paused")
  }

  const handleSeek = () => {
    const position = prompt("Seek to position (seconds):")
    if (!position) return

    const value = Number.parseFloat(position)
    if (Number.isNaN(value)) {
      toast.error("Enter a valid number")
      return
    }

    const socket = getSocket()
    socket.emit("playback:seek", { code: roomcode, position: value })
  }

  const handleLeaveRoom = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }

    leaveRoomSocket(roomcode)
    setConnectedUsers([])
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

  const visibleUsers = connectedUsers.filter((user) => user.socketId !== socketId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white p-8">
      <audio ref={audioRef} preload="auto" />

      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">{roomData?.name}</h1>
        <p className="text-gray-400 mb-2">
          Room Code: <span className="text-blue-400 font-mono text-xl">{roomcode}</span>
        </p>
        <p className="text-gray-400 mb-6">
          Status: {socketReady ? "🟢 Connected" : "🔴 Disconnected"} | Clock: {clock ? `⏰ Synced (±${clock.rtt}ms)` : "⏳ Syncing..."}
        </p>

        {isTransferring && (
          <div className="bg-blue-900/30 border border-blue-500/40 rounded-xl p-4 mb-6">
            <p className="font-semibold mb-2">File transfer in progress…</p>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-3">
                <p className="text-sm text-gray-300 mb-1">Uploading: {uploadProgress}%</p>
                <div className="w-full bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-blue-400 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {downloadProgress > 0 && downloadProgress < 100 && (
              <div>
                <p className="text-sm text-gray-300 mb-1">Downloading: {downloadProgress}%</p>
                <div className="w-full bg-gray-700 h-2 rounded-full">
                  <div
                    className="bg-green-400 h-2 rounded-full transition-all"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

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

        <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">🔌 Connected Now ({visibleUsers.length + 1})</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-green-400">●</span>
              <span>You</span>
              {isHost && <span className="text-yellow-400">👑 Host</span>}
            </div>
            {visibleUsers.length > 0 ? (
              visibleUsers.map((user) => (
                <div key={user.socketId} className="flex items-center gap-2">
                  <span className="text-green-400">●</span>
                  <span>{user.userName || user.userId}</span>
                  {user.userId === roomData?.hostId && <span className="text-yellow-400">👑 Host</span>}
                </div>
              ))
            ) : (
              <p className="text-gray-500">No other participants connected yet</p>
            )}
          </div>
        </div>

        {isHost && clock && (
          <div className="bg-blue-900/40 rounded-xl p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">🎛️ Host Controls</h3>

            <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
              <input
                value={trackInput}
                onChange={(event) => setTrackInput(event.target.value)}
                placeholder="https://example.com/audio.mp3"
                className="flex-1 rounded-md border border-gray-600 bg-gray-900/60 px-4 py-2 text-white focus:border-blue-500 focus:outline-none"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleTrackLoad}
                  className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                  disabled={!trackInput.trim()}
                >
                  🎵 Share Track URL
                </button>
                <button
                  onClick={() => {
                    setTrackInput("")
                    setTrackSource(null)
                    setTrackName(null)
                    setIsPlaying(false)
                    const socket = getSocket()
                    socket.emit("playback:set-track", { code: roomcode, clear: true })
                    toast.info("Track cleared")
                  }}
                  className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600"
                >
                  ♻️ Clear
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-300 mb-4">
              Provide a direct audio URL accessible to all listeners. The track will load on every device via HTTP.
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePlaySync}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
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
              <button
                onClick={handleSeek}
                className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={!trackUrl}
              >
                ⏩ Seek
              </button>
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
