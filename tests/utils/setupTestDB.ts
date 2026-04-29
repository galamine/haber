import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const setupTestDB = () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    await prisma.token.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
};

module.exports = { setupTestDB, prisma };
