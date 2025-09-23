export const runtime = "nodejs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";  
import { SignJWT } from 'jose';import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name,email, username, password } = await req.json();

    if (!email || !username || !password) {
      return new Response(JSON.stringify({ message: "Missing required fields" }), { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return new Response(JSON.stringify({ message: "User already exists" }), { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username,
        password: hashedPassword,
        profile_pic: `https://api.dicebear.com/7.x/initials/svg?seed=${username[0].toUpperCase()}`
      },
    });

    // Unified JWT claims: always include sub + id for backward compatibility
    const token = await new SignJWT({ sub: user.id, id: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

    const safeUser = { id: user.id, email: user.email, username: user.username, name: user.name };

    const res = NextResponse.json({ message: "Signup successful", token, user: safeUser }, { status: 201 });
    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60,
      path: '/',
    });
    return res;
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}