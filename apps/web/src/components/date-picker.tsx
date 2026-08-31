import { Button } from "@haber-final/ui/components/button";
import { Calendar } from "@haber-final/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@haber-final/ui/components/popover";
import { cn } from "@haber-final/ui/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";

type DatePickerProps = {
	id?: string;
	value?: Date;
	onChange: (date: Date | undefined) => void;
	placeholder?: string;
};

export function DatePicker({
	id,
	value,
	onChange,
	placeholder = "Pick a date",
}: DatePickerProps) {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					className={cn(
						"w-full justify-start font-normal",
						!value && "text-muted-foreground",
					)}
				>
					<CalendarIcon className="mr-2 h-4 w-4" />
					{value ? format(value, "PPP") : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={value}
					onSelect={(date) => {
						onChange(date);
						setOpen(false);
					}}
					autoFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
