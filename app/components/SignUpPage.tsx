"use client"
import { X, Eye, EyeClosed } from "lucide-react";
import React, { useState } from "react";
import { BorderBeam } from "@/components/magicui/border-beam";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AnimatedTooltip } from '@/components/ui/animated-tooltip'

type PropData = {
  showSignup?: boolean;
  setShowLogin: (show: boolean) => void;
  setShowSignup: (show: boolean) => void;
};

export default function SignupPage({ setShowSignup, setShowLogin }: PropData) {

  const GoogleSignin = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    const redirectUri =
      process.env.NODE_ENV === "production"
        ? "https://syncbeats.app/api/auth/callback/google"
        : "http://localhost:3000/api/auth/callback/google";

    const scope = encodeURIComponent("openid email profile");
    const responseType = "code";
    const accessType = "offline";

    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scope}&access_type=${accessType}`;
    window.location.href = googleAuthUrl;
  }

  const tooltipItems = [{
    id: 1, name: "Sign In With Spotify", designation: "Sign in with your Spotify account.",
    image: "/images/spotify.png"
  }, {
    id: 2, name: "Sign In With Apple Music", designation: "Sign in with your Apple Music account.",
    image: "/images/applemusic.svg"
  }, {
    id: 3, name: "Sign In with Google", designation: "Sign in with your Google account.",
    image: "/images/google.svg",
    onClick: GoogleSignin
  }]

  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState<string>("");

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", },
        body: JSON.stringify({ name, email, username, password })
      });
      const data = await res.json();
      console.log(data);

      if (res.ok) {
        localStorage.setItem("token:", data.token)
        console.log("Sign up successful:", data);
        setShowSignup(false);
        setShowLogin(true);
        toast.success("Sign up successful! Please log in.");
      } else {
        console.error("Sign up failed:", data);
        toast.error("Sign up failed: " + data.message);
      }
    } catch (error) {
      console.error("Error during sign up:", error);
      toast.error("An error occurred. Please try again.");
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
              <label className="block text-white mb-2" htmlFor="name">Name</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter Your Name" className="w-full p-2 bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>

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
            <div className="w-full flex flex-row items-center justify-center mt-6 gap-2">
              <AnimatedTooltip items={tooltipItems} />
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
