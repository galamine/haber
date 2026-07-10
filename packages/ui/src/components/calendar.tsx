import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { DayFlag, DayPicker, SelectionState, UI } from "react-day-picker";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";

export type { DateRange };

function Calendar({
	className,
	classNames,
	showOutsideDays = true,
	...props
}: React.ComponentProps<typeof DayPicker>) {
	return (
		<DayPicker
			showOutsideDays={showOutsideDays}
			className={cn("p-3", className)}
			classNames={{
				[UI.Root]: "rdp-root",
				[UI.Months]: "rdp-months flex flex-col sm:flex-row gap-4",
				[UI.Month]: "rdp-month space-y-4",
				[UI.CaptionLabel]:
					"rdp-caption_label text-sm font-medium text-center py-1",
				[UI.Nav]: "rdp-nav flex items-center gap-1 absolute right-0",
				[UI.PreviousMonthButton]: cn(
					buttonVariants({ variant: "ghost" }),
					"rdp-button_previous h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
				),
				[UI.NextMonthButton]: cn(
					buttonVariants({ variant: "ghost" }),
					"rdp-button_next h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-foreground",
				),
				[UI.MonthGrid]: "rdp-month_grid w-full border-collapse",
				[UI.Weekdays]: "rdp-weekdays flex",
				[UI.Weekday]:
					"rdp-weekday text-muted-foreground w-9 font-normal text-[0.8rem] text-center py-2",
				[UI.Weeks]: "rdp-weeks flex flex-col",
				[UI.Week]: "rdp-week flex w-full mt-2",
				[UI.Day]: "rdp-day h-9 w-9 p-0 text-center relative",
				[UI.DayButton]: cn(
					buttonVariants({ variant: "ghost" }),
					"rdp-day_button h-9 w-9 rounded-md p-0 font-normal hover:bg-accent aria-selected:opacity-100",
				),
				[DayFlag.outside]: "rdp-outside text-muted-foreground opacity-50",
				[DayFlag.disabled]: "rdp-disabled text-muted-foreground opacity-50",
				[SelectionState.selected]:
					"rdp-selected bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
				[DayFlag.today]: "rdp-today bg-accent text-accent-foreground",
				...classNames,
			}}
			components={{
				Chevron: ({ className: chevronClassName, orientation }) => {
					if (orientation === "left") {
						return <ChevronLeft className={cn("h-4 w-4", chevronClassName)} />;
					}
					return <ChevronRight className={cn("h-4 w-4", chevronClassName)} />;
				},
			}}
			{...props}
		/>
	);
}
Calendar.displayName = "Calendar";

export { Calendar };
