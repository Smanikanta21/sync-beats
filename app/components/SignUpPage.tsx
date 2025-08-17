"use client"
import { X, Eye, EyeClosed } from "lucide-react";
import React, { useState } from "react";

type PropData = {
  showSignup?: boolean;
  setShowSignup?: (show: boolean) => void;
};

export default function SignupPage({ showSignup, setShowSignup }: PropData) {
    const [email, setEmail] = useState<string>("");
    const [username, setUsername] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [showPassword, setShowPassword] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
            });
            const data = await res.json();
            if (res.ok) {
                console.log('Sign up successful:', data);
                setShowSignup && setShowSignup(false);
                alert('Sign up successful! Please log in.');
            } else {
                console.error('Sign up failed:', data);
                alert('Sign up failed: ' + data.message);
            }
        } catch (error) {
            console.error('Error during sign up:', error);
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <>
        <div className="fixed top-6 left-4 cursor-pointer hover:scale-120 duration-150" onClick={() => setShowSignup && setShowSignup(false)}><X/></div>
        <div className="flex items-center justify-center h-screen bg-transparent">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-white mb-6">Sign Up</h1>
                <form onSubmit={handleSignUp}>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="email">Email</label>
                        <input type="email" id="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter Your Email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="username">Username</label>
                        <input type="text" id="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter Your Username" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    </div>
                    <div className="mb-6 relative">
                        <label className="block text-white mb-2" htmlFor="password">Password</label>
                        <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <Eye/> : <EyeClosed/>}
                        </button>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Sign Up</button>
                </form>
            </div>
        </div>
        </>
    );
}
