import { Badge } from "@haber-final/ui/components/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { format, isSameDay, startOfWeek } from "date-fns";

type WeekSession = {
	id: string;
	scheduledDate: Date | string;
	status: string;
	child: { fullName: string } | null;
};

type MyWeekCalendarProps = {
	sessions: WeekSession[];
};

export function MyWeekCalendar({ sessions }: MyWeekCalendarProps) {
	const weekStart = startOfWeek(new Date());
	const days = Array.from({ length: 7 }, (_, i) => {
		const d = new Date(weekStart);
		d.setDate(weekStart.getDate() + i);
		return d;
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">My Week</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 gap-3 md:grid-cols-7">
					{days.map((day) => {
						const dayEvents = sessions.filter((s) =>
							isSameDay(new Date(s.scheduledDate), day),
						);
						return (
							<div
								key={day.toISOString()}
								className="rounded-lg border border-surface-container-highest p-2"
							>
								<div className="mb-2 text-center">
									<div className="font-medium text-on-surface-variant text-xs">
										{format(day, "EEE")}
									</div>
									<div className="font-medium text-on-surface text-sm">
										{format(day, "d")}
									</div>
								</div>
								<div className="space-y-1">
									{dayEvents.length === 0 ? (
										<p className="text-center text-on-surface-variant text-xs">
											—
										</p>
									) : (
										dayEvents.map((s) => (
											<div key={s.id} className="space-y-0.5">
												<p className="truncate text-on-surface text-xs">
													{s.child?.fullName ?? "—"}
												</p>
												<Badge variant="outline" className="text-[10px]">
													{format(new Date(s.scheduledDate), "h:mm a")}
												</Badge>
											</div>
										))
									)}
								</div>
							</div>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}
