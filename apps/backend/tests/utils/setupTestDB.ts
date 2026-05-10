import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const setupTestDB = () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.clinicGameToggle.deleteMany();
    await prisma.userDepartment.deleteMany();
    await prisma.sensoryRoom.deleteMany();
    await prisma.department.deleteMany();
    await prisma.game.deleteMany();
    await prisma.staffPermission.deleteMany();
    await prisma.otpRecord.deleteMany();
    await prisma.token.deleteMany();
    await prisma.user.deleteMany();
    await prisma.clinic.deleteMany();
    await prisma.subscriptionPlan.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
};

export { prisma, setupTestDB };
