"use client";
import { X, Eye, EyeClosed } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation'
import Image from 'next/image';
import { toast } from 'react-toastify';

type PropData = {
    setShowLogin?: (show: boolean) => void;
    setShowSignup?: (show: boolean) => void;
};

export default function LoginPage({ setShowLogin, setShowSignup }: PropData) {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"
    const router = useRouter()
    const [showPassword, setShowPassword] = useState(false);
    const [identifier, setIdentifier] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [loading, setLoading] = useState<boolean>(false)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const user = params.get('user');
        
        if (token) {
            localStorage.setItem('token', token);
            toast.success(`Welcome ${user}!`);
            router.push('/dashboard');
            setShowLogin?.(false);
        }
    }, [router, setShowLogin]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setLoading(true)
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: "POST",
                headers: { "content-type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ identifier, password })
            })
            const data = await res.json()
            console.log(data)

            if (res.ok) {
                localStorage.setItem('token',data.token)
                toast.success("logged in Successfull")
                router.push('/dashboard')
            } else {
                toast.error(`logging in failed ${data.message}`)
            }
        } catch (err) {
            console.log(err)
            toast.error(`login failed because ${err}`)
        } finally {
            setLoading(false)
        }
    }

    const googleAuthFetcher = () => {
        window.location.href = `${API_BASE}/auth/auth/google`;
    };
    const renderLogin = (): void => {
        setShowLogin?.(false);
        setShowSignup?.(true);
    }
    return (
        <>
            <div className="fixed top-6 left-4 hover:cursor-pointer hover:scale-125 ease-in-out duration-150" onClick={() => setShowLogin && setShowLogin(false)}><X /></div>
            <div className="flex items-center justify-center h-screen bg-transparent">
                <div className="bg-black/60 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h1 className="text-2xl font-bold text-center text-white mb-6">Login</h1>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label className="block text-white mb-2" htmlFor="email">Username or Email</label>
                            <input type="text" id="email" placeholder="Enter Your Username or Email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required onChange={(e) => { setIdentifier(e.target.value) }} />
                        </div>
                        <div className="mb-6 relative">
                            <label className="block text-white mb-2" htmlFor="password">Password</label>
                            <input type={showPassword ? "text" : "password"} id="password" placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required onChange={(e) => { setPassword(e.target.value) }} />
                            <button type="button" className="absolute right-3 top-10 cursor-pointer hover:scale-115 ease-in-out duration-150" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye /> : <EyeClosed />}</button>
                            <p className="text-sm text-white/60 duration-150 hover:text-md hover:text-white ">Forgot Password</p>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200" onClick={handleLogin}>{loading ? "Logging in..." : "login"}</button>
                        <div className="mt-6 text-center text-white/60">
                            <div><p>---------- or continue with ----------</p></div>
                            <div className="w-full flex flex-row items-center justify-center mt-6 gap-2">
                                <div>
                                    <button type="button" className="border rounded-full p-2 hover:cursor-pointer hover:scale-110 transition-all ease-in-out duration-150" onClick={googleAuthFetcher}><Image src="/images/google.svg" alt="Google" width={32} height={32} /></button>
                                </div>

                            </div>
                            <p className="mt-2">{`Don't`} have an account? <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => { renderLogin() }}>Sign Up</span></p>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}
