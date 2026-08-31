import { logger } from "@haber-final/api/lib/logger";
import prisma from "@haber-final/db";
import { env } from "@haber-final/env/server";
import cron from "node-cron";

export function startSessionTimeoutSweep() {
	cron.schedule("*/5 * * * *", async () => {
		const cutoff = new Date(Date.now() - env.SESSION_TIMEOUT_MINUTES * 60_000);

		const { count } = await prisma.therapySession.updateMany({
			where: { status: "IN_PROGRESS", startedAt: { lte: cutoff } },
			data: { status: "TIMED_OUT", completedAt: new Date() },
		});

		if (count > 0) {
			logger.info({ count }, "session timeout sweep closed sessions");
		}
	});
}
