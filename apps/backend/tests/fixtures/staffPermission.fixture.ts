const staffPermissionOne = {
  id: 'sp1b2c3d4-e5f6-7890-abcd-ef1234567890',
  userId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  permissions: ['student.intake', 'student.notes'] as string[],
};

const insertStaffPermissions = async (permissions: Array<{ id: string; userId: string; permissions: string[] }>) => {
  const { prisma } = await import('../utils/setupTestDB');
  await prisma.staffPermission.deleteMany();
  for (const perm of permissions) {
    await prisma.staffPermission.create({
      data: {
        id: perm.id,
        userId: perm.userId,
        permissions: perm.permissions,
      },
    });
  }
};

export { insertStaffPermissions, staffPermissionOne };
