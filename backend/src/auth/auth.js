require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT;

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

        if(!password){
            return res.status(400).json({ message: " password required" })
        }

        const user = await prisma.users.findFirst({
            where: {
                OR: [
                    { email: identifier },
                    { username: identifier }
                ]
            }
        });
        if (!user){
            console.log(user)
            return res.status(400).json({ message: "User not found" });
            }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ message: "Invalid password" });

        const token = jwt.sign(
            { id: user.id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res
            .cookie("token", token, { httpOnly: true })
            .json({ message: "Login success", token });
    } catch (err) {
        console.log(err)
        next(err);
    }
}

module.exports = { signup, login };