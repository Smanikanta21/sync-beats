"use client"
import { X, Eye, EyeClosed } from "lucide-react";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { BorderBeam } from "@/components/magicui/border-beam";

type PropData = {
  showSignup?: boolean;
  setShowLogin: (show: boolean) => void;
  setShowSignup: (show: boolean) => void;
};


export default function SignupPage({ setShowSignup, setShowLogin }: PropData) {
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json",},
        body: JSON.stringify({ email, username, password })
      });
      const data = await res.json();
      console.log(data);

      if (res.ok) {
        localStorage.setItem("token:",data.token)
        console.log("Sign up successful:", data);
        setShowSignup(false);
        setShowLogin(true);
        alert("Sign up successful! Please log in.");
      } else {
        console.error("Sign up failed:", data);
        alert("Sign up failed: " + data.message);
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      alert("An error occurred. Please try again.");
    }
  };

  return (
    <>
      <div className="fixed top-6 left-4 cursor-pointer hover:scale-120 ease-in-out duration-150" onClick={() => setShowSignup(false)}><X /></div>
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="bg-black/60 backdrop-blur-lg p-8 rounded-lg w-full max-w-md  shadow-yellow-500 ">
          <BorderBeam
            size={150}
            borderWidth={4}
            duration={8}
            className="from-transparent via-yellow-500 to-transparent"
            transition={{
              type: "spring",
              stiffness: 10,
              damping: 10,
            }}
          />
          <h1 className="text-2xl font-bold text-center text-white mb-6">Sign Up</h1>
          <form onSubmit={handleSignUp}>
            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="email">Email</label>
              <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter Your Email" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="mb-4">
              <label className="block text-white mb-2" htmlFor="username">Username</label>
              <input type="text" id="username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter Your Username" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

            <div className="mb-6 relative">
              <label className="block text-white mb-2" htmlFor="password">Password</label>
              <input type={showPassword ? "text" : "password"} id="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter Your Password" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              <button type="button" className="absolute right-2 top-10 cursor-pointer hover:scale-115 ease-in-out duration-150" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <Eye /> : <EyeClosed />} </button>
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200" >Sign Up</button>
            <div className="w-full flex flex-col items-center justify-center mt-6 gap-1">
              <button className="flex justify-center gap-2 border px-18 rounded-xl items-center cursor-pointer font-bold py-2"><img src="/images/spotify.png" className="w-6 h-6" alt="" />Continue With Spotify</button>
              <button className="flex justify-center items-center gap-2 border px-14 rounded-xl cursor-pointer font-bold py-2"><img src="/images/applemusic.svg" className="w-6 h-6" alt="" />Continue With Apple Music</button>
            </div>
          </form>
          <div>
            <p className="mt-6 text-center text-white/60">
              Already have an account?
              <span className="text-blue-400 cursor-pointer hover:underline" onClick={() => { setShowSignup(false); setShowLogin(true); }}> Login</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
