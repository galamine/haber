import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CalendarDays, Gamepad2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/sessions/uncovered")({
	component: UncoveredSessionsPage,
});

type Session = {
	id: string;
	childId: string;
	scheduledDate: Date;
	status: string;
	gameAssignments: { id: string; order: number }[];
};

function SessionCard({
	session,
	onClaim,
	isClaiming,
}: {
	session: Session;
	onClaim: () => void;
	isClaiming: boolean;
}) {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
			<div className="mb-2 flex items-start justify-between">
				<div>
					<p className="font-medium text-on-surface text-sm">
						Child ID: {session.childId}
					</p>
					<p className="mt-0.5 flex items-center gap-1 text-on-surface-variant text-xs">
						<CalendarDays className="h-3 w-3" />
						{new Date(session.scheduledDate).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
				</div>
				<span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 font-medium text-xs text-yellow-800">
					Uncovered
				</span>
			</div>
			<div className="mt-3 flex items-center gap-1 text-on-surface-variant text-xs">
				<Gamepad2 className="h-3 w-3" />
				{session.gameAssignments.length} game
				{session.gameAssignments.length !== 1 ? "s" : ""}
			</div>
			<Button
				className="mt-4 w-full gap-2"
				size="sm"
				disabled={isClaiming}
				onClick={onClaim}
			>
				<UserPlus className="h-4 w-4" />
				{isClaiming ? "Claiming..." : "Claim Session"}
			</Button>
		</div>
	);
}

function SessionSkeleton() {
	return (
		<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
			<div className="mb-2 flex items-start justify-between">
				<div>
					<Skeleton className="mb-1 h-4 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
				<Skeleton className="h-5 w-16 rounded-full" />
			</div>
			<Skeleton className="mt-3 h-3 w-20" />
			<Skeleton className="mt-4 h-9 w-full" />
		</div>
	);
}

function UncoveredSessionsPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: sessions, isLoading } = useQuery(
		trpc.session.listUncovered.queryOptions(),
	);

	const claimMutation = useMutation(
		trpc.session.claimCoverage.mutationOptions({
			onSuccess: () => {
				toast.success("Session claimed successfully");
				queryClient.invalidateQueries({
					queryKey: trpc.session.listUncovered.queryOptions().queryKey,
				});
				queryClient.invalidateQueries({
					queryKey: trpc.session.listForToday.queryOptions().queryKey,
				});
				router.navigate({ to: "/sessions" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl text-on-surface">
						Uncovered Sessions
					</h1>
					<p className="mt-1 text-on-surface-variant text-sm">
						Sessions without an assigned therapist for today
					</p>
				</div>
				<Button
					variant="outline"
					onClick={() => router.navigate({ to: "/sessions" })}
				>
					Back to Today
				</Button>
			</div>

			{isLoading ? (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<SessionSkeleton key={i} />
					))}
				</div>
			) : !sessions || sessions.length === 0 ? (
				<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest py-16 text-on-surface-variant">
					<UserPlus className="h-8 w-8" />
					<p className="text-sm">No uncovered sessions today.</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{sessions.map((session: Session) => (
						<SessionCard
							key={session.id}
							session={session}
							onClaim={() => claimMutation.mutate({ sessionId: session.id })}
							isClaiming={claimMutation.isPending}
						/>
					))}
				</div>
			)}
		</div>
	);
}
