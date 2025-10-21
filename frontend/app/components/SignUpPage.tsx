"use client"
import { X, Eye, EyeClosed } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';

type PropData = {
  showSignup?: boolean;
  setShowLogin: (show: boolean) => void;
  setShowSignup: (show: boolean) => void;
};

export default function SignupPage({ setShowSignup, setShowLogin }: PropData) {
  const router = useRouter();
  const [email, setEmail] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState<string>("");
  const [loading,setLoading ] = useState<boolean>(false)
  
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001"

  // Handle Google Auth Callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const user = params.get('user');
    
    if (token) {
      localStorage.setItem('token', token);
      toast.success(`Welcome ${user}!`);
      router.push('/dashboard');
      setShowSignup(false);
    }
  }, [router, setShowSignup]);

  const googleAuthFetcher = () => {
    window.location.href = `${API_BASE}/auth/auth/google`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try{
      setLoading(true)
      const res = await fetch(`${API_BASE}/auth/signup`,{
        method : "POST",
        headers : {"content-type":"application/json"},
        body : JSON.stringify({name,username,email,password})
      })
      const data = await res.json()
      console.log(data)

      if(res.ok){
        toast.success("Signup Successfull")
        setShowSignup(false)
        setShowLogin(true);
      }else{
        toast.error("signup Failed: " + JSON.stringify(data));
      }
    }catch(err){
      toast.error(`Error during Signup : ${err}`)
    }finally{
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed top-6 left-4 cursor-pointer hover:scale-120 ease-in-out duration-150" onClick={() => setShowSignup(false)}><X /></div>
      <div className="flex items-center justify-center h-screen bg-transparent">
        <div className="bg-black/60 backdrop-blur-lg p-8 rounded-lg w-full max-w-md  shadow-yellow-500 ">
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
            <button onClick={handleSignUp} type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-200" >{loading ? "Signing Up..." : "Sign Up"}</button>
            <div className="mt-6 text-center text-white/60">
              <div><p>---------- or continue with ----------</p></div>
              <div className="w-full flex flex-row items-center justify-center mt-6 gap-2">
                <button 
                  type="button"
                  className="border rounded-full p-2 hover:cursor-pointer hover:scale-110 transition-all ease-in-out duration-150" 
                  onClick={googleAuthFetcher}
                >
                  <Image src="/images/google.svg" alt="Google" width={32} height={32} />
                </button>
              </div>
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
