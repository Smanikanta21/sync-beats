"use client"
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, User, Mail, Shield, Bell, Moon, LogOut, Camera, ChevronRight, Laptop, Smartphone, Save, X, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { authFetch, clearAuthToken } from '@/lib/authFetch'
import { motion } from 'framer-motion';

import { useTheme } from '../context/ThemeContext';
import { Skeleton } from '@/components/ui/skeleton';

interface Device {
    id: string;
    name: string;
    status: string;
    updatedAt: string;
    isCurrent?: boolean;
}

interface UserProfile {
    name: string;
    username: string;
    email: string;
    devices: Device[];
}

export default function ProfilePage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [user, setUser] = useState<UserProfile | null>(null)
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: ''
    });
    const url = process.env.NEXT_PUBLIC_API_URL

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                username: user.username || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        try {
            const res = await authFetch(`${url}/auth/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                const data = await res.json();
                setUser({ ...user, ...data.user });
                setIsEditing(false);
                toast.success("Profile updated successfully");
            } else {
                toast.error("Failed to update profile");
            }
        } catch (error) {
            console.error('Update failed:', error);
            toast.error("Update failed");
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await authFetch(`${url}/auth/getprofiledata`, {
                    method: "GET"
                });

                if (res.ok) {
                    const data = await res.json();
                    // console.log(data.user.name);
                    setUser(data.user);
                } else {
                    router.push('/');
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load profile");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router, url]);

    const handleLogout = async () => {
        try {
            await authFetch(`${url}/auth/logout`, {
                method: 'POST'
            });
            clearAuthToken();
            router.push('/');
            toast.success("Logged out successfully");
        } catch (error) {
            console.error('Logout failed:', error);
            toast.error("Logout failed");
        }
    };

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    const handleRemoveDevice = async (deviceId: string) => {
        if (!user) return;

        try {
            const deviceToRemove = user.devices.find((d: Device) => d.id === deviceId);

            const res = await authFetch(`${url}/auth/device/${deviceId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                if (deviceToRemove?.isCurrent) {
                    await handleLogout();
                    return;
                }

                const updatedDevices = user.devices.filter((d: Device) => d.id !== deviceId);
                setUser({ ...user, devices: updatedDevices });
                toast.success("Device removed successfully");
            } else {
                toast.error("Failed to remove device");
            }
        } catch (error) {
            console.error('Remove device failed:', error);
            toast.error("Failed to remove device");
        }
    };

    return (
        <div className="min-h-screen w-full bg-[var(--sb-bg)] text-[var(--sb-text-main)] font-sans selection:bg-[var(--sb-primary)] selection:text-white overflow-x-hidden relative">
            {/* Background Ambience */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--sb-primary)] rounded-full blur-[120px] opacity-20 animate-pulse-glow pointer-events-none"></div>
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[var(--sb-secondary)] rounded-full blur-[120px] opacity-20 animate-pulse-glow pointer-events-none" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-8">
                {/* Header */}
                <motion.header
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between mb-8"
                >
                    <Link href="/dashboard" className="flex items-center gap-2 text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] transition-colors group">
                        <div className="p-2 rounded-full bg-[var(--sb-surface-1)] group-hover:bg-[var(--sb-surface-2)] transition-colors">
                            <ArrowLeft size={20} />
                        </div>
                        <span className="font-medium">Back to Dashboard</span>
                    </Link>
                    <h1 className="text-xl font-bold hidden md:block">My Profile</h1>
                    <div className="w-10"></div> {/* Spacer for balance */}
                </motion.header>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                >
                    {/* Profile Card */}
                    <motion.div variants={itemVariants} className="glass-card bg-[var(--sb-surface-1)] rounded-3xl p-8 border border-[var(--sb-border)] relative overflow-hidden">
                        {/* <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-[var(--sb-primary)]/20 to-[var(--sb-secondary)]/20"></div> */}
                        <div className="relative flex flex-col md:flex-row items-center gap-6 mt-12">
                            <div className="relative">
                                <div className="w-32 h-32 rounded-full bg-[var(--sb-surface-2)] border-4 border-[var(--sb-bg)] flex items-center justify-center text-[var(--sb-text-muted)] shadow-xl">
                                    <User size={64} />
                                </div>
                                <button className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--sb-primary)] text-white shadow-lg hover:scale-110 transition-transform">
                                    <Camera size={16} />
                                </button>
                            </div>
                            <div className="text-center md:text-left flex-1 w-full">
                                {loading ? (
                                    <div className="space-y-3 w-full">
                                        <Skeleton className="h-10 w-48 bg-[var(--sb-surface-2)]" />
                                        <Skeleton className="h-5 w-32 bg-[var(--sb-surface-2)]" />
                                        <div className="flex gap-2 mt-2">
                                            <Skeleton className="h-6 w-24 rounded-full bg-[var(--sb-surface-2)]" />
                                            <Skeleton className="h-6 w-24 rounded-full bg-[var(--sb-surface-2)]" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {isEditing ? (
                                            <div className="space-y-3 max-w-md">
                                                <input
                                                    type="text"
                                                    value={formData.name}
                                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                    className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl px-4 py-2 text-[var(--sb-text-main)] focus:border-[var(--sb-primary)] focus:outline-none"
                                                    placeholder="Full Name"
                                                />
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                    className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl px-4 py-2 text-[var(--sb-text-main)] focus:border-[var(--sb-primary)] focus:outline-none"
                                                    placeholder="Username"
                                                />
                                            </div>
                                        ) : (
                                            <>
                                                <h2 className="text-3xl font-bold mb-1">{user?.name}</h2>
                                                <p className="text-[var(--sb-text-muted)]">@{user?.username}</p>
                                            </>
                                        )}
                                    </div>
                                )}
                                {!isEditing && <p className="text-[var(--sb-text-muted)] mb-4 mt-2">Music Enthusiast • Free Plan</p>}

                                {!isEditing && (
                                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                                        <span className="px-3 py-1 rounded-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] text-xs font-medium text-[var(--sb-text-muted)]">
                                            Early Adopter
                                        </span>
                                        <span className="px-3 py-1 rounded-full bg-[var(--sb-success)]/10 border border-[var(--sb-success)]/30 text-xs font-medium text-[var(--sb-success)]">
                                            Active Now
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2">
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-4 py-2 rounded-xl bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] hover:text-[var(--sb-text-main)] font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <X size={18} /> Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="btn-primary px-6 py-2 rounded-xl font-medium flex items-center gap-2"
                                        >
                                            <Save size={18} /> Save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="btn-secondary px-6 py-2 rounded-xl font-medium"
                                    >
                                        Edit Profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </motion.div>

                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Account Settings */}
                        <motion.div variants={itemVariants} className="glass-card bg-[var(--sb-surface-1)] rounded-3xl p-6 border border-[var(--sb-border)]">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Shield size={20} className="text-[var(--sb-primary)]" /> Account
                            </h3>
                            <div className="space-y-1">
                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--sb-surface-2)] transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] group-hover:text-[var(--sb-text-main)] transition-colors">
                                            <Mail size={18} />
                                        </div>
                                        <div className="text-left w-full">
                                            <p className="font-medium">Email Address</p>
                                            {isEditing ? (
                                                <input
                                                    type="email"
                                                    value={formData.email}
                                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                    className="w-full mt-1 bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-lg px-3 py-1 text-sm text-[var(--sb-text-main)] focus:border-[var(--sb-primary)] focus:outline-none"
                                                />
                                            ) : (
                                                <p className="text-xs text-[var(--sb-text-muted)]">{user?.email}</p>
                                            )}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-[var(--sb-text-muted)]" />
                                </button>
                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--sb-surface-2)] transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] group-hover:text-[var(--sb-text-main)] transition-colors">
                                            <Shield size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">Password & Security</p>
                                            <p className="text-xs text-[var(--sb-text-muted)]">Last changed 30 days ago</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="text-[var(--sb-text-muted)]" />
                                </button>
                            </div>
                        </motion.div>

                        {/* Preferences */}
                        <motion.div variants={itemVariants} className="glass-card bg-[var(--sb-surface-1)] rounded-3xl p-6 border border-[var(--sb-border)]">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <Bell size={20} className="text-[var(--sb-secondary)]" /> Preferences
                            </h3>
                            <div className="space-y-1">
                                <button className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--sb-surface-2)] transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] group-hover:text-[var(--sb-text-main)] transition-colors">
                                            <Bell size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">Notifications</p>
                                            <p className="text-xs text-[var(--sb-text-muted)]">On</p>
                                        </div>
                                    </div>
                                    <div className="w-10 h-6 bg-[var(--sb-primary)] rounded-full relative">
                                        <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                </button>
                                <button
                                    onClick={toggleTheme}
                                    className="w-full flex items-center justify-between p-4 rounded-xl hover:bg-[var(--sb-surface-2)] transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-[var(--sb-surface-2)] text-[var(--sb-text-muted)] group-hover:text-[var(--sb-text-main)] transition-colors">
                                            <Moon size={18} />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-medium">Appearance</p>
                                            <p className="text-xs text-[var(--sb-text-muted)]">
                                                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-6 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-[var(--sb-surface-3)]' : 'bg-[var(--sb-primary)]'}`}>
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${theme === 'dark' ? 'left-1' : 'right-1'}`}></div>
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Devices Section */}
                    <motion.div variants={itemVariants} className="glass-card bg-[var(--sb-surface-1)] rounded-3xl p-6 border border-[var(--sb-border)]">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                            <Laptop size={20} className="text-[var(--sb-primary)]" /> Logged-in Devices
                        </h3>
                        <div className="space-y-3">
                            {loading ? (
                                <>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--sb-surface-2)] border border-[var(--sb-border)]">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="w-10 h-10 rounded-full bg-[var(--sb-surface-3)]" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32 bg-[var(--sb-surface-3)]" />
                                                <Skeleton className="h-3 w-24 bg-[var(--sb-surface-3)]" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--sb-surface-2)] border border-[var(--sb-border)]">
                                        <div className="flex items-center gap-4">
                                            <Skeleton className="w-10 h-10 rounded-full bg-[var(--sb-surface-3)]" />
                                            <div className="space-y-2">
                                                <Skeleton className="h-4 w-32 bg-[var(--sb-surface-3)]" />
                                                <Skeleton className="h-3 w-24 bg-[var(--sb-surface-3)]" />
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {user?.devices?.map((device: Device) => (
                                        <div key={device.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--sb-surface-2)] border border-[var(--sb-border)]">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-full ${device.status === 'online' ? 'bg-[var(--sb-success)]/10 text-[var(--sb-success)]' : 'bg-[var(--sb-text-muted)]/10 text-[var(--sb-text-muted)]'}`}>
                                                    {device.name.toLowerCase().includes('mobile') || device.name.toLowerCase().includes('phone') ?
                                                        <Smartphone size={20} /> : <Laptop size={20} />
                                                    }
                                                </div>
                                                <div>
                                                    <p className="font-medium text-[var(--sb-text-main)] flex items-center gap-2">
                                                        {device.name}
                                                        {device.isCurrent && (
                                                            <span className="px-2 py-0.5 rounded-full bg-[var(--sb-primary)]/10 border border-[var(--sb-primary)]/30 text-[10px] font-bold text-[var(--sb-primary)] uppercase tracking-wider">
                                                                This Device
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-[var(--sb-text-muted)]">
                                                        Last active: {new Date(device.updatedAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${device.status === 'online' ? 'bg-[var(--sb-success)] animate-pulse' : 'bg-[var(--sb-text-muted)]'}`}></span>
                                                    <span className="text-xs font-medium text-[var(--sb-text-muted)] capitalize">{device.status}</span>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveDevice(device.id)}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                                                    title="Remove Device"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {(!user?.devices || user.devices.length === 0) && (
                                        <p className="text-[var(--sb-text-muted)] text-center py-4">No devices found.</p>
                                    )}
                                </>
                            )}
                        </div>
                    </motion.div>

                    {/* Danger Zone */}
                    <motion.div variants={itemVariants} className="glass-card bg-[var(--sb-surface-1)] rounded-3xl p-6 border border-red-500/20">
                        <h3 className="text-lg font-bold mb-4 text-red-400">Danger Zone</h3>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-[var(--sb-text-main)]">Sign Out</p>
                                <p className="text-sm text-[var(--sb-text-muted)]">Securely log out of your account on this device</p>
                            </div>


                            <button
                                onClick={handleLogout}
                                className="px-6 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors font-medium flex items-center gap-2"
                            >
                                <LogOut size={18} /> Log Out
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}
