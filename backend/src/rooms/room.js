const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createRoom(req, res) {
    const user_id = req.user?.id
    const { name, type } = req.body;

    if (!user_id) return res.status(404).json({ message: "Unauthorized" });
    if (!name) return res.status(400).json({ message: "Room Name Can't be empty" })
    if (!roomtype) return res.status(400).json("Room name not selected")

    try {
        const online_devices = await prisma.device.findMany({where: { userId: user_id, status: "online" }})

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
        return res.status(200).json({message:"Room Created successfully!"})
    }catch(err){
        console.log("CreateRoom:",err)
        return res.status(500).json({message:"Failed to create room"})
    }
}

module.exports = {createRoom}