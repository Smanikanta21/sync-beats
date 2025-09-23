"use client"
export const dynamic = "force-dynamic";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Music, Menu, UserCircle, LogOut, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LoadingIndicator } from '@/components/application/loading-indicator/loading-indicator';
import Link from 'next/link';
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export default function DashBoard(){
    const router = useRouter()
    const[sidebar,setSideBar] = useState<boolean>(false)
    const[loading,setLoading] = useState<boolean>(true)
    interface User {
        id: string;
        name: string;
        username: string;
        email: string;
    }
    const [user, setUser] = useState<User | null>(null);
    const [error, setError] = useState<string | null>(null);
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            setLoading(true)
        } catch (err) {
            toast.error("Loggout unsuccessfull")
            console.log(err)
        } finally {
            setLoading(false)
            toast.success('Logged out successfully!')
            router.push('/')
        }
    }

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

    if (loading) {
        return (
            <div className='h-screen w-full'>
                <LoadingIndicator type="dot-circle" size="md" label="Loading..." />;
                <Skeleton></Skeleton>
            </div>
        );
    }
    if (error) {
        return (
            <div className='bg-black/80 flex flex-col justify-center items-center h-screen'>
                <p className='text-red-400 text-lg mb-4'>Error: {error}</p>
                <button className='px-4 py-2 bg-blue-600 rounded-lg text-white' onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <Skeleton className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 text-white">
            {/* Header */}
            <header className="flex flex-row justify-between items-center bg-black/60 backdrop-blur-md py-4 px-6 shadow-lg sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Menu className="cursor-pointer" size={28} />
                    <Music className="text-blue-400" size={28} />
                    <span className="text-2xl font-extrabold tracking-tight ml-2">SyncBeats</span>
                </div>
                <div className="flex items-center gap-4">
                    <Link href="/profile" className="flex items-center gap-1 px-4 py-2 rounded-lg bg-gray-800 hover:bg-blue-700 transition">
                        <UserCircle className="mr-1" size={22} />
                        <span>Profile</span>
                        <ArrowRight size={16} />
                    </Link>
                    <button className="flex items-center gap-1 px-4 py-2 rounded-lg border border-red-600 text-red-500 hover:bg-red-600 hover:text-white transition" onClick={handleLogout}>
                        <LogOut size={20} /> Logout
                    </button>
                </div>
            </header>
            {/* Main Content */}
            <main className="flex flex-col items-center justify-center w-full px-4 py-16">
                <div className="w-full max-w-xl bg-gray-900/80 rounded-2xl shadow-xl p-8 flex flex-col items-center gap-6 border border-gray-700">
                    <div className="flex flex-col items-center gap-2">
                        <UserCircle size={64} className="text-blue-400 mb-2" />
                        <h1 className="text-3xl font-bold">Welcome Back{user ? `, ${user.name || user.username}` : ''}!</h1>
                        <p className="text-gray-300 text-lg">Your dashboard is ready.</p>
                    </div>
                    {user && (
                        <div className="w-full flex flex-col gap-2 mt-4 bg-gray-800/80 rounded-xl p-4 border border-gray-700">
                            <div className="flex flex-row justify-between items-center">
                                <span className="font-semibold text-gray-400">Name:</span>
                                <span>{user.name}</span>
                            </div>
                            <div className="flex flex-row justify-between items-center">
                                <span className="font-semibold text-gray-400">Username:</span>
                                <span>{user.username}</span>
                            </div>
                            <div className="flex flex-row justify-between items-center">
                                <span className="font-semibold text-gray-400">Email:</span>
                                <span>{user.email}</span>
                            </div>
                        </div>
                    )}
                    <div className="w-full flex flex-row justify-center gap-4 mt-6">
                        <Link href="/profile" className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">Go to Profile</Link>
                    </div>
                </div>
                {/* Placeholder for future dashboard widgets */}
                <div className="w-full max-w-4xl mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center">
                        <h2 className="text-xl font-bold mb-2">Your Stats</h2>
                        <p className="text-gray-400">Coming soon...</p>
                    </div>
                    <div className="bg-gray-900/80 rounded-xl p-6 border border-gray-700 shadow-lg flex flex-col items-center">
                        <h2 className="text-xl font-bold mb-2">Recent Activity</h2>
                        <p className="text-gray-400">Coming soon...</p>
                    </div>
                </div>
            </main>
        </Skeleton>
    )
}