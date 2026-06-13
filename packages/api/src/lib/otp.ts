import { createHash, randomInt } from "node:crypto";

export function generateOtp(): string {
	return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashValue(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}
