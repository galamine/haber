import { useMutation } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useState } from "react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

	const router = useRouter();
	const setTokens = useAuthStore((s) => s.setTokens);

	const requestOtp = useMutation(
		trpc.auth.requestOtp.mutationOptions({
			onSuccess: () => setStep("otp"),
			onError: (err) => {
				const msg = err.message;
				if (msg.includes("TOO_MANY_REQUESTS") || msg.includes("Too many")) {
					setError("Too many requests, try again in 10 minutes");
				} else {
					setError("Failed to send code. Check your email and try again.");
				}
			},
		}),
	);

	const verifyOtp = useMutation(
		trpc.auth.verifyOtp.mutationOptions({
			onSuccess: (result) => {
				setTokens(result.accessToken, result.refreshToken);
				router.navigate({ to: "/dashboard" });
			},
			onError: (err) => {
				const msg = err.message;
				if (
					msg.includes("UNAUTHORIZED") ||
					msg.toLowerCase().includes("invalid")
				) {
					const remaining = attemptsLeft !== null ? attemptsLeft - 1 : 4;
					if (remaining <= 0) {
						setError("OTP invalidated, request a new one");
						setStep("email");
						setOtp("");
						setAttemptsLeft(null);
					} else {
						setAttemptsLeft(remaining);
						setError(
							`Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`,
						);
					}
				} else {
					setError("Something went wrong. Please try again.");
				}
			},
		}),
	);

	function handleOtpChange(
		e: React.ChangeEvent<HTMLInputElement>,
		index: number,
	) {
		const val = e.target.value.replace(/\D/g, "").slice(-1);
		if (val) {
			const newOtp = otp.split("");
			newOtp[index] = val;
			setOtp(newOtp.join(""));
			if (index < 5) {
				document
					.querySelectorAll<HTMLInputElement>("[data-otp-input]")
					[index + 1]?.focus();
			}
		}
	}

	function handleOtpKeyDown(
		e: React.KeyboardEvent<HTMLInputElement>,
		index: number,
	) {
		if (e.key === "Backspace" && !otp[index] && index > 0) {
			document
				.querySelectorAll<HTMLInputElement>("[data-otp-input]")
				[index - 1]?.focus();
		}
	}

	async function handleRequestOtp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		requestOtp.mutate({ email });
	}

	async function handleVerifyOtp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		verifyOtp.mutate({ email, code: otp });
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<main className="relative flex w-full max-w-md flex-col gap-6 overflow-hidden rounded-xl border border-border bg-white p-8 shadow-sm">
				<div className="absolute top-0 left-0 h-1 w-full bg-brown-600" />

				{step === "email" ? (
					<>
						<div className="flex flex-col items-center text-center">
							<div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-brown-200 bg-brown-50">
								<Stethoscope className="h-8 w-8 text-brown-800" />
							</div>
							<h1 className="mb-1 font-black text-3xl text-brown-800">
								HaberApp
							</h1>
							<h2 className="mt-2 font-medium text-on-surface text-xl">
								Welcome to HaberApp
							</h2>
							<p className="mt-1 text-on-surface-variant text-sm">
								Enter your clinic email to receive a login code
							</p>
						</div>

						<form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<label
									htmlFor="email"
									className="font-medium text-on-surface text-sm"
								>
									Email Address
								</label>
								<input
									id="email"
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="doctor@clinic.com"
									className="w-full rounded-lg border border-brown-300 bg-white px-4 py-2 text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-brown-700"
								/>
							</div>

							{error && <p className="text-danger text-sm">{error}</p>}

							<button
								type="submit"
								disabled={requestOtp.isPending}
								className="mt-2 w-full rounded-lg bg-brown-600 px-6 py-2 font-medium text-sm text-white transition-colors hover:bg-brown-700 disabled:opacity-60"
							>
								{requestOtp.isPending ? "Sending…" : "Send OTP"}
							</button>
						</form>
					</>
				) : (
					<>
						<div className="flex flex-col items-center text-center">
							<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
								<span className="text-3xl">🔐</span>
							</div>
							<h1 className="mb-2 font-medium text-2xl text-on-surface">
								Verify Identity
							</h1>
							<p className="text-on-surface-variant text-sm">
								Enter the 6-digit code sent to <strong>{email}</strong>
							</p>
						</div>

						<form
							onSubmit={handleVerifyOtp}
							className="flex flex-col items-center gap-4"
						>
							<div className="flex items-center gap-2">
								{Array.from({ length: 6 }).map((_, i) => (
									<input
										key={i}
										type="text"
										inputMode="numeric"
										maxLength={1}
										value={otp[i] ?? ""}
										onChange={(e) => handleOtpChange(e, i)}
										onKeyDown={(e) => handleOtpKeyDown(e, i)}
										className="h-9 w-9 rounded-lg border border-brown-300 bg-white text-center font-medium text-sm focus:outline-none focus:ring-2 focus:ring-brown-700"
										data-otp-input
									/>
								))}
							</div>

							{error && (
								<p className="text-center text-danger text-sm">{error}</p>
							)}

							<button
								type="submit"
								disabled={verifyOtp.isPending || otp.length < 6}
								className="w-full rounded-lg bg-primary py-3 font-medium text-sm text-white transition-colors hover:bg-brown-600 disabled:opacity-60"
							>
								{verifyOtp.isPending ? "Verifying…" : "Verify and Login"}
							</button>
						</form>

						<div className="text-center">
							<p className="text-on-surface-variant text-sm">
								Didn't receive a code?{" "}
								<button
									type="button"
									onClick={() => {
										setStep("email");
										setError(null);
										setOtp("");
									}}
									className="font-medium text-brown-600 hover:underline"
								>
									Resend code
								</button>
							</p>
						</div>
					</>
				)}

				<div className="text-center">
					<p className="text-on-surface-variant text-sm">
						Need help?{" "}
						<a
							href="mailto:support@haberapp.com"
							className="font-medium text-brown-600 hover:underline"
						>
							Contact IT Support
						</a>
					</p>
				</div>
			</main>
		</div>
	);
}
