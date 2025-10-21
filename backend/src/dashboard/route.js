const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getDashboardData(req, res) {
  try {
    console.log('getDashboardData hit; req.user =', req.user);
    const user_id = req.user?.id;
    if (!user_id) {
      console.warn('getDashboardData: no user id on req');
      return res.status(401).json({ message: 'Unauthorized', devices: [] });
    }
    const devices = await prisma.device.findMany({
      where: { DeviceUserId: user_id },
      select: { id: true, name: true, status: true, ip: true, updatedAt: true }
    });

    console.log('fetched devices count:', devices.length, 'devices:', devices);
    return res.json({ message: `Hello ${req.user.name}`, devices: devices || [] });
  } catch (err) {
    console.error('Dashboard Error:', err);
    return res.status(500).json({ message: "Failed to fetch devices", devices: [] });
  }
}

module.exports = { getDashboardData };

