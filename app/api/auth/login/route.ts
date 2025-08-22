export const runtime = "nodejs";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SignJWT } from 'jose';

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
      

    return new Response(
      JSON.stringify({ message: "Login successful", token, user }),
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ message: "Internal server error" }),
      { status: 500 }
    );
  }
}