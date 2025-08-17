"use client";
import {X,Eye,EyeClosed } from "lucide-react";
import React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation"
type PropData = {
  setShowLogin?: (show: boolean) => void;
};

export default function LoginPage({ setShowLogin }: PropData) {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <>
            <div className="fixed top-6 left-4 hover:cursor-pointer hover:scale-120 ease-in-out duration-150" onClick={()=> setShowLogin && setShowLogin(false)}><X/></div>
            <div className="flex items-center justify-center h-screen bg-transparent">
                <div className="bg-white/20 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
                    <h1 className="text-2xl font-bold text-center text-white mb-6">Login</h1>
                    <form>
                        <div className="mb-4">
                            <label className="block text-white mb-2" htmlFor="email">Email</label>
                            <input type="email" id="email" placeholder="Enter Your Email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                        </div>
                        <div className="mb-6">
                            <label className="block text-white mb-2" htmlFor="password">Password</label>
                            <input type={showPassword? "text":"password"} id="password" placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative" required />
                            <button className="absolute right-12 top-55 bottom-50" onClick={()=>{setShowPassword(!showPassword)}}>{showPassword ? <Eye/> : <EyeClosed/>}</button>
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Login</button>
                    </form>
                </div>
            </div>
        </>
    );
}