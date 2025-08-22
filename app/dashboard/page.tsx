"use client"
import { useState, useEffect} from 'react'
import { useRouter } from 'next/router'
import { Music } from 'lucide-react'
export default function DashBoard(){
    const router = useRouter()
    const[loading,setLoading] = useState(true)
    useEffect(()=>{
        const token = localStorage.getItem("token")

        if(!token){
            router.push('/login')
        }else{
            setLoading(false)
        }
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
                    <div className='flex flex-row items-center justify-center gap-1'>
                        <Music/>
                        <a className='text-xl font-bold' href="#">SyncBeats</a>
                    </div>
                    <div>
                        
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