require('dotenv').config();
const UAParser = require('ua-parser-js')
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const axios = require('axios');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

function getDeviceName(name, userAgent) {
    const parser = new UAParser(userAgent)
    const device = parser.getDevice()
    const os = parser.getOS()
    const browser = parser.getBrowser()

    let device_type = 'device';
    if (os.name === 'iOS') device_type = 'iPhone';
    else if (os.name === 'Android') device_type = 'Android Phone';
    else if (device.type === "mobile") device_type = device.model || "Mobile";
    else if (device.type === "tablet") device_type = device.model || "Tablet";
    else if (device.type === "console") device_type = device.model || "Console";
    else if (os.name === 'macOS') device_type = 'Mac';
    else if (os.name === 'Windows') device_type = 'Windows PC';
    else if (os.name === 'Linux') device_type = 'Linux PC';

    return `${name}'s ${device_type}`
}

function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name, type: 'access' },
        JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, type: 'refresh' },
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
}

async function saveRefreshToken(userId, refreshToken) {
    try {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        const result = await prisma.refreshToken.upsert({
            where: { userId },
            update: { token: hashedToken, expiresAt },
            create: { userId, token: hashedToken, expiresAt }
        });
        
        console.log("Refresh token saved for user:", userId);
        return result;
    } catch (err) {
        console.error("Error saving refresh token:", err.message);
        throw err;
    }
}

async function verifyRefreshToken(userId, refreshToken) {
    try {
        const stored = await prisma.refreshToken.findUnique({ where: { userId } });
        if (!stored || stored.expiresAt < new Date()) return null;
        
        const isValid = await bcrypt.compare(refreshToken, stored.token);
        return isValid ? jwt.verify(refreshToken, REFRESH_TOKEN_SECRET) : null;
    } catch (err) {
        return null;
    }
}

async function signup(req, res, next) {
    try {
        const { name, username, email, password } = req.body;
        if (!name) return res.status(400).json({ message: "Name required" });
        if (!username) return res.status(400).json({ message: "Username required" });
        if (!email) return res.status(400).json({ message: "Email required" });
        if (!password) return res.status(400).json({ message: "Password required" });

        const existing = await prisma.users.findUnique({ where: { email } });
        if (existing) return res.status(400).json({ message: "User already exists" });

        const hash = await bcrypt.hash(password, 10);
        const user = await prisma.users.create({
            data: { name, username, email, password: hash }
        });

        res.status(201).json({ message: "User created", id: user.id });
    } catch (err) {
        next(err);
    }
}

async function login(req, res, next) {

    try {
        const { identifier, password } = req.body;
        if (!identifier)
            return res.status(400).json({ message: "Email or Username required" });

        if (!password) {
            return res.status(400).json({ message: " password required" })
        }

        const user = await prisma.Users.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ message: "Invalid password" });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        await saveRefreshToken(user.id, refreshToken);

        const deviceName = getDeviceName(user.name, req.headers["user-agent"] || "Unknown Device");
        const existingDevice = await prisma.device.findFirst({
            where: { DeviceUserId: user.id, name: deviceName }
        });
        if (existingDevice) {
            await prisma.device.update({
                where: { id: existingDevice.id },
                data: {
                    status: "online",
                    ip: req.ip,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.device.create({
                data: {
                    DeviceUserId: user.id,
                    name: deviceName,
                    status: "online",
                    ip: req.ip
                }
            });
        }

        res
            .cookie("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 })
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })
            .json({ message: "Login success", accessToken, refreshToken, deviceName });
    } catch (err) {
        console.log(err)
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        const userId = req.user?.id;
        
        if (userId) {
            await prisma.refreshToken.delete({ 
                where: { userId } 
            }).catch(() => null);
        }
        
        res
            .clearCookie("accessToken", { httpOnly: true, secure: true, sameSite: 'strict' })
            .clearCookie("refreshToken", { httpOnly: true, secure: true, sameSite: 'strict' })
            .json({ message: "Logout success" });
    } catch (err) {
        next(err);
    }
}

async function refreshAccessToken(req, res, next) {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
        
        if (!refreshToken) {
            return res.status(401).json({ message: "Refresh token missing" });
        }

        const decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
        const isValid = await verifyRefreshToken(decoded.id, refreshToken);
        
        if (!isValid) {
            return res.status(401).json({ message: "Invalid or expired refresh token" });
        }

        const user = await prisma.users.findUnique({ where: { id: decoded.id } });
        if (!user) {
            return res.status(401).json({ message: "User not found" });
        }

        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        await saveRefreshToken(user.id, newRefreshToken);

        res
            .cookie("accessToken", newAccessToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 15 * 60 * 1000 })
            .cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000 })
            .json({ message: "Token refreshed", accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.status(401).json({ message: "Token refresh failed" });
    }
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URL,
    accessType: 'offline',
    prompt: 'consent'
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            const email = profile.emails[0].value;
            const name = profile.displayName;

            let user = await prisma.Users.findUnique({
                where: { email }
            });

            if (!user) {
                user = await prisma.Users.create({
                    data: {
                        name,
                        email,
                        username: email.split('@')[0] + Math.random().toString(36).substring(7),
                        password: '',
                        googleId: profile.id,
                        googleRefreshToken: refreshToken || null
                    }
                });
            } else {
                await prisma.Users.update({
                    where: { id: user.id },
                    data: {
                        googleId: profile.id,
                        googleRefreshToken: refreshToken || user.googleRefreshToken
                    }
                });
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.Users.findUnique({
            where: { id }
        });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});


async function googleAuthCallback(req, res) {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        console.log("🔐 Google OAuth user:", user.email);

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        
        console.log("📝 Generated tokens - Saving refresh token to DB...");
        await saveRefreshToken(user.id, refreshToken);

        const deviceName = getDeviceName(user.name, req.headers["user-agent"] || "Google OAuth Device");

        const existingDevice = await prisma.device.findFirst({
            where: { DeviceUserId: user.id, name: deviceName }
        });

        if (existingDevice) {
            await prisma.device.update({
                where: { id: existingDevice.id },
                data: {
                    status: "online",
                    ip: req.ip,
                    updatedAt: new Date()
                }
            });
        } else {
            await prisma.device.create({
                data: {
                    DeviceUserId: user.id,
                    name: deviceName,
                    status: "online",
                    ip: req.ip
                }
            });
        }

        res
            .cookie("accessToken", accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
                maxAge: 15 * 60 * 1000
            })
            .cookie("refreshToken", refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: process.env.NODE_ENV === "production" ? 'none' : 'lax',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

        console.log("✅ Google auth successful - Redirecting to dashboard");
        return res.redirect(`${process.env.FRONTEND_URL.replace(/\/$/, '')}/dashboard?auth=success`);

    } catch (err) {
        console.error("❌ Google Auth Callback Error:", err);
        return res.redirect(`${process.env.FRONTEND_URL.replace(/\/$/, '')}/?error=google_auth_failed`);
    }
}

module.exports = { signup, login, logout, refreshAccessToken, getDeviceName, googleAuthCallback };