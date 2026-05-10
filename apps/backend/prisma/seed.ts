import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@haber.dev';

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { name: 'Admin', email, role: 'super_admin' },
  });

  console.log(`Seeded super_admin: ${user.email} (id: ${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
