import { faker } from '@faker-js/faker';
import type { Role } from '@prisma/client';

const userOne = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: faker.person.fullName(),
  email: 'userone@test.com',
  role: 'staff' as Role,
  tenantId: null as string | null,
};

const userTwo = {
  id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  name: faker.person.fullName(),
  email: 'usertwo@test.com',
  role: 'therapist' as Role,
  tenantId: null as string | null,
};

const admin = {
  id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  name: faker.person.fullName(),
  email: 'admin@test.com',
  role: 'super_admin' as Role,
  tenantId: null as string | null,
};

const insertUsers = async (
  users: Array<{ id: string; name: string; email: string; role: Role; tenantId: string | null }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  await prisma.user.deleteMany();
  for (const user of users) {
    await prisma.user.create({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      },
    });
  }
};

export { admin, insertUsers, userOne, userTwo };
