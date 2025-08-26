export const runtime = "nodejs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";  
import { SignJWT } from 'jose';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { name,email, username, password } = await req.json();


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