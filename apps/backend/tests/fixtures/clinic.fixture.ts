import type { ClinicStatus, Prisma, SubscriptionTier } from '@prisma/client';

const subscriptionPlanOne = {
  id: 'd1e2f3a4-b5c6-7890-abcd-ef1234567890',
  name: 'Basic Plan',
  tier: 'basic' as SubscriptionTier,
  maxUsersByRole: { therapist: 5, staff: 5 } as Prisma.InputJsonValue,
  maxSensoryRooms: 2,
  maxActiveChildren: 50,
  featureFlags: { smsNotifications: true, perTenantBranding: false } as Prisma.InputJsonValue,
};

const subscriptionPlanTwo = {
  id: 'e2f3a4b5-c6d7-8901-bcde-f12345678901',
  name: 'Advanced Plan',
  tier: 'advanced' as SubscriptionTier,
  maxUsersByRole: { therapist: 20, staff: 50 } as Prisma.InputJsonValue,
  maxSensoryRooms: 5,
  maxActiveChildren: 150,
  featureFlags: { smsNotifications: true, perTenantBranding: true } as Prisma.InputJsonValue,
};

const clinicOne = {
  id: 'f3a4b5c6-d7e8-9012-cdef-123456789012',
  name: 'Happy Kids Clinic',
  address: '123 Main St, Anytown, USA',
  contactPhone: '555-123-4567',
  contactEmail: 'contact@happyclinic.com',
  timezone: 'America/New_York',
  subscriptionPlanId: null as string | null,
  status: 'active' as ClinicStatus,
  deletedAt: null as Date | null,
};

const clinicTwo = {
  id: 'a4b5c6d7-e8f9-0123-def0-234567890123',
  name: 'Sunshine Therapy Center',
  address: '456 Oak Ave, Sometown, USA',
  contactPhone: '555-987-6543',
  contactEmail: 'info@sunshinetherapy.com',
  timezone: 'America/Los_Angeles',
  subscriptionPlanId: null as string | null,
  status: 'active' as ClinicStatus,
  deletedAt: null as Date | null,
};

const insertSubscriptionPlans = async (
  plans: Array<{
    id: string;
    name: string;
    tier: SubscriptionTier;
    maxUsersByRole: Prisma.InputJsonValue;
    maxSensoryRooms: number;
    maxActiveChildren: number;
    featureFlags: Prisma.InputJsonValue;
  }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  await prisma.subscriptionPlan.deleteMany();
  for (const plan of plans) {
    await prisma.subscriptionPlan.create({ data: plan });
  }
};

const insertClinics = async (
  clinics: Array<{
    id: string;
    name: string;
    address: string;
    contactPhone: string;
    contactEmail: string;
    timezone: string;
    subscriptionPlanId: string | null;
    status: ClinicStatus;
    deletedAt: Date | null;
  }>
) => {
  const { prisma } = await import('../utils/setupTestDB');
  await prisma.clinic.deleteMany();
  for (const clinic of clinics) {
    await prisma.clinic.create({ data: clinic });
  }
};

export { clinicOne, clinicTwo, insertClinics, insertSubscriptionPlans, subscriptionPlanOne, subscriptionPlanTwo };
