import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "./sheet";
import { Textarea } from "./textarea";

type QualityTag = "CALM" | "DISTRACTED" | "REFUSED";

export interface CloseSessionSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	disabled?: boolean;
	onSubmit: (data: { notes?: string; qualityTag?: QualityTag }) => void;
}

function CloseSessionSheet({
	open,
	onOpenChange,
	disabled,
	onSubmit,
}: CloseSessionSheetProps) {
	const [notes, setNotes] = React.useState("");
	const [qualityTag, setQualityTag] = React.useState<QualityTag | undefined>();

	function handleSubmit() {
		onSubmit({
			notes: notes || undefined,
			qualityTag,
		});
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="flex w-full flex-col p-0 sm:max-w-md"
				onOpenAutoFocus={(e) => {
					e.preventDefault();
					const textarea = (
						e.currentTarget as HTMLElement | null
					)?.querySelector("textarea") as HTMLTextAreaElement | null;
					textarea?.focus();
				}}
			>
				<SheetHeader className="flex-shrink-0 border-b px-6 py-4">
					<SheetTitle>Close Session</SheetTitle>
					<SheetDescription>
						Add optional notes and quality tag before closing.
					</SheetDescription>
				</SheetHeader>

				<div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
					<div>
						<label
							htmlFor="session-notes"
							className="mb-2 block font-medium text-sm"
						>
							Notes
						</label>
						<Textarea
							id="session-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Session notes..."
							className="min-h-32"
						/>
					</div>

					<div>
						<span className="mb-2 block font-medium text-sm">Quality Tag</span>
						<div className="flex gap-2">
							{(["CALM", "DISTRACTED", "REFUSED"] as const).map((tag) => (
								<button
									key={tag}
									type="button"
									onClick={() => setQualityTag(tag)}
									className={cn(
										"rounded-lg border px-3 py-1.5 text-sm transition-colors",
										qualityTag === tag
											? "border-primary bg-primary/10 text-foreground"
											: "border bg-background text-foreground hover:bg-accent",
									)}
								>
									{tag}
								</button>
							))}
						</div>
					</div>
				</div>

				<SheetFooter className="border-t px-6 py-4">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button disabled={disabled} onClick={handleSubmit}>
						{disabled ? "Closing..." : "Close Session"}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export { CloseSessionSheet };
