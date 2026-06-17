import "dotenv/config";
import { env } from "@haber-final/env/server";
import { createPrismaClient } from "../src/index";

const prisma = createPrismaClient();

const clinic = await prisma.clinic.upsert({
	where: { id: "seed_clinic_dev" },
	update: {},
	create: {
		id: "seed_clinic_dev",
		name: "Dev Test Clinic",
		address: "123 Seed Street, Bengaluru",
		contactName: "Dev Clinic Admin",
		contactPhone: "+91-9999999999",
		contactEmail: "clinic.admin@seed.local",
	},
});
console.log(`Clinic upserted: ${clinic.id} (${clinic.name})`);

const seedUsers = [
	{ email: "clinic.admin@seed.local", role: "CLINIC_ADMIN" as const },
	{ email: "staff1@seed.local", role: "STAFF" as const },
	{ email: "staff2@seed.local", role: "STAFF" as const },
	{ email: "therapist1@seed.local", role: "THERAPIST" as const },
	{ email: "therapist2@seed.local", role: "THERAPIST" as const },
];

for (const { email, role } of seedUsers) {
	const user = await prisma.user.upsert({
		where: { email },
		update: {
			role,
			clinicId: clinic.id,
			loginEnabled: true,
			emailVerified: true,
		},
		create: {
			email,
			role,
			clinicId: clinic.id,
			loginEnabled: true,
			emailVerified: true,
		},
	});
	console.log(`User upserted: ${user.id} (${user.email}, ${user.role})`);
}

if (env.SUPER_ADMIN_EMAIL) {
	const superAdmin = await prisma.user.upsert({
		where: { email: env.SUPER_ADMIN_EMAIL },
		update: { loginEnabled: true, emailVerified: true },
		create: {
			email: env.SUPER_ADMIN_EMAIL,
			role: "SUPER_ADMIN",
			loginEnabled: true,
			emailVerified: true,
			clinicId: null,
		},
	});
	console.log(`SuperAdmin upserted: ${superAdmin.id} (${superAdmin.email})`);
} else {
	console.log("SUPER_ADMIN_EMAIL not set, skipping super admin seed");
}

await prisma.$disconnect();
