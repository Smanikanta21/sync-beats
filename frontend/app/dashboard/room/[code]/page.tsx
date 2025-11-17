"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { toast } from "react-toastify"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Users, LogOut, Music, Clock, Crown, User, Search, Plus, Trash2, ArrowUp, ArrowDown, Shuffle, Repeat, X, ListMusic, Settings, Copy, Globe, Lock, Info, Radio, Wifi } from "lucide-react"

type RoomResponse = {
  name: string
  code: string
  hostId: string
  type?: string
  isPublic?: boolean
  wifiSSID?: string
  createdAt?: string
  participants: Array<{
    userId: string;
    user?: { name?: string }
  }>
}

type Track = {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  coverUrl?: string,
  audioUrl?: string
  playedAt?: string
  addedBy?: string
}

type QueueItem = Track & {
  queueId: string
  addedAt: string
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomcode = params.code as string

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const wsIdRef = useRef<string | null>(null)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [isHost, setIsHost] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(75)
  const [isMuted, setIsMuted] = useState(false)
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [shuffleMode, setShuffleMode] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')

  // Search and add songs
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Room settings
  const [copied, setCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  // Mock tracks for demo - replace with API call later
  const mockTracks: Track[] = [
    {
      id: "1",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: 200,
      audioUrl: "/audio/Blinding Lights.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EBlinding Lights%3C/text%3E%3C/svg%3E",
      playedAt: new Date(Date.now() - 300000).toISOString()
    },
    {
      id: "2",
      title: "sunflower",
      artist: "Post Malone & Swae Lee",
      album: "",
      duration: 174,
      audioUrl: "/audio/sunflower.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3Esunflower%3C/text%3E%3C/svg%3E",
      playedAt: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: "3",
      title: "Levitating",
      artist: "Dua Lipa",
      album: "Future Nostalgia",
      duration: 203,
      audioUrl: "/audio/Levitating.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3ELevitating%3C/text%3E%3C/svg%3E",
      playedAt: new Date(Date.now() - 900000).toISOString()
    },
    {
      id: "4",
      title: "Double Take",
      artist: "Dhruv",
      album: "Single",
      duration: 215,
      audioUrl: "/audio/Double Take.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EDouble Take%3C/text%3E%3C/svg%3E"
    }
  ]

  // Mock search results - replace with API call later
  const mockSearchResults: Track[] = [
    {
      id: "4",
      title: "As It Was",
      artist: "Harry Styles",
      album: "Harry's House",
      duration: 167,
      audioUrl: "/audio/As It Was.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EAs It Was%3C/text%3E%3C/svg%3E"
    },
    {
      id: "5",
      title: "Stay",
      artist: "The Kid LAROI & Justin Bieber",
      album: "F*CK LOVE 3",
      duration: 141,
      audioUrl: "/audio/Stay.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EStay%3C/text%3E%3C/svg%3E"
    },
    {
      id: "6",
      title: "Heat Waves",
      artist: "Glass Animals",
      album: "Dreamland",
      duration: 238,
      audioUrl: "/audio/Heat Waves.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EHeat Waves%3C/text%3E%3C/svg%3E"
    },
    {
      id: "7",
      title: "Good 4 U",
      artist: "Olivia Rodrigo",
      album: "SOUR",
      duration: 178,
      audioUrl: "/audio/Good 4 U.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EGood 4 U%3C/text%3E%3C/svg%3E"
    },
    {
      id: "8",
      title: "Peaches",
      artist: "Justin Bieber ft. Daniel Caesar & Giveon",
      album: "Justice",
      duration: 198,
      audioUrl: "/audio/Peaches.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EPeaches%3C/text%3E%3C/svg%3E"
    }
  ]


  useEffect(() => {
    if (!wsRef.current) return

    const interval = setInterval(() => {
      wsRef.current?.send(JSON.stringify({
        type: "time_ping",
        id: Math.random().toString(36),
        t0: Date.now(),
      }))
    }, 2000)

    return () => clearInterval(interval)
  }, [])




  useEffect(() => {
    if (!mounted || !roomData) return;

    const socketHost = process.env.NEXT_PUBLIC_SOCKET_HOST || 'localhost';
    const socketPort = process.env.NEXT_PUBLIC_SOCKET_PORT
    const protocol = socketHost.includes('onrender') ? 'wss' : 'ws';
    const ws = new WebSocket(`${protocol}://${socketHost}:${socketPort}`);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("🟢 WebSocket connected");
      let userId = null;
      const token = localStorage.getItem("token");

      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));

          // REAL FIX — match your backend JWT
          userId =
            payload.id ||             // your JWT uses this
            payload.userId ||         // fallback
            payload.user?.id ||       // older format
            payload.sub || null;      // OAuth style

          console.log("Decoded userId:", userId);
          console.log("Room hostId:", roomData.hostId);
          console.log("MATCH =", userId === roomData.hostId);
        } catch (err) {
          console.error("JWT decode failed:", err);
        }
      }

      console.log("🔥 Sending JOIN with hostId =", roomData.hostId);

      ws.send(JSON.stringify({
        type: "join",
        roomCode: roomcode,
        userId,
        hostId: roomData.hostId   // <---- NOW CORRECT
      }));
    };

    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      console.log("📨 WebSocket message received:", msg);

      if (msg.type === "joined") {
        console.log("✅ Joined live room", msg);
        wsIdRef.current = msg.yourId;
        setIsHost(msg.isHost);
        toast.success(`Connected to room (Host: ${msg.isHost})`);
      }

      if (msg.type === "user_joined") {
        console.log("👥 Other user joined:", msg);
        toast.info(`User joined. Total: ${msg.totalClients}`);
      }

      if (msg.type === "time_pong") {
        const t1 = Date.now();
        const rtt = t1 - msg.t0;
        const offset = msg.serverTime - (msg.t0 + rtt / 2);
        setServerOffsetMs(offset);
        console.log("⏰ Clock sync offset:", offset);
      }

      if (msg.type === "PLAY") {
        console.log("PLAY received:", msg);

        const track = findTrackByAudioUrl(msg.audioUrl);
        if (!track) {
          console.error("Track not found for url:", msg.audioUrl);
        } else {
          console.log("Matched track:", track.title);
          setCurrentTrack(track);
        }

        handleSyncPlay(msg);
      }
    };

    ws.onerror = (error) => {
      console.error("🔴 WebSocket error:", error);
      toast.error("Connection error");
    };

    ws.onclose = () => {
      console.log("🔌 WebSocket disconnected");
      toast.warning("Disconnected from room");
    };

    return () => {
      console.log("🛑 Closing WebSocket connection");
      ws.close();
    };
  }, [mounted, roomData, roomcode]);

  const findTrackByAudioUrl = (url: string): Track | null => {
    console.log("Finding track:", url);
    const all = [...mockTracks, ...mockSearchResults, ...queue];
    return all.find(t => t.audioUrl?.trim() === url.trim()) || null;
  };

  const scheduleSyncPlay = (audioElement: HTMLAudioElement, audioUrl: string, startServerMs: number, serverOffsetMs: number) => {
    audioElement.src = audioUrl;

    const now = Date.now() + serverOffsetMs;
    const delay = startServerMs - now;

    console.log("📊 scheduleSyncPlay", { startServerMs, now, delay, serverOffsetMs });

    if (delay > 0) {
      // Schedule play in the future
      setTimeout(() => {
        console.log("▶️ Playing after delay");
        audioElement.play().catch(err => console.error("Play error:", err));
      }, delay);
    } else {
      // We're late - start from the calculated position
      const lateBy = -delay;
      audioElement.currentTime = lateBy / 1000;
      console.log("⏩ Starting late by", lateBy, "ms, jumping to", audioElement.currentTime, "s");
      audioElement.play().catch(err => console.error("Play error:", err));
    }
  };

  const handleSyncPlay = (msg: { audioUrl: string; startServerMs: number }) => {
    const { audioUrl, startServerMs } = msg;
    if (!audioRef.current) {
      console.error("❌ handleSyncPlay: audioRef not available");
      return;
    }

    console.log("🎵 handleSyncPlay received:", msg);
    scheduleSyncPlay(audioRef.current, audioUrl, startServerMs, serverOffsetMs);
    setIsPlaying(true);
    console.log("✅ setIsPlaying called: true");
  };

  const startPlaySync = () => {
    if (!isHost) return toast.error("Only host can play");

    if (!currentTrack || !audioRef.current) {
      return toast.error("Select a song first");
    }

    const startDelayMs = 400;
    const startServerMs = Date.now() + startDelayMs;

    console.log("Host starting PLAY", {
      audioUrl: currentTrack.audioUrl,
      startServerMs,
    });

    // Host plays with sync scheduling
    scheduleSyncPlay(
      audioRef.current,
      currentTrack.audioUrl!,
      startServerMs,
      serverOffsetMs
    );

    wsRef.current?.send(
      JSON.stringify({
        type: "PLAY",
        audioUrl: currentTrack.audioUrl,
        startDelayMs,
        duration: currentTrack.duration,
      })
    );

    setIsPlaying(true);
  };

  useEffect(() => {
    setMounted(true)

    // Load tracks for UI but DO NOT select first track
    if (mockTracks.length > 0) {
      setRecentTracks([mockTracks[0]])   // show them in Recents
    }

    // Queue stays empty until user adds songs
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
          console.log("Fetched room data:", data.room)
          // Get current user ID from token (you might want to decode JWT properly)
          // For now, we'll check if user is host from room data
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

  // Music player controls
  // Cleanup interval on unmount or track change
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [currentTrack])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentTrack || !progressRef.current) return

    const rect = progressRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    const newTime = percentage * currentTrack.duration

    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
    if (audioRef.current) {
      audioRef.current.volume = newVolume / 100
    }
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? volume / 100 : 0
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const handlePrevious = () => {
    if (recentTracks.length > 0 && currentTrack) {
      const newRecent: Track[] = [currentTrack, ...recentTracks.slice(1)]
      setCurrentTrack(recentTracks[0])
      setRecentTracks(newRecent)
      setCurrentTime(0)
    }
  }

  const handleNext = () => {
    // Auto-play from queue if available
    if (queue.length > 0) {
      const nextTrack = shuffleMode
        ? queue[Math.floor(Math.random() * queue.length)]
        : queue[0]

      // Move current track to recently played
      if (currentTrack) {
        setRecentTracks(prev => [currentTrack, ...prev.slice(0, 9)])
      }

      // Remove from queue and set as current
      setQueue(prev => prev.filter(t => t.queueId !== nextTrack.queueId))
      setCurrentTrack(nextTrack)
      setCurrentTime(0)
      if (repeatMode === 'one') {
        setIsPlaying(true)
      }
    } else if (repeatMode === 'all' && recentTracks.length > 0) {
      // If repeat all and no queue, cycle through recent tracks
      const nextTrack = recentTracks[0]
      setRecentTracks(prev => [...prev.slice(1), currentTrack!])
      setCurrentTrack(nextTrack)
      setCurrentTime(0)
      setIsPlaying(true)
    } else if (recentTracks.length > 0) {
      // Fallback to old behavior
      const newRecent = [...recentTracks]
      if (currentTrack) {
        newRecent.unshift(currentTrack)
      }
      setCurrentTrack(newRecent.pop() || null)
      setRecentTracks(newRecent)
      setCurrentTime(0)
    }
  }

  // Auto-play next track when current finishes
  useEffect(() => {
    if (currentTrack && currentTime >= currentTrack.duration && isPlaying) {
      if (repeatMode === 'one') {
        setCurrentTime(0)
      } else {
        handleNext()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, currentTrack, isPlaying, repeatMode])

  // Search functionality
  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    // Simulate API call - replace with actual API
    setTimeout(() => {
      const filtered = mockSearchResults.filter(
        track =>
          track.title.toLowerCase().includes(query.toLowerCase()) ||
          track.artist.toLowerCase().includes(query.toLowerCase())
      )
      setSearchResults(filtered)
      setIsSearching(false)
    }, 500)
  }

  const addToQueue = (track: Track) => {
    const queueItem: QueueItem = {
      ...track,
      queueId: `queue-${Date.now()}-${Math.random()}`,
      addedAt: new Date().toISOString(),
      addedBy: "You" // Replace with actual user name
    }
    setQueue(prev => [...prev, queueItem])
    toast.success(`Added "${track.title}" to queue`)
    setShowSearchModal(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const removeFromQueue = (queueId: string) => {
    setQueue(prev => prev.filter(item => item.queueId !== queueId))
    toast.info("Removed from queue")
  }

  const moveQueueItem = (queueId: string, direction: 'up' | 'down') => {
    setQueue(prev => {
      const index = prev.findIndex(item => item.queueId === queueId)
      if (index === -1) return prev

      const newQueue = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= newQueue.length) return prev

      const temp = newQueue[index]
      newQueue[index] = newQueue[targetIndex]
      newQueue[targetIndex] = temp
      return newQueue
    })
  }

  const playFromQueue = (queueItem: QueueItem) => {
    if (currentTrack) {
      setQueue(prev => [{
        ...currentTrack,
        queueId: `queue-${Date.now()}`,
        addedAt: new Date().toISOString(),
        addedBy: "You"
      }, ...prev.filter(item => item.queueId !== queueItem.queueId)])
    } else {
      setQueue(prev => prev.filter(item => item.queueId !== queueItem.queueId))
    }
    setCurrentTrack(queueItem)
    setCurrentTime(0)
    setIsPlaying(true)
  }

  const clearQueue = () => {
    setQueue([])
    toast.info("Queue cleared")
  }

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomcode)
    setCopied(true)
    toast.success("Room code copied!")
    setTimeout(() => setCopied(false), 2000)
  }

  const generateQRCode = async () => {
    try {
      const roomUrl = `${window.location.origin}/dashboard/join/${roomcode}`
      const encodedUrl = encodeURIComponent(roomUrl)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodedUrl}`
      setQrCode(qrUrl)
      setShowQRModal(true)
    } catch (err) {
      console.error("Failed to generate QR code:", err)
      toast.error("Failed to generate QR code")
    }
  }

  const downloadQRCode = () => {
    if (!qrCode) return
    const link = document.createElement('a')
    link.href = qrCode
    link.download = `room-${roomcode}-qr.png`
    link.click()
  }


  const handleLeaveRoom = () => {
    toast.info("Left the room")
    router.push("/dashboard")
  }

  // Get current user ID (simplified - in production decode JWT or get from API)
  useEffect(() => {
    // Note: In production, you should decode the JWT token or get current user ID from API
    // For demo purposes, we'll fetch user info from dashboard endpoint
    const fetchCurrentUser = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) return

        const res = await fetch(`${apiUrl}/auth/dashboard`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include"
        })

        if (res.ok) {
          const data = await res.json()
          // The dashboard endpoint might return userId - adjust based on actual response
          if (data.userId) {
            setCurrentUserId(data.userId)
          }
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err)
        // Fallback: use first participant's userId if available
        if (roomData?.participants?.[0]?.userId) {
          setCurrentUserId(roomData.participants[0].userId)
        }
      }
    }

    if (mounted && roomData) {
      void fetchCurrentUser()
    }
  }, [mounted, roomData, apiUrl])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white flex items-center justify-center">
        <p className="text-xl">Loading room...</p>
      </div>
    )
  }

  const progressPercentage = currentTrack ? (currentTime / currentTrack.duration) * 100 : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{roomData?.name}</h1>
            <p className="text-gray-400 flex items-center gap-2">
              <span>Room Code:</span>
              <span className="text-blue-400 font-mono text-lg">{roomcode}</span>
            </p>
          </div>
          <button
            onClick={handleLeaveRoom}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-600/50 rounded-lg transition-colors"
          >
            <LogOut size={18} />
            Leave Room
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Music Player */}
        <div className="lg:col-span-2 space-y-6">
          {/* Music Player */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Album Art */}
              <div className="flex-shrink-0">
                <div className="w-full md:w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl overflow-hidden border border-gray-700/50">
                  {currentTrack?.coverUrl ? (
                    <img
                      src={currentTrack.coverUrl}
                      alt={currentTrack.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music size={64} className="text-gray-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Track Info & Controls */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-1">
                    {currentTrack?.title || "No track playing"}
                  </h2>
                  <p className="text-gray-400 mb-2">
                    {currentTrack?.artist || "—"}
                  </p>
                  {currentTrack?.album && (
                    <p className="text-sm text-gray-500">{currentTrack.album}</p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mt-6">
                  <div
                    ref={progressRef}
                    className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative group"
                    onClick={handleSeek}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ left: `calc(${progressPercentage}% - 8px)` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{currentTrack ? formatTime(currentTrack.duration) : "0:00"}</span>
                  </div>
                </div>

                {/* Player Controls */}
                <div className="mt-6 flex flex-col items-center gap-4">
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setShuffleMode(!shuffleMode)}
                      className={`p-2 rounded-full transition-colors ${shuffleMode
                        ? "bg-blue-500/20 text-blue-400"
                        : "hover:bg-gray-700/50 text-gray-400"
                        }`}
                      title="Shuffle"
                    >
                      <Shuffle size={20} className={shuffleMode ? "opacity-100" : "opacity-70"} />
                    </button>
                    <button
                      onClick={handlePrevious}
                      className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                      disabled={queue.length === 0 && recentTracks.length === 0}
                    >
                      <SkipBack size={24} className={queue.length === 0 && recentTracks.length === 0 ? "text-gray-600" : ""} />
                    </button>
                    <button
                      onClick={startPlaySync}
                      className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 rounded-full transition-all shadow-lg shadow-blue-500/25"
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                    </button>
                    <button
                      onClick={handleNext}
                      className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                      disabled={queue.length === 0 && recentTracks.length === 0}
                    >
                      <SkipForward size={24} className={queue.length === 0 && recentTracks.length === 0 ? "text-gray-600" : ""} />
                    </button>
                    <button
                      onClick={() => {
                        const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one']
                        const currentIndex = modes.indexOf(repeatMode)
                        setRepeatMode(modes[(currentIndex + 1) % modes.length])
                      }}
                      className={`p-2 rounded-full transition-colors relative ${repeatMode !== 'off'
                        ? "bg-blue-500/20 text-blue-400"
                        : "hover:bg-gray-700/50 text-gray-400"
                        }`}
                      title={`Repeat: ${repeatMode === 'off' ? 'Off' : repeatMode === 'all' ? 'All' : 'One'}`}
                    >
                      <Repeat size={20} className={repeatMode !== 'off' ? "opacity-100" : "opacity-70"} />
                      {repeatMode === 'one' && (
                        <span className="absolute -top-1 -right-1 text-[10px] font-bold bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">1</span>
                      )}
                    </button>
                  </div>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/50 rounded-lg transition-colors text-sm"
                  >
                    <Plus size={16} />
                    Add to Queue
                  </button>
                </div>

                {/* Volume Control */}
                <div className="mt-6 flex items-center gap-3">
                  <button
                    onClick={toggleMute}
                    className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
                  >
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} />
                    ) : (
                      <Volume2 size={20} />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <span className="text-sm text-gray-400 w-12 text-right">
                    {isMuted ? 0 : volume}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Queue */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ListMusic size={20} className="text-blue-400" />
                <h3 className="text-xl font-bold">Queue</h3>
                <span className="text-sm text-gray-400">({queue.length})</span>
              </div>
              {queue.length > 0 && (
                <button
                  onClick={clearQueue}
                  className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Clear
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {queue.length > 0 ? (
                queue.map((item, index) => (
                  <div
                    key={item.queueId}
                    className="flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg overflow-hidden flex-shrink-0">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={18} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400 truncate">{item.artist}</p>
                      {item.addedBy && (
                        <p className="text-xs text-gray-500">Added by {item.addedBy}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => moveQueueItem(item.queueId, 'up')}
                        disabled={index === 0}
                        className="p-1 hover:bg-gray-600/50 rounded disabled:opacity-30"
                        title="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        onClick={() => moveQueueItem(item.queueId, 'down')}
                        disabled={index === queue.length - 1}
                        className="p-1 hover:bg-gray-600/50 rounded disabled:opacity-30"
                        title="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button
                        onClick={() => playFromQueue(item)}
                        className="p-1 hover:bg-gray-600/50 rounded"
                        title="Play now"
                      >
                        <Play size={14} />
                      </button>
                      <button
                        onClick={() => removeFromQueue(item.queueId)}
                        className="p-1 hover:bg-red-600/50 rounded text-red-400"
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-2">Queue is empty</p>
                  <button
                    onClick={() => setShowSearchModal(true)}
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1 mx-auto"
                  >
                    <Plus size={14} />
                    Add songs
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Recently Played */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Clock size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold">Recently Played</h3>
            </div>
            <div className="space-y-3">
              {recentTracks.length > 0 ? (
                recentTracks.map((track, index) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-4 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer group"
                    onClick={() => {
                      if (currentTrack) {
                        const newRecent = [...recentTracks]
                        newRecent.splice(index, 1)
                        newRecent.unshift(currentTrack)
                        setRecentTracks(newRecent)
                      }
                      setCurrentTrack(track)
                      setCurrentTime(0)
                      setIsPlaying(true)
                    }}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg overflow-hidden flex-shrink-0">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music size={20} className="text-gray-500" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.title}</p>
                      <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {formatTime(track.duration)}
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play size={18} className="text-gray-400" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-8">No recently played tracks</p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Participants */}
        <div className="space-y-6">
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold">Participants</h3>
              <span className="ml-auto text-sm text-gray-400">
                {roomData?.participants?.length || 0}
              </span>
            </div>
            <div className="space-y-3">
              {roomData?.participants?.map((participant) => (
                <div
                  key={participant.userId}
                  className="flex items-center gap-3 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                  <div className="relative">
                    <User size={40} className="text-gray-400" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate flex items-center gap-2">
                      {participant.user?.name || participant.userId}
                      {participant.userId === roomData.hostId && (
                        <Crown size={16} className="text-yellow-400 flex-shrink-0" />
                      )}
                    </p>
                    <p className="text-xs text-gray-400">
                      {participant.userId === roomData.hostId ? "Host" : "Member"}
                    </p>
                  </div>
                </div>
              )) || (
                  <p className="text-gray-500 text-center py-4">No participants</p>
                )}
            </div>
          </div>

          {/* Room Settings */}
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold">Room Settings</h3>
            </div>
            <div className="space-y-4">
              {/* Room Code */}
              <div className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Info size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-400">Room Code</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={copyRoomCode}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-600/50 hover:bg-gray-600 rounded transition-colors"
                    >
                      <Copy size={14} />
                      {copied ? "Copied!" : "Copy"}
                    </button>
                    <button
                      onClick={generateQRCode}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600/50 hover:bg-blue-600 rounded transition-colors"
                    >
                      📱 Show QR
                    </button>
                  </div>
                </div>
                <p className="text-xl font-mono font-bold text-blue-400">{roomcode}</p>
              </div>

              {/* Room Type */}
              <div className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Radio size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Room Type</span>
                </div>
                <p className="text-white font-medium capitalize">
                  {roomData?.type === 'single' ? 'Single User' : roomData?.type === 'multi' ? 'Multi User' : 'Standard'}
                </p>
              </div>

              {/* Room Visibility */}
              <div className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {roomData?.isPublic ? (
                      <Globe size={16} className="text-green-400" />
                    ) : (
                      <Lock size={16} className="text-gray-400" />
                    )}
                    <span className="text-sm text-gray-400">Visibility</span>
                  </div>
                  {isHost && (
                    <button
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => toast.info("Feature coming soon - Update room visibility")}
                    >
                      Change
                    </button>
                  )}
                </div>
                <p className="text-white font-medium">
                  {roomData?.isPublic ? 'Public Room' : 'Private Room'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {roomData?.isPublic
                    ? 'Anyone can join this room'
                    : 'Only users with the code can join'}
                </p>
              </div>

              {/* WiFi Network */}
              {roomData?.wifiSSID && (
                <div className="p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wifi size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-400">WiFi Network</span>
                  </div>
                  <p className="text-white font-medium">{roomData.wifiSSID}</p>
                </div>
              )}

              {/* Room Created */}
              {roomData?.createdAt && (
                <div className="p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm text-gray-400">Created</span>
                  </div>
                  <p className="text-white font-medium text-sm">
                    {new Date(roomData.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {/* Host Badge */}
              {isHost && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Crown size={16} className="text-yellow-400" />
                    <span className="text-sm text-yellow-400 font-medium">You are the host</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    You have full control over this room
                  </p>
                </div>
              )}

              {/* Playback Settings */}
              <div className="pt-2 border-t border-gray-700">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Playback</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Auto-play next</span>
                    <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5 transition-transform" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">Crossfade</span>
                    <div className="w-12 h-6 bg-gray-600 rounded-full relative cursor-pointer">
                      <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 right-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden audio element for future API integration */}
      <audio ref={audioRef} />

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Search & Add Songs</h2>
              <button
                onClick={() => {
                  setShowSearchModal(false)
                  setSearchQuery("")
                  setSearchResults([])
                }}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search for songs, artists, albums..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    handleSearch(e.target.value)
                  }}
                  className="w-full pl-10 pr-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  autoFocus
                />
              </div>

              {isSearching && (
                <div className="text-center py-8 text-gray-400">Searching...</div>
              )}

              {!isSearching && searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((track) => (
                    <div
                      key={track.id}
                      className="flex items-center gap-4 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg overflow-hidden flex-shrink-0">
                        {track.coverUrl ? (
                          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music size={20} className="text-gray-500" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{track.title}</p>
                        <p className="text-sm text-gray-400 truncate">{track.artist}</p>
                        {track.album && (
                          <p className="text-xs text-gray-500 truncate">{track.album}</p>
                        )}
                      </div>
                      <div className="text-sm text-gray-500 mr-2">
                        {formatTime(track.duration)}
                      </div>
                      <button
                        onClick={() => addToQueue(track)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm"
                      >
                        <Plus size={16} />
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchQuery && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No results found for &quot;{searchQuery}&quot;
                </div>
              )}

              {!isSearching && !searchQuery && (
                <div className="text-center py-8 text-gray-400">
                  Start typing to search for songs
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Room QR Code</h2>
              <button
                onClick={() => setShowQRModal(false)}
                className="p-2 hover:bg-gray-700/50 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-6">
              {/* QR Code Image */}
              <div className="bg-white p-4 rounded-xl">
                <img
                  src={qrCode}
                  alt="Room QR Code"
                  className="w-64 h-64"
                />
              </div>

              {/* Room Info */}
              <div className="w-full text-center">
                <p className="text-gray-400 text-sm mb-2">Room Code</p>
                <p className="text-2xl font-mono font-bold text-blue-400 mb-4">{roomcode}</p>
                <p className="text-gray-400 text-sm">Share this QR code or room code to invite others</p>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex gap-3">
                <button
                  onClick={downloadQRCode}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium"
                >
                  ⬇️ Download
                </button>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

