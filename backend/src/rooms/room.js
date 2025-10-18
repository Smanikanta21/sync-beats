const { PrismaClient } = require('@prisma/client');
const { join } = require('@prisma/client/runtime/library');
const prisma = new PrismaClient()
const qrcode = require('qrcode')

async function createRoom(req, res) {
    const user_id = req.user?.id
    const { name, type } = req.body;
    const frontend_url = process.env.FRONTEND_URL
    if (!user_id) return res.status(404).json({ message: "Unauthorized" });
    if (!name) return res.status(400).json({ message: "Room Name Can't be empty" })
    if (!type) return res.status(400).json("Room type not selected")

    try {
        const online_devices = await prisma.device.findMany({ where: { DeviceUserId: user_id, status: "online" } })

        if (type === 'single' && online_devices.length < 2) {
            res.status(400).json({ message: "Single User room needs atleast two online devices" })
        }
        console.log(type)
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

module.exports = { createRoom }