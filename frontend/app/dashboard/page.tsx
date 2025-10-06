"use client"
export const dynamic = "force-dynamic";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Menu, UserCircle, LogOut, ArrowRight, Play, Radio, RefreshCw, Cast, PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import { LoaderOneDemo } from "../components/Loader";


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
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
  const [loader, SetLoader] = useState<boolean>(false)

  const handleLogout = async () => {
    try {
      SetLoader(true)
      await fetch(`${url}/auth/logout`, { method: 'POST' });
    } catch (err) {
      alert("Logout unsuccessful");
      console.log(err);
    } finally {
      alert('Logged out successfully!');
      SetLoader(false)
      router.push('/');
    }
  };



  useEffect(() => {
    const dashboardInit = async () => {
      try {
        SetLoader(true)
        const token = localStorage.getItem("token");
        const res = await fetch(`${url}/auth/dashboard`, {
          method: "GET",
          credentials: "include",
          // only send Authorization if you actually use it
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        const raw = await res.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null } catch (e) { console.warn(e) }

        if (res.ok && data) {
          setName(data.message || "");
          setDevices(Array.isArray(data.devices) ? data.devices : []);
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
  }, []);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <LoaderOneDemo/>
      </div>)
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
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
          <LogOut className='text-red-600 md:hidden' size={20} />
        </div>
      </header>

      <main className="w-full px-4 py-10 md:py-14 max-w-7xl mx-auto flex flex-col gap-10">
        <section className="w-full bg-gray-900/70 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className='text-4xl font-bold'>{name}</h1>
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">
              <Play size={18} /> Start New Session
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold transition">
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
              <button className="text-xs px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700">Refresh</button>
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
            <p className="text-sm text-gray-400">Playback and sync events will appear here once implemented.</p>
            <ul className="text-xs list-disc list-inside text-gray-500 space-y-1">
              <li>Session start / end</li>
              <li>Track change</li>
              <li>Device join / leave</li>
              <li>Latency warnings</li>
            </ul>
          </div>
          <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <h2 className="text-xl font-semibold">Roadmap Preview</h2>
            <ul className="text-sm text-gray-300 space-y-2">
              <li><span className="text-blue-400">WebRTC</span> low-latency broadcast</li>
              <li><span className="text-blue-400">Adaptive latency</span> compensation engine</li>
              <li>Spotify / Apple Music integration</li>
              <li>Invite codes & collaborative sessions</li>
              <li>Waveform-based drift correction</li>
            </ul>
            <p className="text-[11px] text-gray-500">These items are conceptual placeholders for upcoming iterations.</p>
          </div>
        </section>
      </main>
    </div>
  );
}