"use client"
import { QrCode } from "lucide-react"
export default function RoomModal() {
    return (
        <>
            <div className="flex flex-col items-center gap-3 w-full h-full">
                <div className="w-full justify-center items-center mt-4"><h1 className="text-center text-2xl font-bold">Create A Room</h1></div>
                <div className="flex flex-col md:flex-row justify-evenly items-center w-full h-full gap-4">
                    <div className=" flex flex-col items-center justify-center gap-4">
                        <input type="text" placeholder="Enter Room Name" className="border rounded-xl py-2 px-4" />
                        <select className="border px-3 py-2 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-blue-400" defaultValue="">
                            <option value="" disabled>Select Room Type</option>
                            <option value="public">Public</option>
                            <option value="private">Private</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-6 justify-center items-center h-full">
                        <div className="p-2 shadow-white/20 rounded-xl shadow-2xl">
                            <QrCode size={200} />
                        </div>
                        <div className=""><h1 className="font-bold">Scan For Joining the room</h1></div>
                        <h1 className="font-bold">OR</h1>
                        <div><h1 className="text-2xl font-bold">Join Using Room Code: { }</h1></div>
                    </div>
                </div>
                <div className="mb-8"><button className="px-5 py-3 cursor-pointer rounded-lg bg-blue-600 hover:bg-blue-700 font-semibold transition">Create a room</button></div>
            </div>
        </>
    )
}