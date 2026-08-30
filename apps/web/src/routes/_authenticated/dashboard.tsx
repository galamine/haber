import { Badge } from "@haber-final/ui/components/badge";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	redirect,
	useRouter,
} from "@tanstack/react-router";
import {
	AlertCircle,
	Calendar,
	ClipboardList,
	ShieldAlert,
	TrendingUp,
	Users,
} from "lucide-react";
import { useEffect } from "react";
import { MyCaseloadStats } from "@/features/dashboard/MyCaseloadStats";
import { MyWeekCalendar } from "@/features/dashboard/MyWeekCalendar";
import { PlanAdherenceRing } from "@/features/dashboard/PlanAdherenceRing";
import { ReviewsDueTable } from "@/features/dashboard/ReviewsDueTable";
import { RoomUtilisationTable } from "@/features/dashboard/RoomUtilisationTable";
import { SessionsNeedingNotesTable } from "@/features/dashboard/SessionsNeedingNotesTable";
import { StatCard } from "@/features/dashboard/StatCard";
import { TherapistLoadTable } from "@/features/dashboard/TherapistLoadTable";
import { TopCategoriesChart } from "@/features/dashboard/TopCategoriesChart";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/dashboard")({
	beforeLoad: () => {
		const role = useAuthStore.getState().role;
		if (role === "SUPER_ADMIN") {
			throw redirect({ to: "/platform/dashboard" });
		}
	},
	component: DashboardPage,
});

function DashboardPage() {
	const router = useRouter();
	const role = useAuthStore((s) => s.role);
	const isAdmin = role === "CLINIC_ADMIN";
	const isTherapist = role === "THERAPIST" || role === "STAFF";

	const { data: profile, isFetching } = useQuery({
		...trpc.profile.get.queryOptions(),
		enabled: role !== "SUPER_ADMIN",
	});

	const { data, isLoading } = useQuery({
		...trpc.dashboard.clinicSummary.queryOptions(),
		enabled: isAdmin,
	});

	const { data: caseload, isLoading: caseloadLoading } = useQuery({
		...trpc.dashboard.myCaseloadSummary.queryOptions(),
		enabled: isTherapist,
	});
	const { data: weekSessions, isLoading: weekLoading } = useQuery({
		...trpc.session.listForWeek.queryOptions(),
		enabled: isTherapist,
	});
	const { data: needingNotes, isLoading: notesLoading } = useQuery({
		...trpc.session.listNeedingNotes.queryOptions(),
		enabled: isTherapist,
	});
	const { data: reviewsDue, isLoading: reviewsLoading } = useQuery({
		...trpc.child.listReviewsDue.queryOptions(),
		enabled: isTherapist,
	});

	useEffect(() => {
		if (profile === null && !isFetching && role !== "SUPER_ADMIN") {
			router.navigate({ to: "/user-profile" });
		}
	}, [profile, role, router, isFetching]);

	if (profile === null && !isFetching && role !== "SUPER_ADMIN") {
		return null;
	}

	if (isTherapist) {
		const therapistLoading =
			caseloadLoading || weekLoading || notesLoading || reviewsLoading;

		if (therapistLoading) {
			return (
				<div className="space-y-6 p-8">
					<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
						<Skeleton className="h-32" />
					</div>
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Skeleton className="h-64" />
						<Skeleton className="h-64" />
					</div>
					<Skeleton className="h-64" />
				</div>
			);
		}

		if (!caseload) {
			return null;
		}

		return (
			<div className="space-y-6 p-8">
				<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
				<MyCaseloadStats
					activeChildrenCount={caseload.activeChildrenCount}
					sessionsTodayCount={caseload.sessionsTodayCount}
					sessionsThisWeekCount={caseload.sessionsThisWeekCount}
					attendancePct={caseload.attendancePct}
				/>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<SessionsNeedingNotesTable sessions={needingNotes ?? []} />
					<ReviewsDueTable reviews={reviewsDue ?? []} />
				</div>
				<MyWeekCalendar sessions={weekSessions ?? []} />
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div className="p-8">
				<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
				<p className="mt-2 text-on-surface-variant">
					Welcome back. More content coming soon.
				</p>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="space-y-6 p-8">
				<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
					<Skeleton className="h-32" />
				</div>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					<Skeleton className="h-64" />
					<Skeleton className="h-64" />
				</div>
			</div>
		);
	}

	if (!data) {
		return null;
	}

	return (
		<div className="space-y-6 p-8">
			<h1 className="font-semibold text-2xl text-on-surface">Dashboard</h1>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<StatCard
					title="Active Children"
					value={data.activeChildren}
					icon={Users}
				/>
				<StatCard
					title="Sessions Today"
					value={data.sessionsToday.total}
					icon={Calendar}
				>
					<div className="mt-2 flex flex-wrap gap-2">
						<Badge variant="outline">
							{data.sessionsToday.pending} pending
						</Badge>
						<Badge variant="outline">
							{data.sessionsToday.inProgress} in progress
						</Badge>
						<Badge variant="outline">
							{data.sessionsToday.completed} completed
						</Badge>
						<Badge variant="outline">{data.sessionsToday.absent} absent</Badge>
						<Badge variant="outline">
							{data.sessionsToday.manuallyClosed} closed
						</Badge>
					</div>
				</StatCard>
				<StatCard
					title="Sessions This Week"
					value={data.sessionsThisWeek}
					icon={TrendingUp}
				/>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-3">
				<StatCard
					title="Consent Backlog"
					value={data.consentBacklog.pendingConsent}
					subtitle={`${data.consentBacklog.expiredInvitations} expired invitations`}
					icon={AlertCircle}
				/>
				<StatCard
					title="Reviews Due"
					value={data.reviewsDueCount}
					icon={ClipboardList}
				/>
				<Link to="/settings/deleted-records">
					<StatCard
						title="DPDP Retention"
						value={data.retentionRecordsCount}
						subtitle="records past retention window"
						icon={ShieldAlert}
					/>
				</Link>
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<RoomUtilisationTable
					rooms={data.roomUtilisation.rooms}
					booked={data.roomUtilisation.booked}
					total={data.roomUtilisation.total}
					maintenanceCount={data.roomUtilisation.maintenanceCount}
				/>
				<TherapistLoadTable therapists={data.therapistLoad} />
			</div>
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<PlanAdherenceRing rate={data.planAdherenceRate} />
				<TopCategoriesChart categories={data.topCategoriesByActivity} />
			</div>
		</div>
	);
}
