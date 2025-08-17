export const runtime = "node";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";  
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();


    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) return new Response(JSON.stringify({ message: "User already exists" }), { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    const token = await new SignJWT({ id: user.id })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET!));

    return new Response(JSON.stringify({ message: "Signup successful", token, user }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: "Internal server error" }), { status: 500 });
  }
}