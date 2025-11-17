"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Menu, UserCircle, LogOut, ArrowRight, Play, Radio, RefreshCw, Cast, PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { CreateRoom, JoinRoom } from '../components/RoomModal'
import { toast } from 'react-toastify';
import { Skeleton } from "@/components/ui/skeleton"


export default function DashBoard() {
  const router = useRouter();
  type Device = {
    id: string;
    name: string;
    status: 'online' | 'offline';
    ip?: string;
    updatedAt?: string;
  };
  const [devices, setDevices] = useState<Device[]>([]);
  const [name, setName] = useState<string>('')
  const [createroomModal, setCrm] = useState<boolean>(false)
  const [joinroomModal, setJoinRm] = useState<boolean>(false)
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
  const [loader, SetLoader] = useState<boolean>(false)
  const [recentRooms, setRecentRooms] = useState<Array<{ code: string; name: string; joinedAt: string }>>([]);

  const HandleDeviceRefresher = async () => {
    try{
      SetLoader(true)
      const refreshedDevices = await fetch(`${url}/auth/dashboard/devices`, {
        method: "GET",
        credentials: "include",});
      const data = await refreshedDevices.json();
      if (refreshedDevices.ok && data.devices) {
        setDevices(Array.isArray(data.devices) ? data.devices : []);
      } else {
        toast.error("Failed to refresh devices");
      }
    }catch(err){
      console.error(err);
    } finally {
      SetLoader(false)
    }
  }


useEffect(() => {
  const dashboardInit = async () => {
    try {
      SetLoader(true)
      const token = localStorage.getItem("token");
      const res = await fetch(`${url}/auth/dashboard`, {
        method: "GET",
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (res.status === 401) {
        toast("Session expired. Please login again.");
        router.push('/');
        return;
      }
      console.log(`fetched data from ${url}`)
      const raw = await res.text();
      let data = null;
      try {
        data = raw ? JSON.parse(raw) : null
      } catch (e) {
        console.warn(e)
      }

      if (res.ok && data) {
        setName(data.message || "");
        setDevices(Array.isArray(data.devices) ? data.devices : []);
        try {
          const roomRes = await fetch(`${url}/api/recent-rooms`, {
            method: "GET",
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          });
          if (roomRes.ok) {
            const roomData = await roomRes.json();
            setRecentRooms(Array.isArray(roomData.rooms) ? roomData.rooms : []);
          }
        } catch (err) {
          console.warn("Failed to fetch recent rooms:", err);
        }

      } else {
        router.push('/')
      }
    } catch (err) {
      console.error(err);
    } finally {
      SetLoader(false)
    }
  };

  dashboardInit();
}, [router, url]);
const handleLogout = async () => {
  try {
    SetLoader(true)
    await fetch(`${url}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    });

    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('deviceName');
    toast.success('Logged out successfully!');
    router.push('/');
  } catch (err) {
    toast.error("Logout unsuccessful");
    console.log(err);
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('deviceName');
  } finally {
    SetLoader(false)
  }
};

const handleroomCreation = async () => {
  setCrm(!createroomModal)
}

useEffect(() => {
  if (createroomModal) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}, [createroomModal]);

useEffect(() => {
  if (joinroomModal) {
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
  } else {
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }
}, [joinroomModal]);


function formatLastSeen(dateString?: string) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (now.toDateString() === d.toDateString()) {
    return `Last online today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (yesterday.toDateString() === d.toDateString()) {
    return `Last online yesterday at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  if (diffDays < 7) {
    return `Last online ${diffDays} day${diffDays > 1 ? 's' : ''} ago at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) {
    return diffWeeks === 1 ? 'Last online last week' : `Last online ${diffWeeks} weeks ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths < 12) {
    return diffMonths === 1 ? 'Last online last month' : `Last online ${diffMonths} months ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  return diffYears <= 1 ? 'Last online last year' : `Last online ${diffYears} years ago`;
}
if (loader) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      <header className="flex flex-row justify-between items-center bg-black/60 backdrop-blur-md py-4 px-6 shadow-lg sticky top-0 z-10 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Menu className="md:hidden cursor-pointer" size={28} />
          <Music className="text-blue-400" size={28} />
          <span className="text-2xl font-extrabold tracking-tight ml-2">SyncBeats</span>
        </div>
        <div className="md:flex items-center hidden gap-4">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-24 rounded-lg" />
        </div>
      </header>

      <main className="w-full px-4 py-10 md:py-14 max-w-7xl mx-auto flex flex-col gap-10">
        {/* Hero Section Skeleton */}
        <section className="w-full bg-gray-900/70 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-10 w-48 rounded-lg" />
            <Skeleton className="h-4 w-32 rounded-lg" />
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <Skeleton className="h-12 w-full md:w-64 rounded-lg" />
            <Skeleton className="h-12 w-full md:w-64 rounded-lg" />
            <Skeleton className="h-12 w-full md:w-64 rounded-lg" />
          </div>
        </section>

        {/* Main Content Grid Skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
              <Skeleton className="h-20 w-full rounded-md" />
            </div>
          </div>

          <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <Skeleton className="h-8 w-32 rounded-lg" />
            <div className="space-y-3">
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </div>
        </section>

        {/* Bottom Grid Skeleton */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
              <Skeleton className="h-6 w-full rounded-lg" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

return (

  <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
    {createroomModal ? (<div className='fixed  inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm'>
      <div className={`rounded-2xl md:w-[50%] backdrop-blur-3xl h-auto w-[90%] md:h-[60%] md:bg-blue/5 bg-black/40  relative transition-all duration-150 overflow-y-auto ${createroomModal ? 'opacity-100' : "opacity-0"}`}>
        {/* <button onClick={() => setCrm(false)} className='absolute top-4 left-4 text-white hover:text-red-500 z-10'><X size={32} /></button> */}
        <CreateRoom onBack={() => setCrm(false)} />
      </div>
    </div>) : null}
    {joinroomModal ? (<div className='fixed inset-0 z-50 flex justify-center items-center bg-black/50 backdrop-blur-sm'>
      <div className={`rounded-2xl md:w-[50%] h-auto w-[90%] md:h-[60%] md:bg-blue/5 bg-black/40 backdrop-blur-3xl relative transition-all duration-150 overflow-y-auto ${joinroomModal ? 'opacity-100' : "opacity-0"}`}>
        {/* <button onClick={() => setJoinRm(false)} className='absolute top-4 left-4 text-white hover:text-red-500 z-10'><X size={32} /></button> */}
        <JoinRoom onBack={() => setJoinRm(false)} />
      </div>
    </div>) : null}
    <header className="flex flex-row justify-between items-center bg-black/60 backdrop-blur-md py-4 px-6 shadow-lg sticky top-0 z-10 border-b border-gray-800">
      <div className="flex items-center gap-2">
        <Menu className="md:hidden cursor-pointer" size={28} />
        <Music className="text-blue-400" size={28} />
        <span className="text-2xl font-extrabold tracking-tight ml-2">SyncBeats</span>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/profile" className="md:flex hidden items-center gap-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-blue-700 transition">
          <UserCircle className="mr-1" size={22} />
          <span>Profile</span>
          <ArrowRight size={16} />
        </Link>
        <button className="md:flex hidden items-center gap-1 px-4 py-2 rounded-lg border border-red-600 text-red-500 hover:bg-red-600 hover:text-white transition" onClick={handleLogout}>
          <LogOut className='' size={20} /> Logout
        </button>
        <LogOut className='text-red-600 md:hidden' size={20} onClick={handleLogout} />
      </div>
    </header>

    <main className="w-full px-4 py-10 md:py-14 max-w-7xl mx-auto flex flex-col gap-10">
      <section className="w-full bg-gray-900/70 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className='text-4xl font-bold'>{name}</h1>
        </div>
        <div className="flex flex-col gap-3 w-full md:w-auto">
          <button onClick={handleroomCreation} className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">
            <Play size={18} /> Start New Session
          </button>
          <button onClick={() => setJoinRm(!joinroomModal)} className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold transition">
            <Users size={18} /> Join Session
          </button>
          <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-600 hover:border-blue-500 font-semibold transition">
            <RefreshCw size={18} /> Resync
          </button>
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Radio className="text-green-400" size={22} /> Current Session</h2>
            <span className="text-xs text-gray-400">Prototype</span>
          </div>
          <div className="text-gray-400 text-sm">
            No active session. Start one to synchronize music across your devices.
          </div>
          <div className="mt-2 flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"><Play size={16} /> Start</button>
            <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"><PlusCircle size={16} /> Join with Code</button>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-gray-800/60 p-3 rounded-md border border-gray-700">
              <p className="text-gray-400">Latency (avg)</p>
              <p className="text-sm font-semibold mt-1">— ms</p>
            </div>
            <div className="bg-gray-800/60 p-3 rounded-md border border-gray-700">
              <p className="text-gray-400">Devices</p>
              <p className="text-sm font-semibold mt-1">{devices.length}</p>
            </div>
            <div className="bg-gray-800/60 p-3 rounded-md border border-gray-700">
              <p className="text-gray-400">Status</p>
              <p className="text-sm font-semibold mt-1">Idle</p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2"><Cast className="text-purple-400" size={22} /> Devices</h2>
            <button className="text-xs px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700" onClick={() => HandleDeviceRefresher()}>Refresh</button>
          </div>
          {devices.length === 0 ? (
            <p className="text-gray-400">No devices found.</p>
          ) : (
            <ul className="space-y-3">
              {devices.map(device => (
                <li key={device.id} className="bg-gray-800/60 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-semibold">{device.name}</div>
                    <div className="text-sm text-gray-400">{device.ip}</div>
                  </div>
                  <div className="mt-2 sm:mt-0 text-sm text-right">
                    <div className={device.status === 'online' ? 'text-green-400' : 'text-red-400'}>
                      {device.status}
                    </div>
                    <div className="text-gray-400">{device.updatedAt ? formatLastSeen(device.updatedAt) : '-'}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
          <h2 className="text-xl font-semibold">Recent Activity</h2>
          {recentRooms.length === 0 ? (
            <p className="text-sm text-gray-400">No recent rooms. Join or create a session to get started.</p>
          ) : (
            <ul className="space-y-3">
              {recentRooms.slice(0, 5).map((room) => (
                <li key={room.code} className="bg-gray-800/60 p-4 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-sm">{room.name}</p>
                    <p className="text-xs text-gray-400">{room.code}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatLastSeen(room.joinedAt)}</span>
                    <Link href={`/dashboard/room/${room.code}`} className="text-xs px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-700 transition">
                      Rejoin
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  </div>
);
}

