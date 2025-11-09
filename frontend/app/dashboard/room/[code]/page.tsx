"use client"

import { useParams, useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "react-toastify"
import { getSocket, joinRoomSocket, leaveRoomSocket } from "@/lib/sync/sync"
import { syncClock, toClientTime, type Clock } from "@/lib/sync/clock"
import { WebRtcFileStream, type FileTransfer } from "@/lib/sync/webrtc"

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
  const [uploadProgress, setUploadProgress] = useState(0)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [isTransferring, setIsTransferring] = useState(false)
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
  const [isDragging, setIsDragging] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const webrtcRef = useRef<WebRtcFileStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const clockRef = useRef<Clock | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

  useEffect(() => {
    clockRef.current = clock
  }, [clock])

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
      if (webrtcRef.current) {
        webrtcRef.current.cleanup()
        webrtcRef.current = null
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

    const ensureWebRtc = () => {
      if (webrtcRef.current) return

      const instance = new WebRtcFileStream(socket)
      instance.onFileSendProgress = (_, progress) => {
        setUploadProgress(progress)
      }
      instance.onFileReceiveStart = (_, metadata) => {
        setIsTransferring(true)
        setDownloadProgress(0)
        setTrackName(metadata.fileName)
        toast.info(`Receiving "${metadata.fileName}"`)
      }
      instance.onFileReceiveProgress = (_, progress) => {
        setDownloadProgress(progress)
      }
      instance.onFileReceived = (_, url, metadata) => {
        setDownloadProgress(100)
        setTrackName(metadata.fileName)
        setTrackSource(url)
        setIsPlaying(false)
        setTimeout(() => setIsTransferring(false), 250)
        toast.success(`Received: ${metadata.fileName}`)
      }

      webrtcRef.current = instance
    }

    ensureWebRtc()

    const onConnect = async () => {
      setSocketReady(true)
      setSocketId(socket.id)
      ensureWebRtc()

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
      if (departingId === socketId) {
        setIsTransferring(false)
      }
    }

    const onSetTrack = ({ url, name, metadata }: { url?: string; name?: string; metadata?: FileTransfer }) => {
      const displayName = name || metadata?.fileName || null
      if (displayName) {
        setTrackName(displayName)
      }

      if (url) {
        setTrackSource(url)
      } else {
        setTrackSource(null)
      }

      if (!url && metadata) {
        toast.info(`Track ready: ${metadata.fileName}. Waiting for stream...`)
      }

      setIsPlaying(false)
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

      if (webrtcRef.current) {
        webrtcRef.current.cleanup()
        webrtcRef.current = null
      }

      leaveRoomSocket(roomcode)
      setConnectedUsers([])
    }
  }, [roomcode, userId, setTrackSource, trackUrl, socketId])

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Please select an audio file")
      return
    }

    if (!webrtcRef.current) {
      toast.error("WebRTC not initialized yet")
      return
    }

    const localUrl = URL.createObjectURL(file)
    setTrackSource(localUrl)
    setTrackName(file.name)
    setIsPlaying(false)

    if (audioRef.current) {
      audioRef.current.src = localUrl
      audioRef.current.load()
    }

    const activeSocketId = socketId || getSocket().id
    const recipients = connectedUsers
      .filter((user) => user.socketId && user.socketId !== activeSocketId)
      .map((user) => user.socketId)

    if (recipients.length > 0) {
      setIsTransferring(true)
      setUploadProgress(0)
      try {
        await webrtcRef.current.sendFile(file, recipients)
        setUploadProgress(100)
        setTimeout(() => setIsTransferring(false), 250)
        toast.success(`Track sent to ${recipients.length} participant${recipients.length > 1 ? "s" : ""}`)
      } catch (err) {
        console.error("File transfer error:", err)
        setIsTransferring(false)
        toast.error("Failed to send file")
      }
    } else {
      toast.info("Track ready locally. Waiting for others to join.")
    }

    const metadata: FileTransfer = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      totalChunks: Math.ceil(file.size / 16_384)
    }

    const socket = getSocket()
    socket.emit("playback:set-track", {
      code: roomcode,
      name: file.name,
      metadata
    })
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)

    const file = event.dataTransfer.files[0]
    if (file) {
      void handleFileSelect(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      void handleFileSelect(file)
    }
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

    if (isTransferring) {
      toast.info("Please wait for the file transfer to finish")
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
    if (webrtcRef.current) {
      webrtcRef.current.cleanup()
      webrtcRef.current = null
    }

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

            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all ${
                isDragging ? "border-blue-400 bg-blue-500/20" : "border-gray-600 hover:border-blue-500 hover:bg-gray-800/40"
              }`}
            >
              <div className="flex flex-col items-center gap-3">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <p className="text-lg font-semibold">{isDragging ? "Drop audio file here" : "Drag & drop audio file"}</p>
                <p className="text-sm text-gray-400">or click to browse</p>
                <p className="text-xs text-gray-500">Files stream peer-to-peer via WebRTC</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileInput}
              className="hidden"
            />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handlePlaySync}
                className="px-4 py-2 rounded bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                disabled={!trackUrl || isTransferring}
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
                disabled={!trackUrl || isTransferring}
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
