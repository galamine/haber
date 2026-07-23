import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@haber-final/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@haber-final/ui/components/popover";
import { cn } from "@haber-final/ui/lib/utils";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useState } from "react";

type Option = { value: string; label: string };

type MultiSelectComboboxProps = {
	options: Option[];
	value: string[];
	onChange: (value: string[]) => void;
	placeholder?: string;
};

export function MultiSelectCombobox({
	options,
	value,
	onChange,
	placeholder = "Select…",
}: MultiSelectComboboxProps) {
	const [open, setOpen] = useState(false);

	function toggle(optionValue: string) {
		if (value.includes(optionValue)) {
			onChange(value.filter((v) => v !== optionValue));
		} else {
			onChange([...value, optionValue]);
		}
	}

	const selectedOptions = options.filter((o) => value.includes(o.value));

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					type="button"
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="flex h-auto min-h-11 w-full items-start justify-between gap-2 border-brown-300 bg-input-background px-3 py-2 text-left font-normal hover:border-brown-400 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
				>
					<div className="flex flex-1 flex-wrap items-center justify-start gap-1.5">
						{selectedOptions.length > 0 ? (
							selectedOptions.map((option) => (
								<Badge
									key={option.value}
									variant="secondary"
									className="gap-1.5 whitespace-normal break-words border-brown-200 bg-brown-100 text-brown-700 text-sm"
								>
									{option.label}
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											toggle(option.value);
										}}
										className="ml-0.5 rounded-full hover:bg-brown-200 focus:outline-none focus:ring-1 focus:ring-brown-400"
									>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))
						) : (
							<span className="text-muted-foreground">{placeholder}</span>
						)}
					</div>
					<ChevronsUpDown className="h-4 w-4 shrink-0 self-center opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-(--radix-popover-trigger-width) p-0">
				<Command>
					<CommandInput placeholder="Search…" />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandGroup>
							{options.map((option) => {
								const isSelected = value.includes(option.value);
								return (
									<CommandItem
										key={option.value}
										value={option.label}
										onSelect={() => toggle(option.value)}
									>
										<Check
											className={cn(
												"h-4 w-4",
												isSelected ? "opacity-100" : "opacity-0",
											)}
										/>
										{option.label}
									</CommandItem>
								);
							})}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
