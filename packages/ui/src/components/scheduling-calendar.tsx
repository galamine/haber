import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@haber-final/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";

export interface CalendarEvent {
	id: string | number;
	date: Date;
	title?: string;
	time?: string;
	status?: string;
	color?: string;
	location?: string;
	attendees?: number;
	description?: string;
}

export interface StatusColors {
	bg: string;
	text: string;
	border: string;
}

export interface SchedulingCalendarProps {
	events: Record<string, CalendarEvent[]>;
	month: number;
	year: number;
	onMonthChange: (month: number, year: number) => void;
	defaultView?: "month" | "week" | "day";
	statusColors?: Record<string, StatusColors>;
	statusLabel?: string;
	showWeekends?: boolean;
	title?: string;
	colorMap?: Record<string, string>;
}

type ViewMode = "month" | "week" | "day";

const EN_LOCALE = "en-US";

function formatMonthName(year: number, month: number): string {
	return new Intl.DateTimeFormat(EN_LOCALE, { month: "long" }).format(
		new Date(year, month - 1),
	);
}

function formatDayName(dayIndex: number): string {
	const date = new Date(2024, 0, dayIndex + 1);
	return new Intl.DateTimeFormat(EN_LOCALE, { weekday: "short" }).format(date);
}

const DEFAULT_COLOR_MAP: Record<string, string> = {
	PENDING: "bg-blue-200",
	COMPLETED: "bg-green-200",
	ABSENT: "bg-red-200",
	MANUALLY_CLOSED: "bg-gray-200",
	TIMED_OUT: "bg-gray-200",
	meeting: "bg-purple-200",
	event: "bg-orange-200",
	schedule: "bg-brown-200",
};

function generateCalendarDays(month: number, year: number): number[] {
	const daysInMonth = new Date(year, month, 0).getDate();
	const firstDay = new Date(year, month - 1, 1).getDay();
	const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;

	const days: number[] = [];

	for (let i = 0; i < adjustedFirstDay; i++) {
		days.push(0);
	}

	for (let d = 1; d <= daysInMonth; d++) {
		days.push(d);
	}

	while (days.length < 35) {
		days.push(0);
	}

	return days;
}

function getEventColor(
	status: string | undefined,
	map: Record<string, string>,
): string {
	return status ? map[status] || "bg-brown-200" : "bg-brown-200";
}

function getDefaultStatusColors(): Record<string, StatusColors> {
	return {
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
		ABSENT: {
			bg: "bg-red-100",
			text: "text-red-700",
			border: "border-red-200",
		},
		MANUALLY_CLOSED: {
			bg: "bg-gray-100",
			text: "text-gray-700",
			border: "border-gray-200",
		},
		TIMED_OUT: {
			bg: "bg-gray-100",
			text: "text-gray-700",
			border: "border-gray-200",
		},
	};
}

export function SchedulingCalendar({
	events,
	month,
	year,
	onMonthChange,
	defaultView = "month",
	statusColors = getDefaultStatusColors(),
	statusLabel = "Event",
	showWeekends = true,
	title = "Schedule",
	colorMap = DEFAULT_COLOR_MAP,
}: SchedulingCalendarProps) {
	const [view, setView] = useState<ViewMode>(defaultView);
	const [openEventPopover, setOpenEventPopover] = useState<number | null>(null);

	const navigatePrev = () => {
		if (month === 1) {
			onMonthChange(12, year - 1);
		} else {
			onMonthChange(month - 1, year);
		}
	};

	const navigateNext = () => {
		if (month === 12) {
			onMonthChange(1, year + 1);
		} else {
			onMonthChange(month + 1, year);
		}
	};

	const calendarDays = generateCalendarDays(month, year);

	function getEventsForDay(day: number): CalendarEvent[] {
		if (day === 0) return [];
		const dateKey = format(new Date(year, month - 1, day), "yyyy-MM-dd");
		return events[dateKey] ?? [];
	}

	function getWeekDays(): number[] {
		const firstDay = new Date(year, month - 1, 1);
		const startOfWeek = new Date(firstDay);
		startOfWeek.setDate(firstDay.getDate() - firstDay.getDay() + 1);

		const days: number[] = [];
		for (let i = 0; i < 7; i++) {
			const day = new Date(startOfWeek);
			day.setDate(startOfWeek.getDate() + i);
			days.push(day.getDate());
		}
		return days;
	}

	function EventDetailsPopover({
		day,
		dayEvents,
	}: {
		day: number;
		dayEvents: CalendarEvent[];
	}) {
		return (
			<div className="w-80 p-4">
				<div className="mb-3">
					<h4 className="font-semibold text-brown-800">
						{formatMonthName(year, month)} {day}, {year}
					</h4>
					<p className="text-muted-foreground text-sm">
						{dayEvents.length} {statusLabel.toLowerCase()}
						{dayEvents.length !== 1 ? "s" : ""} scheduled
					</p>
				</div>

				<div className="max-h-48 space-y-3 overflow-y-auto">
					{dayEvents.map((event) => {
						const colors = statusColors[event.status ?? ""] ?? {
							bg: "bg-brown-100",
							text: "text-brown-700",
							border: "border-brown-200",
						};
						return (
							<div
								key={event.id}
								className="rounded-lg border border-brown-200 bg-brown-50/30 p-3"
							>
								<div className="mb-2 flex items-start justify-between">
									<h5 className="font-medium text-brown-800 text-sm">
										{event.title || statusLabel}
									</h5>
									{event.status && (
										<Badge
											variant="outline"
											className={`text-xs ${colors.bg} ${colors.text} ${colors.border}`}
										>
											{event.status}
										</Badge>
									)}
								</div>

								<div className="flex items-center gap-1 text-muted-foreground text-xs">
									<Clock className="h-3 w-3" />
									<span>
										{event.time ||
											(event.date ? format(event.date, "h:mm a") : "")}
									</span>
								</div>

								{event.location && (
									<div className="mt-1 text-muted-foreground text-xs">
										📍 {event.location}
									</div>
								)}

								{event.attendees && event.attendees > 0 && (
									<div className="mt-1 text-muted-foreground text-xs">
										👥 {event.attendees} attendee
										{event.attendees !== 1 ? "s" : ""}
									</div>
								)}

								{event.description && (
									<p className="mt-2 border-brown-200 border-t pt-2 text-brown-600 text-xs">
										{event.description}
									</p>
								)}
							</div>
						);
					})}
				</div>

				<div className="mt-4 border-brown-200 border-t pt-3">
					<Button
						size="sm"
						className="w-full bg-brown-600 text-white hover:bg-brown-700"
						onClick={() => setOpenEventPopover(null)}
					>
						Close
					</Button>
				</div>
			</div>
		);
	}

	function MonthView() {
		return (
			<div className="space-y-2">
				<div className="mb-2 grid grid-cols-7 gap-2">
					{Array.from({ length: 7 }, (_, i) => formatDayName(i)).map(
						(d, index) => {
							const isWeekend = index >= 5;
							if (!showWeekends && isWeekend) {
								return <div key={d} className="py-2" />;
							}
							return (
								<div
									key={d}
									className="py-2 text-center font-medium text-muted-foreground text-xs"
								>
									{d}
								</div>
							);
						},
					)}
				</div>
				<div className="grid grid-cols-7 gap-2">
					{calendarDays.map((day, index) => {
						const dayEvents = getEventsForDay(day);
						const hasEvents = dayEvents.length > 0;
						const isWeekend = index >= 5;

						if (day === 0) {
							return (
								<div
									key={index}
									className="min-h-[60px] rounded-lg border bg-gray-50 p-2 text-center"
								/>
							);
						}

						if (!showWeekends && isWeekend) {
							return (
								<div
									key={index}
									className="min-h-[60px] rounded-lg border bg-gray-50 p-2 text-center text-muted-foreground"
								>
									<div className="mb-1 font-medium text-sm">{day}</div>
								</div>
							);
						}

						return (
							<div key={index}>
								{hasEvents ? (
									<Popover
										open={openEventPopover === index}
										onOpenChange={(open) =>
											setOpenEventPopover(open ? index : null)
										}
									>
										<PopoverTrigger asChild>
											<div className="min-h-[60px] cursor-pointer rounded-lg border bg-white p-2 text-center transition-all hover:border-brown-300 hover:bg-brown-50 hover:shadow-sm">
												<div className="mb-1 font-medium text-sm">{day}</div>
												<div className="space-y-1">
													{dayEvents.slice(0, 3).map((event, i) => (
														<div
															key={event.id}
															className={`h-1.5 rounded-full ${
																event.color ||
																getEventColor(event.status, colorMap)
															}`}
															style={{ width: `${100 - i * 15}%` }}
														/>
													))}
													{dayEvents.length > 3 && (
														<div className="font-medium text-brown-600 text-xs">
															+{dayEvents.length - 3} more
														</div>
													)}
												</div>
											</div>
										</PopoverTrigger>
										<PopoverContent
											className="w-auto border-brown-200 p-0"
											align="center"
											side="top"
										>
											<EventDetailsPopover day={day} dayEvents={dayEvents} />
										</PopoverContent>
									</Popover>
								) : (
									<div className="min-h-[60px] rounded-lg border bg-white p-2 text-center hover:bg-brown-50">
										<div className="mb-1 font-medium text-sm">{day}</div>
									</div>
								)}
							</div>
						);
					})}
				</div>
			</div>
		);
	}

	function WeekView() {
		const weekDays = getWeekDays();

		return (
			<div className="grid grid-cols-7 gap-2">
				{Array.from({ length: 7 }, (_, i) => formatDayName(i)).map((d, i) => {
					const day = weekDays[i];
					const isWeekend = i >= 5;

					if (day === undefined || (!showWeekends && isWeekend)) {
						return (
							<div
								key={d}
								className="rounded-lg border bg-gray-50 p-3 text-center text-muted-foreground"
							>
								<div className="mb-1 font-medium text-xs">{d}</div>
								<div className="mb-2 font-medium text-sm">{day ?? ""}</div>
							</div>
						);
					}

					const dayEvents = getEventsForDay(day);

					return (
						<div
							key={d}
							className="rounded-lg border bg-white p-3 text-center hover:bg-brown-50"
						>
							<div className="mb-1 font-medium text-muted-foreground text-xs">
								{d}
							</div>
							<div className="mb-2 font-medium text-sm">{day}</div>
							<div className="space-y-1">
								{dayEvents.slice(0, 2).map((event) => (
									<div
										key={event.id}
										className={`truncate rounded p-1.5 text-white text-xs ${
											event.color || getEventColor(event.status, colorMap)
										}`}
									>
										{event.time ||
											(event.date ? format(event.date, "h:mm a") : "")}
									</div>
								))}
								{dayEvents.length > 2 && (
									<div className="font-medium text-brown-600 text-xs">
										+{dayEvents.length - 2} more
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		);
	}

	function DayView() {
		const today = new Date().getDate();
		const dayEvents = getEventsForDay(today);

		return (
			<div className="rounded-lg border border-brown-200 bg-white p-4">
				<h4 className="mb-4 text-center font-medium text-brown-800">
					{formatMonthName(year, month)} {today}, {year}
				</h4>
				<div className="max-h-[400px] space-y-3 overflow-y-auto">
					{dayEvents.length > 0 ? (
						dayEvents.map((event) => {
							const colors = statusColors[event.status ?? ""] ?? {
								bg: "bg-brown-100",
								text: "text-brown-700",
								border: "border-brown-200",
							};
							return (
								<div
									key={event.id}
									className="flex items-center justify-between rounded-lg border border-brown-200 p-3 hover:bg-brown-50"
								>
									<div className="text-left">
										<div className="font-medium text-brown-800 text-sm">
											{event.title || statusLabel}
										</div>
										<div className="text-muted-foreground text-xs">
											{event.time ||
												(event.date ? format(event.date, "h:mm a") : "")}
										</div>
									</div>
									{event.status && (
										<Badge
											variant="outline"
											className={`${colors.bg} ${colors.text} ${colors.border}`}
										>
											{event.status}
										</Badge>
									)}
								</div>
							);
						})
					) : (
						<div className="py-8 text-center text-muted-foreground">
							<p className="text-sm">
								No {statusLabel.toLowerCase()}s scheduled
							</p>
						</div>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h3 className="font-medium text-brown-800">{title}</h3>
				<div className="flex items-center gap-4">
					<Button
						variant="outline"
						size="sm"
						onClick={navigatePrev}
						className="hover:border-brown-300 hover:bg-brown-50"
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="min-w-[140px] text-center font-medium text-brown-800">
						{formatMonthName(year, month)} {year}
					</span>
					<Button
						variant="outline"
						size="sm"
						onClick={navigateNext}
						className="hover:border-brown-300 hover:bg-brown-50"
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
				<Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
					<SelectTrigger className="w-[120px] border-brown-200">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="month">Month</SelectItem>
						<SelectItem value="week">Week</SelectItem>
						<SelectItem value="day">Day</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{view === "month" && <MonthView />}
			{view === "week" && <WeekView />}
			{view === "day" && <DayView />}
		</div>
	);
}
