"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "react-toastify"

type RoomResponse = {
  name: string
  code: string
  hostId: string
  participants: Array<{
    userId: string
    user?: { name?: string }
  }>
}

export default function RoomPage() {
  const params = useParams()
  const router = useRouter()
  const roomcode = params.code as string

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [roomData, setRoomData] = useState<RoomResponse | null>(null)

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch room data from backend
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

  const handleLeaveRoom = () => {
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

        <div className="bg-gray-800/60 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold mb-4">👥 Participants</h3>
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
