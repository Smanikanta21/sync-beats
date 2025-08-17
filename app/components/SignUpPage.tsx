"use client"
import { X,Eye,EyeClosed } from "lucide-react";
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
    return (
        <>
        <div className="fixed top-6 left-4 hover:cursor-pointer hover:scale-120 ease-in-out duration-150" onClick={() => setShowSignup && setShowSignup(false)}><X/></div>
        <div className="flex items-center justify-center h-screen bg-transparent">
            <div className="bg-white/10 backdrop-blur-lg p-8 rounded-lg shadow-lg w-full max-w-md">
                <h1 className="text-2xl font-bold text-center text-white mb-6">Sign Up</h1>
                <form>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="email">Email</label>
                        <input type="email" placeholder="Enter Your Email" id="email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required onChange={(e)=>{setEmail(e.target.value)}}/>
                    </div>
                    <div className="mb-4">
                        <label className="block text-white mb-2" htmlFor="username">Username</label>
                        <input type="text" id="username" placeholder="Enter Your Username" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required onChange={(e)=>{setUsername(e.target.value)}}/>
                    </div>
                    <div className="mb-6">
                        <label className="block text-white mb-2" htmlFor="password">Password</label>
                        <input type={showPassword?"text":"password"} id="password" placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 relative" required onChange={(e)=>{setPassword(e.target.value)}}/>
                        <button className="absolute right-12 top-77 bottom-50" onClick={(e)=>{setShowPassword(!showPassword)}}>{showPassword ? <Eye/> : <EyeClosed/>}</button>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200">Sign Up</button>
                </form>
            </div>
        </div> 
        </>
    );
}