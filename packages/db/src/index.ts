import { env } from "@haber-final/env/server";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../prisma/generated/client";

const SOFT_DELETE_MODELS = ["Child", "Guardian"];
const SOFT_DELETE_ACTIONS = [
	"findMany",
	"findFirst",
	"findUnique",
	"findUniqueOrThrow",
];

export function createPrismaClient() {
	const adapter = new PrismaPg({
		connectionString: env.DATABASE_URL,
	});

	return new PrismaClient({ adapter }).$extends({
		query: {
			$allModels: {
				$allOperations({ model, operation, args, query }) {
					if (
						SOFT_DELETE_MODELS.includes(model) &&
						SOFT_DELETE_ACTIONS.includes(operation)
					) {
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const where = (args as any).where as
							| Record<string, unknown>
							| undefined;

						// Strip includeDeleted FIRST — before any other logic
						// This ensures the key is removed before Prisma validates the query
						if (where && "includeDeleted" in where) {
							const { includeDeleted, ...rest } = where;
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(args as any).where = rest;
						}

						// Re-fetch where after potential modification
						// eslint-disable-next-line @typescript-eslint/no-explicit-any
						const finalWhere = (args as any).where as
							| Record<string, unknown>
							| undefined;

						// Only add deletedAt: null if no explicit deletedAt filter AND no includeDeleted bypass
						if (
							finalWhere &&
							!("includeDeleted" in finalWhere) &&
							finalWhere.deletedAt === undefined
						) {
							// eslint-disable-next-line @typescript-eslint/no-explicit-any
							(args as any).where = { ...finalWhere, deletedAt: null };
						}
					}
					return query(args);
				},
			},
		},
	});
}

const prisma = createPrismaClient();
export default prisma;
