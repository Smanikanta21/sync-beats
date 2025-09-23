import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    // Robust cookie parsing
    const rawCookie = req.headers.get("cookie") || "";
    const token = rawCookie.split(/; */).find(c => c.startsWith("token="))?.split("=")[1];
    if (!token) {
      return NextResponse.json({ message: "Not authenticated: missing token cookie" }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return NextResponse.json({ message: "Server misconfiguration: JWT_SECRET missing" }, { status: 500 });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );

    // Support both Google (sub) & local login (id) claim styles
    const userId = (payload.sub as string) || (payload.id as string);
    if (!userId) {
      return NextResponse.json({ message: "Invalid token: no subject or id claim" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user,
    });
  } catch (err) {
    console.error("Dashboard API error:", err);
    let message = "Invalid token";
    if (err instanceof Error) message = err.message + (err.stack ? "\n" + err.stack : "");
    else if (typeof err === "string") message = err;
    return NextResponse.json({ message }, { status: 403 });
  }
}