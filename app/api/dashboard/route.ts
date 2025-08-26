import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { jwtVerify } from "jose";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  try {
    const token = req.headers.get("cookie")?.split("token=")[1]?.split(";")[0];
    if (!token) {
      return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
    }

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET)
    );

    const user = await prisma.user.findUnique({
      where: { id: payload.id as string },
        select: {
    id: true,
    username: true,
    email: true,
    name: true,
    sessions: {
      select: {
        id: true,
        device: true,
        ip: true,
        updatedAt: true,
        isOnline: true,
      },
    },
  },
    });

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const sessionsWithStatus = user.sessions.map((session) => ({
      ...session,
      status: session.isOnline === true ? "online" : "offline",
    }));

    return NextResponse.json({
      user: {
        ...user,
        sessions: sessionsWithStatus,
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Invalid token" }, { status: 403 });
  }
}