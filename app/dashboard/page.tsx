"use client"
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Menu, UserCircle, LogOut, ArrowRight, Play, Radio, RefreshCw, Cast, PlusCircle, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import Link from 'next/link';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
}

interface Device {
  id: string;
  name: string;
  platform: string;
  status: string;
  lastSeen: string;
  capabilities: string[];
}

export default function DashBoard() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState<boolean>(false);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [refreshingSync, setRefreshingSync] = useState<boolean>(false);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setLoading(true);
    } catch (err) {
      toast.error("Logout unsuccessful");
      console.log(err);
    } finally {
      setLoading(false);
      toast.success('Logged out successfully!');
      router.push('/');
    }
  };

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch('/api/dashboard', { method: 'GET' });
        if (!res.ok) {
          const data = await res.json();
          setError(data.message || 'Unknown error');
          setLoading(false);
          return;
        }
        const data = await res.json();
        setUser(data.user);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
    fetchUser();
  }, []);

//   const fetchDevices = async () => {
//     setDevicesLoading(true);
//     setDevicesError(null);
//     try {
//       const res = await fetch('/api/devices');
//       if (!res.ok) {
//         const data = await res.json().catch(() => ({}));
//         throw new Error(data.message || 'Failed to fetch devices');
//       }
//       const data = await res.json();
//       setDevices(data.devices || []);
//     } catch (e) {
//       setDevicesError((e as Error).message);
//     } finally {
//       setDevicesLoading(false);
//     }
//   };

//   useEffect(() => {
//     // Fetch devices once user is loaded & authenticated
//     if (user) fetchDevices();
//   }, [user]);

//   const handleStartSession = () => {
//     // Placeholder: will create a sync session via future API
//     toast.info('Starting a new sync session (coming soon)');
//   };

//   const handleJoinSession = () => {
//     // Placeholder join (could open modal for invite code)
//     toast.info('Join session flow coming soon');
//   };

//   const handleResync = async () => {
//     setRefreshingSync(true);
//     try {
//       // In future: call /api/session/resync or similar
//       await new Promise(r => setTimeout(r, 800));
//       toast.success('Resync triggered');
//     } catch (e) {
//       toast.error('Failed to trigger resync');
//     } finally {
//       setRefreshingSync(false);
//     }
//   };

  if (loading) {
    return (
      <div className='h-screen w-full flex flex-col items-center justify-center gap-6'>
        <LoadingIndicator type="dot-circle" size="md" label="Loading user..." />
        <Skeleton className="w-56 h-10" />
      </div>
    );
  }

  if (error) {
    return (
      <div className='bg-black/80 flex flex-col justify-center items-center h-screen gap-4'>
        <p className='text-red-400 text-lg'>Error: {error}</p>
        <button className='px-4 py-2 bg-blue-600 rounded-lg text-white' onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
      {/* Header */}
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
          <LogOut className='text-red-600 md:hidden' size={20}/>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 py-10 md:py-14 max-w-7xl mx-auto flex flex-col gap-10">
        {/* Welcome / User Card */}
        <section className="w-full bg-gray-900/70 rounded-2xl shadow-xl p-6 md:p-8 border border-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold">Welcome back{user ? `, ${user.name || user.username}` : ''}!</h1>
            <p className="text-gray-300">Manage your synchronized playback sessions and devices below.</p>
            {user && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
                <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                  <span className="block text-gray-400">Name</span>
                  <span className="font-medium">{user.name || '—'}</span>
                </div>
                <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                  <span className="block text-gray-400">Username</span>
                  <span className="font-medium">{user.username}</span>
                </div>
                <div className="bg-gray-800/70 rounded-lg p-3 border border-gray-700">
                  <span className="block text-gray-400">Email</span>
                  <span className="font-medium break-all">{user.email}</span>
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 w-full md:w-auto">
            <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">
              <Play size={18} /> Start New Session
            </button>
            <button className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-semibold transition">
              <Users size={18} /> Join Session
            </button>
            <button disabled={refreshingSync} className="flex items-center justify-center gap-2 px-5 py-3 rounded-lg border border-gray-600 hover:border-blue-500 font-semibold transition disabled:opacity-50">
              <RefreshCw size={18} className={refreshingSync ? 'animate-spin' : ''} /> Resync
            </button>
          </div>
        </section>

        {/* Current Session Placeholder */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Radio className="text-green-400" size={22}/> Current Session</h2>
              <span className="text-xs text-gray-400">Prototype</span>
            </div>
            <div className="text-gray-400 text-sm">
              No active session. Start one to synchronize music across your devices.
            </div>
            <div className="mt-2 flex flex-wrap gap-3">
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm flex items-center gap-2"><Play size={16}/> Start</button>
              <button className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"><PlusCircle size={16}/> Join with Code</button>
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

          {/* Devices Section */}
          <div className="bg-gray-900/70 rounded-xl p-6 border border-gray-700 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold flex items-center gap-2"><Cast className="text-purple-400" size={22}/> Devices</h2>
              <button className="text-xs px-3 py-1 rounded-md bg-gray-800 hover:bg-gray-700">Refresh</button>
            </div>
            {devicesLoading && <div className="text-sm text-gray-400">Loading devices...</div>}
            {devicesError && <div className="text-sm text-red-400">{devicesError}</div>}
            {!devicesLoading && !devicesError && devices.length === 0 && (
              <div className="text-sm text-gray-400">No devices detected yet.</div>
            )}
            <ul className="flex flex-col gap-3 max-h-72 overflow-y-auto pr-1">
              {devices.map(d => (
                <li key={d.id} className="flex flex-col gap-1 bg-gray-800/60 p-3 rounded-lg border border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full ${d.status === 'online' ? 'bg-green-500' : d.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-500'}"></span>
                      {d.name}
                    </span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{d.platform}</span>
                  </div>
                  <div className="text-[11px] text-gray-500 flex justify-between">
                    <span>Last: {new Date(d.lastSeen).toLocaleTimeString()}</span>
                    <span>{d.capabilities.length} caps</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-gray-500 mt-1">Real devices will appear here when the realtime layer is implemented.</p>
          </div>
        </section>

        {/* Activity & Roadmap */}
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