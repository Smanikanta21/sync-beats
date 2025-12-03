require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const passwordPlain = 'Password123!';
  const password = await bcrypt.hash(passwordPlain, 10);

  const users = Array.from({ length: 10 }).map((_, i) => ({
    name: `User ${i + 1}`,
    username: `user${i + 1}`,
    email: `user${i + 1}@example.com`,
    password,
    AccountType: 'local'
  }));

  await prisma.users.createMany({
    data: users,
    skipDuplicates: true
  });

  const created = await prisma.users.findMany({
    where: { email: { in: users.map(u => u.email) } },
    select: { id: true, name: true, email: true, username: true }
  });

  console.log(`Seeded users:`, created.map(u => `${u.name} <${u.email}>`).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
