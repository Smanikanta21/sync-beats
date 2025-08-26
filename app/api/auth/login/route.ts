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


    const token = await new SignJWT({ id: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));

    const response = NextResponse.json(
      { message: "Login successful", token, user: { id: user.id, email: user.email, username: user.username }},
      { status: 200 }
    );
    response.cookies.set("token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", maxAge: 60 * 60, path: "/" });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}