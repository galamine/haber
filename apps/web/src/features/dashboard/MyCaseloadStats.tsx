import { Calendar, TrendingUp, Users } from "lucide-react";
import { StatCard } from "@/features/dashboard/StatCard";

type MyCaseloadStatsProps = {
	activeChildrenCount: number;
	sessionsTodayCount: number;
	sessionsThisWeekCount: number;
	attendancePct: number;
};

export function MyCaseloadStats({
	activeChildrenCount,
	sessionsTodayCount,
	sessionsThisWeekCount,
	attendancePct,
}: MyCaseloadStatsProps) {
	return (
		<div className="grid grid-cols-1 gap-4 md:grid-cols-4">
			<StatCard title="My Children" value={activeChildrenCount} icon={Users} />
			<StatCard
				title="Sessions Today"
				value={sessionsTodayCount}
				icon={Calendar}
			/>
			<StatCard
				title="Sessions This Week"
				value={sessionsThisWeekCount}
				icon={Calendar}
			/>
			<StatCard
				title="Attendance"
				value={`${attendancePct.toFixed(0)}%`}
				icon={TrendingUp}
			/>
		</div>
	);
}
