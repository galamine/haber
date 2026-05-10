import type { RoomStatus } from '@prisma/client';

const sensoryRoomOne = {
  id: 'bb000001-0000-0000-0000-000000000001',
  tenantId: 'f3a4b5c6-d7e8-9012-cdef-123456789012', // clinicOne.id
  name: 'Room A',
  code: 'RM-A',
  departmentId: null as string | null,
  equipmentList: ['Swing', 'Trampoline'] as unknown,
  status: 'active' as RoomStatus,
};

const sensoryRoomTwo = {
  id: 'bb000002-0000-0000-0000-000000000002',
  tenantId: 'f3a4b5c6-d7e8-9012-cdef-123456789012', // clinicOne.id
  name: 'Room B',
  code: 'RM-B',
  departmentId: null as string | null,
  equipmentList: [] as unknown,
  status: 'maintenance' as RoomStatus,
};

const insertSensoryRooms = async (
  rooms: Array<{
    id: string;
    tenantId: string;
    name: string;
    code: string;
    departmentId: string | null;
    equipmentList: unknown;
    status: RoomStatus;
  }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  for (const room of rooms) {
    await prisma.sensoryRoom.create({ data: room as Parameters<typeof prisma.sensoryRoom.create>[0]['data'] });
  }
};

export { insertSensoryRooms, sensoryRoomOne, sensoryRoomTwo };
