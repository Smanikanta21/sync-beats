export const runtime = "nodejs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from 'jose';
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { identifier, password } = await req.json();

    const user = await prisma.user.findFirst({ where: { 
      OR:[
        {email:identifier},
        {username:identifier}
      ]
     } });
    if (!user) {
      return new Response(JSON.stringify({ message: "User does not exist" }), {
        status: 400,
      });
    }

    const validPw = await bcrypt.compare(password, user.password);
    if (!validPw) {
      return new Response(JSON.stringify({ message: "Invalid password" }), {
        status: 400,
      });
    }

    const device = req.headers.get("user-agent") ?? "unknown device";
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown IP";

    const session = await prisma.session.create({
      data:{
        userId: user.id,
        device,
        ip: ip
      },
    })


    const token = await new SignJWT({ id: user.id, sessionId: session.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
    };
    const response = NextResponse.json(
      { message: "Login successful", token, user: safeUser },
      { status: 200 }
    );
    response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60, path: "/" });
    response.cookies.set("sessionId", session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    return response;
    


  

  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}