import { Button } from "@haber-final/ui/components/button";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@haber-final/ui/components/tabs";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import {
	CalendarDays,
	CheckCircle,
	Clock,
	Gamepad2,
	LayoutGrid,
	Loader,
	MapPin,
	UserX,
} from "lucide-react";
import { useState } from "react";

import { IconTabs } from "@/components/IconTabs";
import { InfoCard } from "@/components/InfoCard";
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

const SESSION_TABS_BASE = [
	{ value: "ALL", label: "All", icon: LayoutGrid },
	{ value: "PENDING", label: "Pending", icon: Clock },
	{ value: "IN_PROGRESS", label: "In Progress", icon: Loader },
	{ value: "COMPLETED", label: "Completed", icon: CheckCircle },
	{ value: "ABSENT", label: "Absent", icon: UserX },
] as const;

type Session = {
	id: string;
	childId: string;
	scheduledDate: Date;
	status: SessionStatus;
	assignedTherapistId: string | null;
	roomId: string | null;
	gameAssignments: { id: string; order: number }[];
	child?: {
		id: string;
		fullName: string;
		photoUrl: string | null;
	};
};

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
					<h1 className="font-semibold text-2xl text-brown-900">
						Today's Sessions
					</h1>
					<p className="mt-1 text-brown-600 text-sm">{today}</p>
				</div>
				<Button
					variant="outline"
					className="border-brown-300 text-brown-700 hover:bg-brown-50"
					onClick={() => router.navigate({ to: "/sessions/uncovered" })}
				>
					View Uncovered
				</Button>
			</div>

			<IconTabs
				tabs={[
					{ ...SESSION_TABS_BASE[0], count: sessions?.length ?? 0 },
					{ ...SESSION_TABS_BASE[1], count: groupedByStatus.PENDING.length },
					{
						...SESSION_TABS_BASE[2],
						count: groupedByStatus.IN_PROGRESS.length,
					},
					{ ...SESSION_TABS_BASE[3], count: groupedByStatus.COMPLETED.length },
					{ ...SESSION_TABS_BASE[4], count: groupedByStatus.ABSENT.length },
				]}
				defaultValue="ALL"
				value={statusFilter}
				onValueChange={(v) => setStatusFilter(v as SessionStatus | "ALL")}
			>
				<TabsContent value={statusFilter}>
					{isLoading ? (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{Array.from({ length: 3 }).map((_, i) => (
								<InfoCard key={i} isLoading />
							))}
						</div>
					) : filteredSessions.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-brown-200 bg-white py-16 text-brown-600">
							<CalendarDays className="h-8 w-8" />
							<p className="text-sm">No sessions found.</p>
						</div>
					) : (
						<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							{filteredSessions.map((session: Session) => {
								const statusInfo =
									STATUS_BADGE[session.status] ?? STATUS_BADGE.PENDING;
								const childName = session.child?.fullName ?? "Unknown Child";

								return (
									<InfoCard
										key={session.id}
										avatar={{
											image: session.child?.photoUrl ?? undefined,
											initials: childName
												.split(" ")
												.map((n: string) => n[0])
												.join("")
												.slice(0, 2)
												.toUpperCase(),
										}}
										title={childName}
										subtitle="Session"
										date={new Date(session.scheduledDate).toLocaleDateString()}
										badge={{
											label: statusInfo.label,
											className: `${statusInfo.bg} ${statusInfo.text}`,
										}}
										infoItems={[
											{
												icon: Clock,
												label: new Date(
													session.scheduledDate,
												).toLocaleTimeString([], {
													hour: "2-digit",
													minute: "2-digit",
												}),
											},
											{
												icon: MapPin,
												label: session.roomId
													? `Room ${session.roomId}`
													: "Unassigned",
											},
											{
												icon: Gamepad2,
												label: `${session.gameAssignments.length} game(s)`,
											},
										]}
										onClick={() =>
											router.navigate({
												to: "/sessions/$sessionId",
												params: { sessionId: session.id },
											})
										}
									/>
								);
							})}
						</div>
					)}
				</TabsContent>
			</IconTabs>
		</div>
	);
}
