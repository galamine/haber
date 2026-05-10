export const USER_ROLES = ['super_admin', 'clinic_admin', 'therapist', 'staff'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const allRoles: Record<UserRole, string[]> = {
  super_admin: ['getUsers', 'manageUsers'],
  clinic_admin: ['getUsers', 'manageUsers'],
  therapist: ['getUsers'],
  staff: ['getUsers'],
};
