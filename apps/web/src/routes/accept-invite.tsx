import { useMutation } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useEffect } from "react";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

const searchSchema = z.object({
	email: z.string().catch(""),
	code: z.string().catch(""),
});

export const Route = createFileRoute("/accept-invite")({
	validateSearch: searchSchema,
	beforeLoad: ({ search }) => {
		if (useAuthStore.getState().isAuthenticated) {
			throw redirect({ to: "/dashboard" });
		}
		if (!search.email || !search.code) {
			throw redirect({ to: "/login" });
		}
	},
	component: AcceptInvitePage,
});

function AcceptInvitePage() {
	const { email, code } = Route.useSearch();
	const router = useRouter();
	const setTokens = useAuthStore((s) => s.setTokens);

	const { mutate: submitInvite, isError } = useMutation(
		trpc.auth.verifyOtp.mutationOptions({
			onSuccess: (result) => {
				setTokens(result.accessToken, result.refreshToken);
				router.navigate({ to: "/user-profile" });
			},
		}),
	);

	useEffect(() => {
		submitInvite({ email, code });
	}, [email, code, submitInvite]);

	if (isError) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background p-4">
				<main className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-xl border border-border bg-white p-8 text-center shadow-sm">
					<div className="absolute top-0 left-0 h-1 w-full bg-brown-600" />
					<div className="flex h-16 w-16 items-center justify-center rounded-xl border border-brown-200 bg-brown-50">
						<Stethoscope className="h-8 w-8 text-brown-800" />
					</div>
					<div className="flex flex-col gap-2">
						<h1 className="font-medium text-on-surface text-xl">
							Invitation link invalid
						</h1>
						<p className="text-on-surface-variant text-sm">
							This invite link has expired or has already been used.
						</p>
					</div>
					<Link
						to="/login"
						className="font-medium text-brown-600 text-sm hover:underline"
					>
						Go to login
					</Link>
				</main>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-background p-4">
			<main className="relative flex w-full max-w-md flex-col items-center gap-6 overflow-hidden rounded-xl border border-border bg-white p-8 text-center shadow-sm">
				<div className="absolute top-0 left-0 h-1 w-full bg-brown-600" />
				<div className="flex h-16 w-16 items-center justify-center rounded-xl border border-brown-200 bg-brown-50">
					<Stethoscope className="h-8 w-8 text-brown-800" />
				</div>
				<div className="flex flex-col gap-2">
					<h1 className="font-medium text-on-surface text-xl">
						Accepting invitation…
					</h1>
					<p className="text-on-surface-variant text-sm">
						Please wait while we log you in.
					</p>
				</div>
			</main>
		</div>
	);
}
