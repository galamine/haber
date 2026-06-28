import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@haber-final/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { CalendarDays, Gamepad2, MapPin } from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/sessions/")({
	component: TodaySessionsPage,
});

type SessionStatus =
	| "PENDING"
	| "IN_PROGRESS"
	| "COMPLETED"
	| "ABSENT"
	| "MANUALLY_CLOSED";

const STATUS_BADGE: Record<
	SessionStatus,
	{ bg: string; text: string; label: string }
> = {
	PENDING: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
	IN_PROGRESS: {
		bg: "bg-blue-100",
		text: "text-blue-800",
		label: "In Progress",
	},
	COMPLETED: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
	ABSENT: { bg: "bg-gray-100", text: "text-gray-600", label: "Absent" },
	MANUALLY_CLOSED: { bg: "bg-red-100", text: "text-red-700", label: "Closed" },
};

type Session = {
	id: string;
	childId: string;
	scheduledDate: Date;
	status: SessionStatus;
	assignedTherapistId: string | null;
	roomId: string | null;
	gameAssignments: { id: string; order: number }[];
};

type Child = {
	id: string;
	fullName: string;
};

function SessionCard({ session }: { session: Session & { child?: Child } }) {
	const router = useRouter();
	const statusInfo = STATUS_BADGE[session.status] ?? STATUS_BADGE.PENDING;

	return (
		<button
			type="button"
			className="w-full cursor-pointer rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-left transition-shadow hover:shadow-md"
			onClick={() =>
				router.navigate({
					to: "/sessions/$sessionId",
					params: { sessionId: session.id },
				})
			}
		>
			<div className="mb-2 flex items-start justify-between">
				<div>
					<p className="font-medium text-on-surface text-sm">
						{session.child?.fullName ?? "Unknown Child"}
					</p>
					<p className="mt-0.5 flex items-center gap-1 text-on-surface-variant text-xs">
						<CalendarDays className="h-3 w-3" />
						{new Date(session.scheduledDate).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
				</div>
				<span
					className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${statusInfo.bg} ${statusInfo.text}`}
				>
					{statusInfo.label}
				</span>
			</div>
			<div className="mt-3 flex items-center gap-3 text-on-surface-variant text-xs">
				<span className="flex items-center gap-1">
					<MapPin className="h-3 w-3" />
					{session.roomId ? "Room assigned" : "Unassigned"}
				</span>
				<span className="flex items-center gap-1">
					<Gamepad2 className="h-3 w-3" />
					{session.gameAssignments.length} game
					{session.gameAssignments.length !== 1 ? "s" : ""}
				</span>
			</div>
		</button>
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
			<div className="mt-3 flex items-center gap-3">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-3 w-16" />
			</div>
		</div>
	);
}

function TodaySessionsPage() {
	const [statusFilter, setStatusFilter] = useState<SessionStatus | "ALL">(
		"ALL",
	);
	const router = useRouter();

	const { data: sessions, isLoading } = useQuery({
		...trpc.session.listForToday.queryOptions(),
		refetchInterval: 30_000,
	});

	const filteredSessions = (sessions ?? []).filter(
		(s: Session) => statusFilter === "ALL" || s.status === statusFilter,
	);

	const groupedByStatus = {
		PENDING: (sessions ?? []).filter((s: Session) => s.status === "PENDING"),
		IN_PROGRESS: (sessions ?? []).filter(
			(s: Session) => s.status === "IN_PROGRESS",
		),
		COMPLETED: (sessions ?? []).filter(
			(s: Session) => s.status === "COMPLETED",
		),
		ABSENT: (sessions ?? []).filter((s: Session) => s.status === "ABSENT"),
		MANUALLY_CLOSED: (sessions ?? []).filter(
			(s: Session) => s.status === "MANUALLY_CLOSED",
		),
	};

	const today = new Date().toLocaleDateString(undefined, {
		weekday: "long",
		year: "numeric",
		month: "long",
		day: "numeric",
	});

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl text-on-surface">
						Today's Sessions
					</h1>
					<p className="mt-1 text-on-surface-variant text-sm">{today}</p>
				</div>
				<Button
					variant="outline"
					onClick={() => router.navigate({ to: "/sessions/uncovered" })}
				>
					View Uncovered
				</Button>
			</div>

			<Tabs
				defaultValue="ALL"
				onValueChange={(v) => setStatusFilter(v as SessionStatus | "ALL")}
			>
				<TabsList className="mb-4">
					<TabsTrigger value="ALL">All ({sessions?.length ?? 0})</TabsTrigger>
					<TabsTrigger value="PENDING">
						Pending ({groupedByStatus.PENDING.length})
					</TabsTrigger>
					<TabsTrigger value="IN_PROGRESS">
						In Progress ({groupedByStatus.IN_PROGRESS.length})
					</TabsTrigger>
					<TabsTrigger value="COMPLETED">
						Completed ({groupedByStatus.COMPLETED.length})
					</TabsTrigger>
					<TabsTrigger value="ABSENT">
						Absent ({groupedByStatus.ABSENT.length})
					</TabsTrigger>
				</TabsList>

				<TabsContent value={statusFilter}>
					{isLoading ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<SessionSkeleton key={i} />
							))}
						</div>
					) : filteredSessions.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest py-16 text-on-surface-variant">
							<CalendarDays className="h-8 w-8" />
							<p className="text-sm">No sessions found.</p>
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{filteredSessions.map((session: Session) => (
								<SessionCard key={session.id} session={session} />
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
