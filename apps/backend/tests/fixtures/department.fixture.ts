const departmentOne = {
  id: 'aa000001-0000-0000-0000-000000000001',
  tenantId: 'f3a4b5c6-d7e8-9012-cdef-123456789012', // clinicOne.id
  name: 'OT Wing',
  headUserId: null as string | null,
  description: 'Occupational Therapy department' as string | null,
};

const departmentTwo = {
  id: 'aa000002-0000-0000-0000-000000000002',
  tenantId: 'f3a4b5c6-d7e8-9012-cdef-123456789012', // clinicOne.id
  name: 'Speech Wing',
  headUserId: null as string | null,
  description: null as string | null,
};

const insertDepartments = async (
  departments: Array<{
    id: string;
    tenantId: string;
    name: string;
    headUserId: string | null;
    description: string | null;
  }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  for (const dept of departments) {
    await prisma.department.create({ data: dept });
  }
};

export { departmentOne, departmentTwo, insertDepartments };
