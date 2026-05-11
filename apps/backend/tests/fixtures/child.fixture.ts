import type { Sex } from '@haber/shared';

const childOne = {
  id: 'child-0001-uuid',
  tenantId: 'f3a4b5c6-d7e8-9012-cdef-123456789012',
  childCode: 'CHD-0001',
  fullName: 'Test Child One',
  dob: new Date('2018-06-15'),
  sex: 'male' as Sex,
  spokenLanguages: [],
  intakeComplete: false,
};

const childTwo = {
  id: 'child-0002-uuid',
  tenantId: 'a4b5c6d7-e8f9-0123-def0-234567890123',
  childCode: 'CHD-0001',
  fullName: 'Test Child Two',
  dob: new Date('2019-03-20'),
  sex: 'female' as Sex,
  spokenLanguages: [],
  intakeComplete: false,
};

const insertChildren = async (
  children: Array<{
    id: string;
    tenantId: string;
    childCode: string;
    fullName: string;
    dob: Date;
    sex: Sex;
    spokenLanguages: string[];
    intakeComplete: boolean;
  }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  for (const child of children) {
    await prisma.child.create({ data: child });
  }
};

export { childOne, childTwo, insertChildren };
