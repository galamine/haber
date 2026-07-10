import type { SessionCalendarDataSchema } from "@haber-final/api/schemas/dashboard";
import { Calendar } from "@haber-final/ui/components/calendar";
import { Card } from "@haber-final/ui/components/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@haber-final/ui/components/popover";
import { format } from "date-fns";
import type { DayProps } from "react-day-picker";
import type { z } from "zod";

type SessionCalendarData = z.infer<typeof SessionCalendarDataSchema>;

type SessionCalendarProps = {
	data: SessionCalendarData;
	month: number;
	year: number;
	onMonthChange: (month: number, year: number) => void;
};

export function SessionCalendar({
	data,
	month,
	year,
	onMonthChange,
}: SessionCalendarProps) {
	const STATUS_COLORS: Record<string, string> = {
		hasPendingSession: "var(--session-color-pending)",
		hasCompletedSession: "var(--session-color-completed)",
		hasAbsentSession: "var(--session-color-absent)",
		hasManuallyClosedSession: "var(--session-color-manually-closed)",
	};

	function SessionDayCell({ day, modifiers, ...tdProps }: DayProps) {
		const dateKey = format(day.date, "yyyy-MM-dd");
		const sessions = data[dateKey] ?? [];

		let backgroundColor = "transparent";
		for (const [status, color] of Object.entries(STATUS_COLORS)) {
			if (modifiers[status]) {
				backgroundColor = color;
				break;
			}
		}

		return (
			<td {...tdProps}>
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							className="rdp-day_button h-9 w-9 rounded-md p-0 font-normal hover:bg-accent"
							style={{ backgroundColor }}
						>
							{day.date.getDate()}
							{sessions.length > 0 && (
								<span
									style={{
										position: "absolute",
										bottom: "2px",
										left: "50%",
										transform: "translateX(-50%)",
										width: "6px",
										height: "6px",
										borderRadius: "50%",
										backgroundColor: "var(--session-color-completed)",
									}}
								/>
							)}
						</button>
					</PopoverTrigger>
					<PopoverContent align="center" sideOffset={4}>
						{sessions.length > 0 ? (
							<div className="space-y-2">
								<p className="font-medium text-sm">
									{sessions.length} Session{sessions.length !== 1 ? "s" : ""}
								</p>
								{sessions.map((session) => (
									<div
										key={session.id}
										className="flex items-center justify-between gap-4 text-sm"
									>
										<span className="text-muted-foreground">
											{format(new Date(session.scheduledDate), "h:mm a")}
										</span>
										<span
											className={`rounded px-2 py-0.5 font-medium text-xs ${
												session.status === "COMPLETED"
													? "bg-green-100 text-green-800"
													: session.status === "PENDING"
														? "bg-blue-100 text-blue-800"
														: session.status === "ABSENT"
															? "bg-red-100 text-red-800"
															: "bg-gray-100 text-gray-800"
											}`}
										>
											{session.status.replace("_", " ")}
										</span>
									</div>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">No sessions</p>
						)}
					</PopoverContent>
				</Popover>
			</td>
		);
	}

	const daysByStatus: Record<string, Date[]> = {
		PENDING: [],
		COMPLETED: [],
		ABSENT: [],
		MANUALLY_CLOSED: [],
	};

	for (const [dateKey, sessions] of Object.entries(data)) {
		if (sessions.length > 0) {
			const status = sessions[0]?.status ?? "PENDING";
			daysByStatus[status].push(new Date(dateKey));
		}
	}

	const modifiers = {
		hasPendingSession: daysByStatus.PENDING,
		hasCompletedSession: daysByStatus.COMPLETED,
		hasAbsentSession: daysByStatus.ABSENT,
		hasManuallyClosedSession: daysByStatus.MANUALLY_CLOSED,
	};

	const modifiersStyles = {
		hasPendingSession: {
			backgroundColor: "var(--session-color-pending)",
		},
		hasCompletedSession: {
			backgroundColor: "var(--session-color-completed)",
		},
		hasAbsentSession: {
			backgroundColor: "var(--session-color-absent)",
		},
		hasManuallyClosedSession: {
			backgroundColor: "var(--session-color-manually-closed)",
		},
	};

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">Session Calendar</h3>
			<Calendar
				month={new Date(year, month - 1)}
				onMonthChange={(date) => {
					onMonthChange(date.getMonth() + 1, date.getFullYear());
				}}
				modifiers={modifiers}
				modifiersStyles={modifiersStyles}
				components={{
					Day: SessionDayCell,
				}}
			/>
		</Card>
	);
}
