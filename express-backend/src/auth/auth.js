require('dotenv').config();
const UAParser = require('ua-parser-js')
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT;
const TOKEN_EXPIRY = '7d';

function getDeviceName(name, userAgent) {
    const parser = new UAParser(userAgent)
    const device = parser.getDevice()
    const os = parser.getOS()

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

function generateToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY }
    );
}

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    // prefer explicit GOOGLE_REDIRECT_URL, otherwise build from BACKEND_URL or default to localhost
    callbackURL: process.env.GOOGLE_REDIRECT_URL || (process.env.BACKEND_URL ? `${process.env.BACKEND_URL.replace(/\/$/, '')}/auth/callback/google` : 'http://localhost:5001/auth/callback/google')
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
                        googleId: profile.id
                    }
                });
            } else if (!user.googleId) {
                await prisma.Users.update({
                    where: { id: user.id },
                    data: { googleId: profile.id }
                });
            }

            return done(null, user);
        } catch (err) {
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await prisma.Users.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

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
        if (!identifier) return res.status(400).json({ message: "Email or Username required" });
        if (!password) return res.status(400).json({ message: "Password required" });

        const user = await prisma.Users.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });
        if (!user) return res.status(400).json({ message: "User not found" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ message: "Invalid password" });

        const token = generateToken(user);
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

        res.cookie("token", token, { 
            httpOnly: true, 
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        // Return token in response for Bearer token fallback (dev support)
        res.json({ message: "Login success", deviceName, token });
    } catch (err) {
        console.error(err);
        next(err);
    }
}

async function logout(req, res, next) {
    try {
        res.clearCookie("token", { httpOnly: true, secure: false, sameSite: 'none' })
            .json({ message: "Logout success" });
    } catch (err) {
        next(err);
    }
}

async function googleAuthCallback(req, res) {
    try {
        const user = req.user;

        if (!user) {
            return res.status(401).json({ message: "Authentication failed" });
        }

        console.log("🔐 Google OAuth user:", user.email);

        const token = generateToken(user);
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

        res.cookie("token", token, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        console.log("Google auth successful - Redirecting to dashboard");
        // Pass token in query param for frontend to store in localStorage
        return res.redirect(`${process.env.FRONTEND_URL.replace(/\/$/, '')}/dashboard?auth=success&token=${encodeURIComponent(token)}`);

    } catch (err) {
        console.error("Google Auth Callback Error:", err);
        return res.redirect(`${process.env.FRONTEND_URL.replace(/\/$/, '')}/?error=google_auth_failed`);
    }
}

module.exports = { signup, login, logout, getDeviceName, googleAuthCallback };