export const USER_ROLES = ['super_admin', 'clinic_admin', 'therapist', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const allRoles: Record<UserRole, string[]> = {
  super_admin: ['getUsers', 'manageUsers', 'manageClinics', 'manageSubscriptionPlans'],
  clinic_admin: [
    'getUsers',
    'manageUsers',
    'getClinic',
    'manageDepartments',
    'getDepartments',
    'manageRooms',
    'getRooms',
    'manageGameToggles',
    'getGameToggles',
  ],
  therapist: ['getUsers', 'getDepartments', 'getRooms'],
  staff: ['getUsers'],
};
