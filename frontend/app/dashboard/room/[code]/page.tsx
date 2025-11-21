"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { toast } from "react-toastify"
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Users, LogOut, Music, Clock, Crown, User, Plus, Trash2, ArrowUp, ArrowDown, Shuffle, Repeat, X, ListMusic, Settings, Copy, Globe, Lock, Info, Radio, Cast } from "lucide-react"
import { useSyncPlayback, type PlaySyncMessage, type PlayMessage, type TrackChangeMessage, type SyncMessage } from "@/hooks/useSyncPlayback"
import { authFetch } from "@/lib/authFetch"

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
  connectedDevices?: Array<{
    deviceId: string
    joinedAt: string
    devices: {
      id: string
      name: string
      status: string
      DeviceUserId: string
      user: {
        id: string
        name: string
      }
    }
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

const isMobileDevice = (): boolean => {
  if (typeof window === 'undefined') return false
  const userAgent = navigator.userAgent.toLowerCase()
  return /iphone|ipad|ipod|android|mobile|tablet|blackberry|windows phone/.test(userAgent)
}

const isDevelopment = (): boolean => {
  if (typeof window === 'undefined') return false
  const isDev = process.env.NODE_ENV === 'development'
  const isLocalNetwork = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1' ||
                         window.location.hostname.startsWith('10.') ||
                         window.location.hostname.startsWith('192.168.')
  return isDev || isLocalNetwork
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomcode = params.code as string
  

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)

  const [localIsHost, setLocalIsHost] = useState(false)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [volume, setVolume] = useState(75)
  const [isMuted, setIsMuted] = useState(false)
  const [recentTracks, setRecentTracks] = useState<Track[]>([])
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [shuffleMode, setShuffleMode] = useState(false)
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off')

  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const [copied, setCopied] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCode, setQrCode] = useState<string | null>(null)

  const audioRef = useRef<HTMLAudioElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL

  const { playbackState, commands } = useSyncPlayback({
    roomCode: params.code as string,
    userId: currentUserId || "",
    hostId: roomData?.hostId || "",
    audioRef: audioRef as React.RefObject<HTMLAudioElement>,
    onSync: (msg: SyncMessage) => {
      if (msg.type === "PLAY" || msg.type === "PLAY_SYNC") {
        console.log("PLAY/PLAY_SYNC received:", msg)
        const audioUrl = (msg as PlayMessage | PlaySyncMessage).audioUrl
        const track = findTrackByAudioUrl(audioUrl)
        if (track) {
          setCurrentTrack(track)
          setCurrentTime(0)
          console.log("Matched track:", track.title)
        } else {
          console.warn("No matching track found for url:", audioUrl)
        }
      }
      if (msg.type === "TRACK_CHANGE" && (msg as TrackChangeMessage).trackData) {
        const tc = (msg as TrackChangeMessage).trackData
        const track = findTrackByAudioUrl(tc.audioUrl)
        if (track) {
          setCurrentTrack(track)
          setCurrentTime(0)
          console.log("TRACK_CHANGE matched track:", track.title)
        } else {
          console.warn("TRACK_CHANGE no local match for:", tc.audioUrl)
        }
      }
    },
    onError: (error: string) => toast.error(error)
  })

  useEffect(() => {
    setIsPlaying(playbackState.isPlaying)
  }, [playbackState.isPlaying])

  
  useEffect(() => {
    if (typeof window !== 'undefined' && isDevelopment()) {
      type DebugWindow = Record<string, () => Record<string, unknown>>;
      const debugWindow = window as unknown as DebugWindow;
      
      debugWindow.getRoomState = () => {
        const state = {
          currentTrack: currentTrack?.title,
          isPlaying,
          currentTime,
          volume,
          isMuted,
          queueLength: queue.length,
          recentTracksLength: recentTracks.length,
          shuffleMode,
          repeatMode,
          localIsHost,
          currentUserId,
          roomName: roomData?.name,
          roomCode: roomcode,
          playbackState,
          audioElement: {
            src: audioRef.current?.src,
            currentTime: audioRef.current?.currentTime,
            duration: audioRef.current?.duration,
            paused: audioRef.current?.paused,
            volume: audioRef.current?.volume,
            readyState: audioRef.current?.readyState,
            networkState: audioRef.current?.networkState
          },
          isMobileDevice,
          isDevelopmentMode: isDevelopment()
        }
        console.log("📱 Mobile Room State:", state)
        return state
      }
      
      debugWindow.logRoomStateHistory = () => {
        console.log("🎵 CURRENT ROOM STATE SNAPSHOT:")
        const state = debugWindow.getRoomState()
        console.log(JSON.stringify(state, null, 2))
        return state
      }
    }
  }, [currentTrack, isPlaying, currentTime, volume, isMuted, queue.length, recentTracks.length, shuffleMode, repeatMode, localIsHost, currentUserId, roomData, roomcode, playbackState])



useEffect(() => {
  if (!audioRef.current) return

  let lastLoggedSecond = -1

  const interval = setInterval(() => {
    const audio = audioRef.current
    if (audio) {
      setCurrentTime(audio.currentTime)
      if (!audio.paused && isPlaying) {
        const currentSecond = Math.floor(audio.currentTime)
        if (currentSecond !== lastLoggedSecond) {
          console.log(`⏱️ Playing: ${formatTime(audio.currentTime)} / ${formatTime(audio.duration || 0)} - ${currentTrack?.title}`)
          lastLoggedSecond = currentSecond
        }
      }
    }
  }, 20)

  return () => clearInterval(interval)
}, [isPlaying, currentTrack])


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
      audioUrl: "/audio/Sunflower.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3Esunflower%3C/text%3E%3C/svg%3E",
      playedAt: new Date(Date.now() - 600000).toISOString()
    },
    {
      id: "3",
      title: "Starboy",
      artist: "The Weeknd ft. Daft Punk",
      album: "Starboy",
      duration: 230,
      audioUrl: "/audio/Starboy.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EStarboy%3C/text%3E%3C/svg%3E",
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

  const mockSearchResults: Track[] = [
    {
      id: "5",
      title: "Blinding Lights",
      artist: "The Weeknd",
      album: "After Hours",
      duration: 200,
      audioUrl: "/audio/Blinding Lights.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EBlinding Lights%3C/text%3E%3C/svg%3E"
    },
    {
      id: "6",
      title: "Sunflower",
      artist: "Post Malone & Swae Lee",
      album: "",
      duration: 174,
      audioUrl: "/audio/Sunflower.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3ESunflower%3C/text%3E%3C/svg%3E"
    },
    {
      id: "7",
      title: "Starboy",
      artist: "The Weeknd ft. Daft Punk",
      album: "Starboy",
      duration: 230,
      audioUrl: "/audio/Starboy.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='20' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EStarboy%3C/text%3E%3C/svg%3E"
    },
    {
      id: "8",
      title: "Double Take",
      artist: "Dhruv",
      album: "Single",
      duration: 215,
      audioUrl: "/audio/Double Take.mp3",
      coverUrl: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Crect fill='%231a1a2e' width='300' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='%23888' text-anchor='middle' dominant-baseline='middle'%3EDouble Take%3C/text%3E%3C/svg%3E"
    }
  ]


  
  useEffect(() => {
    let userId: string | null = null;
    const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        userId =
          payload.id ||
          payload.userId ||
          (payload.user && payload.user.id) ||
          payload.sub || null;
        console.log("Decoded userId:", userId);
      } catch (err) {
        console.warn("JWT decode failed:", err);
        userId = null;
      }
    }
    if (userId) setCurrentUserId(userId);
  }, []);

  useEffect(() => {
    if (!mounted || !roomData || !currentUserId) return;

    setLocalIsHost(currentUserId === roomData.hostId);
    console.log("Host status:", currentUserId === roomData.hostId);
  }, [mounted, roomData, currentUserId]);

  const pausePlaySync = () => {
    console.log("pausePlaySync called")
    if (audioRef.current) {
      const pauseTime = audioRef.current.currentTime
      console.log(`⏸️ Pausing at: ${formatTime(pauseTime)}`)
      audioRef.current.pause()
    }
    setIsPlaying(false)
    commands.pause()
  }

  const resumePlaySync = () => {
    console.log("resumePlaySync called")
    if (audioRef.current) {
      const resumeTime = audioRef.current.currentTime
      console.log(`▶️ Resuming from: ${formatTime(resumeTime)}`)
      
      const playPromise = audioRef.current.play()
      if (playPromise) {
        playPromise
          .then(() => {
            console.log("✅ Resume successful")
            setIsPlaying(true)
            commands.resume()
          })
          .catch(err => {
            if (err.name !== 'NotAllowedError') {
              console.error("Resume error:", err)
              toast.error("Failed to resume: " + err.message)
            }
          })
      }
    } else {
      setIsPlaying(true)
      commands.resume()
    }
  }

  useEffect(() => {
    setMounted(true)
    if (mockTracks.length > 0) {
      setRecentTracks([mockTracks[0]])
      setCurrentTrack(mockTracks[0])
    }
  }, [])

  
  useEffect(() => {
    let cancelled = false
    const fetchRoom = async () => {
      if (!apiUrl || !roomcode) return
      try {
        
        const primaryUrl = `${apiUrl}/api/room/${roomcode}`
        const fallbackUrl = `${apiUrl}/auth/room/${roomcode}`
        let res = await authFetch(primaryUrl, { method: 'GET' })
        if (!res.ok) {
          console.warn('Primary room endpoint failed, trying fallback', { status: res.status })
          res = await authFetch(fallbackUrl, { method: 'GET' })
        }
        if (!cancelled) {
          if (res.ok) {
            const data = await res.json()
            setRoomData(data.room)
          } else {
            toast.error('Failed to load room')
          }
          setLoading(false)
        }
      } catch (e: unknown) {
        if (!cancelled) {
          console.warn('Room fetch error', e)
          toast.error('Room fetch failed')
          setLoading(false)
        }
      }
    }
    fetchRoom()
    return () => { cancelled = true }
  }, [apiUrl, roomcode])
  
  useEffect(() => {
    if (mockTracks.length && !currentTrack) {
      setCurrentTrack(mockTracks[0]);
    }
  }, [mockTracks, currentTrack]);
  const unlockAudioForMobile = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
      console.log('🔓 Audio unlocked for this user gesture');
      toast.info('Audio unlocked — you can now use play controls');
    }).catch((e: unknown) => {
      console.log('Audio unlock attempt failed:', e);
    });
  };

  const startPlaySync = () => {
    if (!currentTrack) return toast.error("Select a song first")

    if (isPlaying) { pausePlaySync(); return }
    if (audioRef.current && audioRef.current.src && audioRef.current.currentTime > 0) { resumePlaySync(); return }
    if (!audioRef.current) return

    const audio = audioRef.current
    audio.src = currentTrack.audioUrl || ""
    audio.currentTime = 0
    setCurrentTime(0)

    const tryPlay = () => {
      const rsNames = ['HAVE_NOTHING','HAVE_METADATA','HAVE_CURRENT_DATA','HAVE_FUTURE_DATA','HAVE_ENOUGH_DATA']
      console.log('Attempting play. readyState=', rsNames[audio.readyState])
      const playPromise = audio.play()
      if (playPromise) {
        playPromise.then(() => {
          console.log('✅ Local play succeeded; broadcasting PLAY command')
          setIsPlaying(true)
          commands.play(currentTrack.audioUrl || '', currentTrack.duration, 0)
        }).catch(err => {
          console.warn('Play attempt failed:', err)
          if (err.name === 'NotAllowedError') {
            toast.warn('Autoplay blocked. Tap once to unlock.')
            const oneShot = () => { unlockAudioForMobile(); audio.removeEventListener('click', oneShot); };
            audio.addEventListener('click', oneShot, { once: true })
          } else {
            toast.error('Failed to play: ' + err.message)
          }
        })
      }
    }

    audio.load()
    toast.info('⏳ Buffering audio...')

    const safetyTimeout = setTimeout(() => {
      if (audio.readyState >= 2) {
        tryPlay()
      } else {
        toast.error('Audio failed to become ready in time.')
      }
    }, 2500)

    const onCanPlayThrough = () => {
      clearTimeout(safetyTimeout)
      tryPlay()
      audio.removeEventListener('canplaythrough', onCanPlayThrough)
    }
    audio.addEventListener('canplaythrough', onCanPlayThrough, { once: true })
  }

  const findTrackByAudioUrl = (url: string): Track | null => {
    console.log('Finding track for URL:', url)
    const normalized = url?.trim()
    const all = [...mockTracks, ...mockSearchResults, ...queue]
    return all.find(t => (t.audioUrl || '').trim() === normalized) || null
  }




  useEffect(() => {
    if (typeof window !== 'undefined') {
      type DebugWindow = Record<string, (url?: string) => void>;
      const debugWindow = window as unknown as DebugWindow;
      
      debugWindow.debugAudio = () => {
        const audio = audioRef.current
        if (!audio) return console.error("No audio ref")
        
        console.log("=== AUDIO DEBUG INFO ===")
        console.log("Source:", audio.src)
        console.log("State:", {
          paused: audio.paused,
          ended: audio.ended,
          currentTime: audio.currentTime,
          duration: audio.duration,
          volume: audio.volume,
          muted: audio.muted
        })
        console.log("Readiness:", {
          readyState: audio.readyState + " (0=HAVE_NOTHING, 1=HAVE_METADATA, 2=HAVE_CURRENT_DATA, 3=HAVE_FUTURE_DATA, 4=HAVE_ENOUGH_DATA)",
          networkState: audio.networkState + " (0=NETWORK_EMPTY, 1=NETWORK_IDLE, 2=NETWORK_LOADING, 3=NETWORK_NO_SOURCE)"
        })
        console.log("Error:", audio.error?.message || "none")
        console.log("CanPlayType (audio/mpeg):", audio.canPlayType('audio/mpeg'))
      }

      debugWindow.playTest = (url = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3") => {
        const audio = audioRef.current
        if (!audio) return console.error("No audio ref")
        
        console.log("Testing playback with URL:", url)
        audio.src = url
        audio.currentTime = 0
        
        const playPromise = audio.play()
        if (playPromise) {
          playPromise
            .then(() => console.log("Play succeeded"))
            .catch(e => console.error("Play failed:", e.message))
        }
      }

      console.log("Debug utilities loaded. Try: window.debugAudio() or window.playTest()")
    }
  }, [])

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!currentTrack || !progressRef.current) {
      return
    }

    const rect = progressRef.current.getBoundingClientRect()
    let x: number
    
    
    if ('clientX' in e) {
      x = e.clientX - rect.left
    } else {
      x = e.touches[0].clientX - rect.left
    }
    
    const percentage = Math.max(0, Math.min(1, x / rect.width))
    const newTime = percentage * currentTrack.duration

    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
    
    commands.seek(newTime * 1000)
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
      const prevTrack = recentTracks[0]
      setCurrentTrack(prevTrack)
      setRecentTracks(newRecent)
      setCurrentTime(0)
      
      
      if (audioRef.current) {
        audioRef.current.src = prevTrack.audioUrl || ""
        audioRef.current.currentTime = 0
      }
      
      // Broadcast track change to other devices
      commands.trackChange({
        id: prevTrack.id,
        title: prevTrack.title,
        artist: prevTrack.artist,
        duration: prevTrack.duration,
        audioUrl: prevTrack.audioUrl || ""
      })
    }
  }

  const handleNext = () => {
    if (queue.length > 0) {
      const nextTrack = shuffleMode
        ? queue[Math.floor(Math.random() * queue.length)]
        : queue[0]

      if (currentTrack) {
        setRecentTracks(prev => [currentTrack, ...prev.slice(0, 9)])
      }

      setQueue(prev => prev.filter(t => t.queueId !== nextTrack.queueId))
      setCurrentTrack(nextTrack)
      setCurrentTime(0)
      
      // Update audio element immediately
      if (audioRef.current) {
        audioRef.current.src = nextTrack.audioUrl || ""
        audioRef.current.currentTime = 0
        // Continue playing if it was playing
        if (isPlaying) {
          const playPromise = audioRef.current.play()
          if (playPromise) {
            playPromise.catch(() => {})
          }
        }
      }
      
      if (repeatMode === 'one') {
        setIsPlaying(true)
      }
      // Broadcast track change to other devices
      commands.trackChange({
        id: nextTrack.id,
        title: nextTrack.title,
        artist: nextTrack.artist,
        duration: nextTrack.duration,
        audioUrl: nextTrack.audioUrl || ""
      })
    } else if (repeatMode === 'all' && recentTracks.length > 0) {
      const nextTrack = recentTracks[0]
      setRecentTracks(prev => [...prev.slice(1), currentTrack!])
      setCurrentTrack(nextTrack)
      setCurrentTime(0)
      
      // Update audio element immediately
      if (audioRef.current) {
        audioRef.current.src = nextTrack.audioUrl || ""
        audioRef.current.currentTime = 0
        const playPromise = audioRef.current.play()
        if (playPromise) {
          playPromise.catch(() => {})
        }
      }
      
      setIsPlaying(true)
      // Broadcast track change to other devices
      commands.trackChange({
        id: nextTrack.id,
        title: nextTrack.title,
        artist: nextTrack.artist,
        duration: nextTrack.duration,
        audioUrl: nextTrack.audioUrl || ""
      })
    } else if (recentTracks.length > 0) {
      const newRecent = [...recentTracks]
      if (currentTrack) {
        newRecent.unshift(currentTrack)
      }
      const prevTrack = newRecent.pop() || null
      setCurrentTrack(prevTrack)
      setRecentTracks(newRecent)
      setCurrentTime(0)
      
      // Update audio element immediately
      if (audioRef.current && prevTrack) {
        audioRef.current.src = prevTrack.audioUrl || ""
        audioRef.current.currentTime = 0
      }
      
      // Broadcast track change to other devices
      if (prevTrack) {
        commands.trackChange({
          id: prevTrack.id,
          title: prevTrack.title,
          artist: prevTrack.artist,
          duration: prevTrack.duration,
          audioUrl: prevTrack.audioUrl || ""
        })
      }
    }
  }

  useEffect(() => {
    if (currentTrack && currentTime >= currentTrack.duration && isPlaying) {
      if (repeatMode === 'one') {
        setCurrentTime(0)
      } else {
        handleNext()
      }
    }
  }, [currentTime, currentTrack, isPlaying, repeatMode])

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
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
      addedBy: "You"
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
    
    // Update audio element immediately
    if (audioRef.current) {
      audioRef.current.src = queueItem.audioUrl || ""
      audioRef.current.currentTime = 0
      const playPromise = audioRef.current.play()
      if (playPromise) {
        playPromise.catch(() => {})
      }
    }
    
    setIsPlaying(true)
    // Broadcast track change to other devices
    commands.trackChange({
      id: queueItem.id,
      title: queueItem.title,
      artist: queueItem.artist,
      duration: queueItem.duration,
      audioUrl: queueItem.audioUrl || ""
    })
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
    } catch {
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

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const res = await authFetch(`${apiUrl}/auth/dashboard`, {
          method: "GET"
        })

        if (res.ok) {
          const data = await res.json()
          if (data.userId) {
            setCurrentUserId(data.userId)
          }
        }
      } catch {
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
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex flex-col md:flex-row gap-6">
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

                <div className="mt-6">
                  <div
                    ref={progressRef}
                    className={`w-full h-2 rounded-full relative group ${
                      localIsHost 
                        ? "bg-gray-700 cursor-pointer hover:h-3" 
                        : "bg-gray-700 cursor-not-allowed"
                    } transition-all touch-none`}
                    onClick={handleSeek}
                    onTouchEnd={handleSeek}
                    title={localIsHost ? "Seek to position" : "Only host can seek"}
                  >
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${progressPercentage}%` }}
                    />
                    {localIsHost && (
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ left: `calc(${progressPercentage}% - 8px)` }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between text-xs text-gray-400 mt-2">
                    <span>{formatTime(currentTime)}</span>
                    <span>{audioRef.current?.duration && !isNaN(audioRef.current.duration) ? formatTime(audioRef.current.duration) : (currentTrack ? formatTime(currentTrack.duration) : "0:00")}</span>
                  </div>
                </div>

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
                      className={`p-4 rounded-full transition-all shadow-lg relative group ${
                        localIsHost
                          ? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 shadow-blue-500/25"
                          : "bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 cursor-not-allowed shadow-gray-600/25"
                      }`}
                      disabled={!localIsHost}
                      title={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
                      {!localIsHost && (
                        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-xs text-yellow-400 px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          Host only
                        </span>
                      )}
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
                      commands.trackChange({
                        id: track.id,
                        title: track.title,
                        artist: track.artist,
                        duration: track.duration,
                        audioUrl: track.audioUrl || ""
                      })
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

        <div className="space-y-6">
          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Users size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold">Connected Devices</h3>
              <span className="ml-auto text-sm text-gray-400">
                {roomData?.connectedDevices?.length || 0} device{roomData?.connectedDevices && roomData.connectedDevices.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {roomData?.connectedDevices && roomData.connectedDevices.length > 0 ? (
                (() => {
                  // Group devices by user
                  const devicesByUser = new Map<string, Array<{ id: string; name: string; status: string }>>()
                  const userInfo = new Map<string, { id: string; name: string }>();
                  
                  roomData.connectedDevices.forEach((roomDevice) => {
                    const device = roomDevice.devices
                    const userId = device.DeviceUserId
                    const userName = device.user.name
                    
                    if (!devicesByUser.has(userId)) {
                      devicesByUser.set(userId, [])
                    }
                    devicesByUser.get(userId)?.push({
                      id: device.id,
                      name: device.name,
                      status: device.status
                    })
                    userInfo.set(userId, { id: userId, name: userName })
                  })
                  
                  return Array.from(devicesByUser.entries()).map(([userId, devices]) => {
                    const user = userInfo.get(userId)
                    const isHost = userId === roomData.hostId
                    
                    return (
                      <div key={userId} className="p-4 bg-gray-700/30 rounded-lg">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="relative">
                            <User size={32} className="text-gray-400" />
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-gray-800 ${
                              devices.some(d => d.status === 'online') ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium flex items-center gap-2">
                              {user?.name || userId}
                              {isHost && (
                                <Crown size={16} className="text-yellow-400" />
                              )}
                            </p>
                            <p className="text-xs text-gray-400">
                              {devices.length} device{devices.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="ml-10 space-y-2">
                          {devices.map((device) => (
                            <div key={device.id} className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <Cast size={14} className="text-gray-500" />
                                <span className="text-gray-300">{device.name}</span>
                              </div>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                device.status === 'online' 
                                  ? 'bg-green-500/20 text-green-400'
                                  : 'bg-gray-600/20 text-gray-400'
                              }`}>
                                {device.status === 'online' ? '🟢 Online' : '🔴 Offline'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })
                })()
              ) : (
                <p className="text-gray-500 text-center py-4">No connected devices</p>
              )}
            </div>
          </div>

          <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
            <div className="flex items-center gap-2 mb-4">
              <Settings size={20} className="text-blue-400" />
              <h3 className="text-xl font-bold">Room Settings</h3>
            </div>
            <div className="space-y-4">
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

              <div className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><circle cx="12" cy="12" r="1"></circle><path d="M12 1v6"></path><path d="M4.22 4.22l4.24 4.24"></path><path d="M1 12h6"></path><path d="M4.22 19.78l4.24-4.24"></path><path d="M12 17v6"></path><path d="M19.78 19.78l-4.24-4.24"></path><path d="M23 12h-6"></path><path d="M19.78 4.22l-4.24 4.24"></path></svg>
                  <span className="text-sm text-gray-400">Network Stats</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">RTT (Round Trip)</span>
                    <span className="font-mono text-blue-400 font-semibold">{Math.round(playbackState.rttMs)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Latency (one-way)</span>
                    <span className="font-mono text-blue-400 font-semibold">{Math.round(playbackState.latencyMs)}ms</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-300">Time Offset</span>
                    <span className="font-mono text-blue-400 font-semibold">{Math.round(playbackState.serverOffsetMs)}ms</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <p className="text-xs text-gray-500">
                      {playbackState.rttMs < 100 ? "✅ Excellent connection" : playbackState.rttMs < 200 ? "🟢 Good connection" : "🟡 Moderate latency"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-gray-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Radio size={16} className="text-gray-400" />
                  <span className="text-sm text-gray-400">Room Type</span>
                </div>
                <p className="text-white font-medium capitalize">
                  {roomData?.type === 'single' ? 'Single User' : roomData?.type === 'multi' ? 'Multi User' : 'Standard'}
                </p>
              </div>

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
                  {localIsHost && (
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

              {roomData?.wifiSSID && (
                <div className="p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.94 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                    <span className="text-sm text-gray-400">WiFi Network</span>
                  </div>
                  <p className="text-white font-medium">{roomData.wifiSSID}</p>
                </div>
              )}

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


              {localIsHost && (
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
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.35-4.35"></path></svg>
                </div>
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
                    <div key={track.id} className="flex items-center gap-4 p-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-colors group">
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
                      <button onClick={() => addToQueue(track)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 text-sm"><Plus size={16} />
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

      {showQRModal && qrCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl border border-gray-700 p-8 max-w-sm w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Room QR Code</h2>
              <button onClick={() => setShowQRModal(false)} className="p-2 hover:bg-gray-700/50 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col items-center gap-6">
              <div className="bg-white p-4 rounded-xl">
                <img src={qrCode} alt="Room QR Code" className="w-64 h-64" />
              </div>

              <div className="w-full text-center">
                <p className="text-gray-400 text-sm mb-2">Room Code</p>
                <p className="text-2xl font-mono font-bold text-blue-400 mb-4">{roomcode}</p>
                <p className="text-gray-400 text-sm">Share this QR code or room code to invite others</p>
              </div>

              <div className="w-full flex gap-3">
                <button onClick={downloadQRCode} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-medium">⬇️ Download</button>
                <button onClick={() => setShowQRModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDevelopment() && (
        <div className="fixed bottom-24 left-4 right-4 bg-gray-900/95 border border-yellow-600 rounded-lg p-4 text-xs font-mono max-h-64 overflow-y-auto z-40">
          <div className="mb-2 font-bold text-yellow-400">🔧 DEV DEBUG - Room State</div>
          <div className="space-y-1 text-gray-300">
            <div className="text-blue-400 font-semibold mb-2">📊 Room Info</div>
            <div>Room: {roomData?.name || "Loading"}</div>
            <div>Code: {roomcode}</div>
            <div>Host: {localIsHost ? "✅ YES" : "❌ NO"}</div>
            <div>User ID: {currentUserId || "None"}</div>
            <div className="border-t border-gray-600 mt-2 pt-2 text-purple-400 font-semibold">🎵 Playback</div>
            <div>Track: {currentTrack?.title || "None"}</div>
            <div>Artist: {currentTrack?.artist || "—"}</div>
            <div>Playing: {isPlaying ? "▶️ YES" : "⏸️ NO"}</div>
            <div>Time: {formatTime(currentTime)} / {formatTime(audioRef.current?.duration || currentTrack?.duration || 0)}</div>
            <div className="border-t border-gray-600 mt-2 pt-2 text-green-400 font-semibold">🎧 Audio Element</div>
            <div>Src: {audioRef.current?.src ? audioRef.current.src.split('/').pop() : "empty"}</div>
            <div>Paused: {audioRef.current?.paused ? "🔴 YES" : "🟢 NO"}</div>
            <div>Ready: {audioRef.current?.readyState === 4 ? "✅ 4-ENOUGH_DATA" : audioRef.current?.readyState === 3 ? "🟡 3-FUTURE_DATA" : audioRef.current?.readyState === 2 ? "🟠 2-CURRENT_DATA" : audioRef.current?.readyState === 1 ? "🔴 1-METADATA" : "⚪ 0-NOTHING"}</div>
            <div>Network: {audioRef.current?.networkState === 0 ? "⚪ EMPTY" : audioRef.current?.networkState === 1 ? "🟢 IDLE" : audioRef.current?.networkState === 2 ? "🔵 LOADING" : "⚪ NO_SOURCE"}</div>
            <div>Playing: {audioRef.current && !audioRef.current.paused && (audioRef.current.readyState || 0) >= 2 ? "▶️ YES" : "⏸️ NO"}</div>
            <div>Volume: {Math.round((audioRef.current?.volume || 0) * 100)}% {isMuted ? "(Muted)" : ""}</div>
            <div>Duration: {audioRef.current?.duration ? formatTime(audioRef.current.duration) : "N/A"}</div>
            <div className="border-t border-gray-600 mt-2 pt-2 text-cyan-400 font-semibold">📋 Queue & Recent</div>
            <div>Queue: {queue.length} songs</div>
            <div>Recent: {recentTracks.length} songs</div>
            <div>Shuffle: {shuffleMode ? "🔀 ON" : "OFF"}</div>
            <div>Repeat: {repeatMode === 'off' ? "OFF" : repeatMode === 'all' ? "🔁 ALL" : "🔂 ONE"}</div>
            <div className="border-t border-gray-600 mt-2 pt-2 text-orange-400 font-semibold">🌐 Network</div>
            <div>RTT: {Math.round(playbackState.rttMs)}ms</div>
            <div>Latency: {Math.round(playbackState.latencyMs)}ms</div>
            <div>Offset: {Math.round(playbackState.serverOffsetMs)}ms</div>
            <div className="border-t border-gray-600 mt-2 pt-2">
              <button onClick={() => {
                const debugWindow = window as unknown as Record<string, () => void>;
                debugWindow.getRoomState?.()
                debugWindow.logRoomStateHistory?.()
              }} className="w-full bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-white">
                📸 Log Full State to Console
              </button>
            </div>
          </div>
        </div>
      )}

      <audio 
        ref={audioRef}
        crossOrigin="anonymous"
        preload="auto"
        playsInline
      />
    </div>
  )
}

