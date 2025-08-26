import { NextResponse } from "next/server";

export async function POST(){
    try{
        const response = NextResponse.json({message:'Logged out successfull'})
        response.cookies.set("token","",{
            httpOnly:true,
            secure : true,
            sameSite: "strict",
            path: "/",
            expires: new Date(0)
        })
        return response
    }catch(error){
        return NextResponse.json(
            {message:"Logout Failed"},
            {status:500}
        )
    }
}