const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

const searchUsers = async (req, res) => {
    try {
        const { q, roomId } = req.query;
        const userId = req.user.id;

        if (!q || q.length < 2) {
            return res.status(200).json({ users: [] });
        }

        const searchTerm = q.toLowerCase();

        const whereClause = {
            OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } },
                { name: { contains: searchTerm, mode: 'insensitive' } }
            ],
            NOT: {
                id: userId
            }
        };

        if (roomId) {
            const roomParticipants = await prisma.roomUsers.findMany({
                where: { roomId },
                select: { userId: true }
            });
            const participantIds = roomParticipants.map(p => p.userId);
            whereClause.NOT = {
                OR: [
                    { id: userId },
                    { id: { in: participantIds } }
                ]
            };
        }

        const users = await prisma.users.findMany({
            where: whereClause,
            select: {
                id: true,
                name: true,
                username: true
            },
            take: 20,
            orderBy: [
                { username: 'asc' },
                { name: 'asc' }
            ]
        });

        res.status(200).json({ users });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};

module.exports = { searchUsers };
