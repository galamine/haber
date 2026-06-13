import "dotenv/config";
import { env } from "@haber-final/env/server";
import { createPrismaClient } from "../src/index";

const email = env.SUPER_ADMIN_EMAIL ?? process.argv[2];
if (!email) {
	console.error(
		"Provide SUPER_ADMIN_EMAIL env var or pass email as argument: tsx prisma/seed-super-admin.ts <email>",
	);
	process.exit(1);
}

const prisma = createPrismaClient();

const user = await prisma.user.upsert({
	where: { email },
	update: { loginEnabled: true, emailVerified: true },
	create: {
		email,
		role: "SUPER_ADMIN",
		loginEnabled: true,
		emailVerified: true,
		clinicId: null,
	},
});

console.log(`SuperAdmin upserted: ${user.id} (${user.email})`);

await prisma.$disconnect();
