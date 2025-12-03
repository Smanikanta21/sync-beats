"use client";
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';

interface SignupPageProps {
    setShowLogin: (show: boolean) => void;
    setShowSignup: (show: boolean) => void;
}

export default function SignupPage({ setShowLogin, setShowSignup }: SignupPageProps) {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL;
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, username, email, password })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success("Account created successfully!");
                console.log(`[Signup] Development mode:`, data.message)
                setShowSignup(false);
                setShowLogin(true);
            } else {
                toast.error(data.message || "Signup failed");
            }
        } catch (error) {
            console.error("Signup error:", error);
            toast.error("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-8 rounded-2xl w-full border-[var(--sb-primary)]/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold mb-2 text-[var(--sb-text-main)]">Get Started</h2>
                <p className="text-[var(--sb-text-muted)]">Join the future of shared audio.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">


                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--sb-text-muted)]">Username</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sb-text-muted)]" size={20} />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--sb-text-main)] placeholder:text-[var(--sb-text-muted)]/50 focus:outline-none focus:border-[var(--sb-primary)] transition-colors"
                            placeholder="username"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--sb-text-muted)]">Full Name</label>
                    <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sb-text-muted)]" size={20} />
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--sb-text-main)] placeholder:text-[var(--sb-text-muted)]/50 focus:outline-none focus:border-[var(--sb-primary)] transition-colors"
                            placeholder="John Doe"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--sb-text-muted)]">Email</label>
                    <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sb-text-muted)]" size={20} />
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--sb-text-main)] placeholder:text-[var(--sb-text-muted)]/50 focus:outline-none focus:border-[var(--sb-primary)] transition-colors"
                            placeholder="you@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--sb-text-muted)]">Password</label>
                    <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--sb-text-muted)]" size={20} />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-[var(--sb-surface-2)] border border-[var(--sb-border)] rounded-xl py-3 pl-12 pr-4 text-[var(--sb-text-main)] placeholder:text-[var(--sb-text-muted)]/50 focus:outline-none focus:border-[var(--sb-primary)] transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            Create Account
                            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                </button>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[var(--sb-border)]"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[var(--sb-surface-1)] text-[var(--sb-text-muted)]">Or continue with</span>
                    </div>
                </div>

                <button
                    type="button"
                    className="w-full bg-white text-black border border-gray-300 hover:bg-gray-50 font-medium rounded-xl py-3 px-4 flex items-center justify-center gap-2 transition-colors"
                    onClick={() => {
                        window.location.href = `${API_BASE}/auth/google`;
                    }}
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Sign up with Google
                </button>
            </form>

            <div className="mt-6 text-center text-sm text-[var(--sb-text-muted)]">
                Already have an account?{' '}
                <button
                    onClick={() => {
                        setShowSignup(false);
                        setShowLogin(true);
                    }}
                    className="text-[var(--sb-primary)] hover:underline font-medium"
                >
                    Log in
                </button>
            </div>
        </div>
    );
}
