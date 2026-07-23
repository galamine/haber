import type { SessionCalendarDataSchema } from "@haber-final/api/schemas/dashboard";
import { Card } from "@haber-final/ui/components/card";
import {
	type CalendarEvent,
	SchedulingCalendar,
	type StatusColors,
} from "@haber-final/ui/components/scheduling-calendar";
import { format } from "date-fns";
import type { z } from "zod";

type SessionCalendarData = z.infer<typeof SessionCalendarDataSchema>;

type SessionCalendarProps = {
	data: SessionCalendarData;
	month: number;
	year: number;
	onMonthChange: (month: number, year: number) => void;
};

const SESSION_STATUS_COLORS: Record<string, StatusColors> = {
	PENDING: {
		bg: "bg-blue-100",
		text: "text-blue-700",
		border: "border-blue-200",
	},
	COMPLETED: {
		bg: "bg-green-100",
		text: "text-green-700",
		border: "border-green-200",
	},
	ABSENT: { bg: "bg-red-100", text: "text-red-700", border: "border-red-200" },
	MANUALLY_CLOSED: {
		bg: "bg-gray-100",
		text: "text-gray-700",
		border: "border-gray-200",
	},
};

function transformSessionData(
	data: SessionCalendarData,
): Record<string, CalendarEvent[]> {
	const transformed: Record<string, CalendarEvent[]> = {};

	for (const [dateKey, sessions] of Object.entries(data)) {
		transformed[dateKey] = sessions.map((session) => ({
			id: session.id,
			date: new Date(session.scheduledDate),
			title: "Session",
			time: format(new Date(session.scheduledDate), "h:mm a"),
			status: session.status,
		}));
	}

	return transformed;
}

export function SessionCalendar({
	data,
	month,
	year,
	onMonthChange,
}: SessionCalendarProps) {
	const events = transformSessionData(data);

	return (
		<Card className="border-brown-200 p-5">
			<SchedulingCalendar
				events={events}
				month={month}
				year={year}
				onMonthChange={onMonthChange}
				statusColors={SESSION_STATUS_COLORS}
				statusLabel="Session"
				title="Session Schedule"
			/>
		</Card>
	);
}
