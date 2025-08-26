"use client"
export const dynamic = "force-dynamic";
import { useState, useEffect} from 'react'
import { useRouter } from 'next/navigation'
import { Music,Menu } from 'lucide-react'
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
export default function DashBoard(){
    const router = useRouter()
    const[sidebar,setSideBar] = useState<boolean>(false)
    const[loading,setLoading] = useState<boolean>(true)
    interface User {
        id: string;
        name: string;
        email: string;
    }
    const [user, setUser] = useState<User | null>(null);
    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' })
            toast.success('Logged out successfully!')
            router.push('/login')
        } catch (err) {
            toast.error("Loggout unsuccessfull")
            console.log(err)
        }
    }
    useEffect(()=>{
        async function fetchUser(){
            try{
                const res = await fetch('/api/dashboard', {method: 'GET'})
                if (res.status === 401){
                    router.push('/login')
                    return
                }
                const data = await res.json()
                setUser(data.user)
            }catch(err){
                console.log(err)
                router.push('/login')
            }finally{
                setLoading(false)
            }
        }
        fetchUser()
    },[router])
    if (loading) {
        return (
            <div className='bg-black/80'>Loading.....</div>
        )
    }
    return (
        <>
        <div className="h-screen">
            <div className="fixed inset-0">
                <div className="flex flex-row justify-between items-center bg-transparent backdrop-blur-3xl py-4 px-4">
                    <div className='fixed '><Menu className='cursor-pointer'/> {sidebar && <div>
                            
                        </div>}</div>
                    <div className='flex flex-row items-center justify-center pl-12 gap-1'>
                        <Music/>
                        <a className='text-xl font-extrabold' href="#">SyncBeats</a>
                    </div>
                    <div>
                        <button className='text-red hover:bg-red-700 hover:text-white rounded-xl cursor-pointer px-2 py-1' onClick={handleLogout}>Logout</button>
                    </div>
                </div>
                
            </div>
            <div className="flex w-full mt-18 ">
                <h1>Welcome Back!</h1>
            </div>
        </div>
        </>
    )
} 