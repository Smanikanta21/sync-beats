const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()
const qrcode = require('qrcode')

async function createRoom(req, res) {
    const user_id = req.user?.id
    const { name, type } = req.body;
    const frontend_url = process.env.FRONTEND_URL
    if (!user_id) return res.status(401).json({ message: "Unauthorized" });
    if (!name) return res.status(400).json({ message: "Room Name Can't be empty" })
    if (!type) return res.status(400).json("Room type not selected")

    try {
        const online_devices = await prisma.device.findMany({ where: { DeviceUserId: user_id, status: "online" } })

        if (type === 'single' && online_devices.length < 2) {
            res.status(400).json({ message: "Single User room needs atleast two online devices" })
        }

        const room = await prisma.room.create({
            data: {
                name,
                type,
                hostId: user_id,
                participants: { create: { userId: user_id } },
                devices: { create: online_devices.map(d => ({ deviceId: d.id })) }
            },
            include: { participants: true, devices: true }
        })
        console.log(room)
        const room_url = `${frontend_url}/join/${room.code}`
        const qr_url = await qrcode.toDataURL(room_url)
        return res.status(200).json({
            message: "Room Created successfully!",
            room,
            qrDataURL: qr_url
        });
    } catch (err) {
        console.log("CreateRoom:", err)
        return res.status(500).json({ message: "Failed to create room" })
    }
}

async function joinRoom(req, res) {
    const user_id = req.user?.id;
    const { code } = req.body;
    console.log(user_id)
    if (!code) return res.status(400).json({ message: "Enter Code" });
    if (!user_id) return res.status(401).json({ message: "Unauthorised" });

    try {
        const userExists = await prisma.Users.findUnique({ where: { id: user_id } });
        console.log(userExists)
        if (!userExists) return res.status(400).json({ message: "User not found in database" });

        const room = await prisma.room.findUnique({
            where: { code },
            include: { participants: true, devices: true }
        });

        if (!room) return res.status(404).json({ message: "Room Not Found" });

        const isParticipant = room.participants.some(p => p.userId === user_id);
        if (!isParticipant) {
            await prisma.roomUsers.create({
                data: {
                    roomId: room.id,
                    userId: user_id
                }
            });
        }

        const updatedRoom = await prisma.room.findUnique({
            where: { code },
            include: { participants: true, devices: true }
        });

        return res.status(200).json({ message: "Joined room successfully", room: updatedRoom });
    } catch (err) {
        console.log(`JoinRoom Err: ${err}`);
        return res.status(500).json({ message: "Failed to join room" });
    }
}

module.exports = { createRoom, joinRoom }