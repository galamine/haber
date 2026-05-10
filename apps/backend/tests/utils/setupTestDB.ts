import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const setupTestDB = () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.otpRecord.deleteMany();
    await prisma.token.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
};

export { prisma, setupTestDB };
