import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";


const prisma = new PrismaClient()

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL;
const JWT_SECRET = process.env.JWT_SECRET;

async function getTokens(code: string) {
  const params = new URLSearchParams();
  params.append("code", code);
  params.append("client_id", GOOGLE_CLIENT_ID!);
  params.append("client_secret", GOOGLE_CLIENT_SECRET!);
  params.append("redirect_uri", GOOGLE_REDIRECT_URL!);
  params.append("grant_type", "authorization_code");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) throw new Error("Failed to fetch Google tokens");
  return res.json();
}

async function getGoogleProfile(access_token: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch Google profile");
  return res.json();
}

function getIp(req: Request) {
  // Try to get IP from headers, fallback to connection
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  // Node.js req.socket.remoteAddress unavailable in Next.js API Route, so fallback
  return "unknown";
}

// function getDevice(req: Request) {
//   // Use User-Agent as device fingerprint (not perfect)
//   return req.headers.get("user-agent") || "unknown";
// }

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "Missing code" }, { status: 400 });
    }

    // 1. Exchange code for tokens
    const tokenData = await getTokens(code);
    const { access_token, id_token } = tokenData;
    if (!access_token || !id_token) {
      return NextResponse.json({ error: "Failed to fetch Google tokens" }, { status: 400 });
    }

    // 2. Fetch profile
    const profile = await getGoogleProfile(access_token);
    const { email, name, picture, id: googleId } = profile;
    if (!email) {
      return NextResponse.json({ error: "Google profile missing email" }, { status: 400 });
    }

    // 3. Find or create User
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          name,
          profile_pic: picture,
          emailVerified: new Date(),
          username: email.split('@')[0], // set username as prefix of email for Google users
          password: "", // or set a random string, since Google users may not have a password
        },
      });
    } else {
      if (user.name !== name || user.profile_pic !== picture) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name, profile_pic: picture },
        });
      }
    }

    await prisma.account.upsert({
      where: {
        provider_provider_AccountId: {
          provider: "google",
          provider_AccountId: googleId,
        },
      },
      update: {
        accessToken: access_token,
        refreshtoken: id_token,
      },
      create: {
        userId: user.id,
        provider: "google",
        provider_AccountId: googleId,
        accessToken: access_token,
        refreshtoken: id_token,
      },
    });
    const device = "unknown";
    const ip = getIp(req);
    let session = await prisma.session.findFirst({
      where: {
        userId: user.id,
        device,
        ip,
      },
    });
    if (!session) {
      session = await prisma.session.create({
        data: {
          userId: user.id,
          device,
          ip,
          isOnline: true,
        },
      });
    } else {
      session = await prisma.session.update({
        where: { id: session.id },
        data: {
          isOnline: true,
        },
      });
    }

    // 6. Create JWT
    const jwt = await new SignJWT({sub: user.id,email: user.email,name: user.name,sessionId: session.id,
    }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(new TextEncoder().encode(JWT_SECRET));

    // 7. Set cookies and return JWT

    // const res = NextResponse.json(
    //   { token: jwt, sessionId: session.id, user: { id: user.id, email: user.email, name: user.name, profile_pic: user.profile_pic } },
    //   { status: 200 }
    // );
    const res = NextResponse.redirect(new URL("/dashboard", req.url));
    res.cookies.set("token", jwt, { httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 7, path: "/", secure: process.env.NODE_ENV === "production",
    });
    res.cookies.set("sessionId", session.id, {httpOnly: true,sameSite: "lax",maxAge: 60 * 60 * 24 * 7,path: "/",secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (err: unknown) {
    console.error("Google OAuth callback error:", err);
    let message = "OAuth callback failed";
    if (err instanceof Error) message = err.message + (err.stack ? "\n" + err.stack : "");
    else if (typeof err === "string") message = err;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}