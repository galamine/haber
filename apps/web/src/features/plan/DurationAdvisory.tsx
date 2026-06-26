import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@haber-final/ui/components/alert";

type DurationAdvisoryProps = {
	totalMinutes: number;
	limitMinutes: number;
};

export function DurationAdvisory({
	totalMinutes,
	limitMinutes,
}: DurationAdvisoryProps) {
	return (
		<Alert className="border-warning/30 bg-warning/10">
			<AlertTitle className="flex items-center gap-2 text-warning">
				<span className="material-symbols-outlined text-sm">warning</span>
				Duration Mismatch
			</AlertTitle>
			<AlertDescription className="text-on-surface-variant text-sm">
				Total game time ({totalMinutes} min) exceeds session target duration (
				{limitMinutes} min). This is advisory only.
			</AlertDescription>
		</Alert>
	);
}
