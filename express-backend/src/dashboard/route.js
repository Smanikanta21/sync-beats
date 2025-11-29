const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function getDashboardData(req, res) {
  try {
    const user_id = req.user?.id;
    if (!user_id) {
      console.warn('getDashboardData: no user id on req');
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const user = await prisma.Users.findUnique({
      where: { id: user_id },
      select: { id: true, name: true, email: true }
    });

    if (!user) {
      console.warn('User not found in database:', user_id);
      return res.status(404).json({
        message: 'User not found. Please login again.',
        devices: []
      });
    }

    const devices = await prisma.device.findMany({
      where: { DeviceUserId: user_id },
      select: { id: true, name: true, status: true, ip: true, updatedAt: true }
    });

    console.log('fetched devices count:', devices.length, 'devices:', devices);
    return res.json({
      message: `Hello ${req.user.name}`,
      devices: devices || [],
      userId: user_id
    });
  } catch (err) {
    console.error('Dashboard Error:', err);
    return res.status(500).json({ message: "Failed to fetch devices", devices: [] });
  }
}

module.exports = { getDashboardData };

