import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@haber-final/ui/components/alert";
import { AlertTriangle } from "lucide-react";

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
				<AlertTriangle className="h-4 w-4" />
				Duration Mismatch
			</AlertTitle>
			<AlertDescription className="text-on-surface-variant text-sm">
				Longest game duration ({totalMinutes} min) exceeds session target
				duration ({limitMinutes} min). This is advisory only.
			</AlertDescription>
		</Alert>
	);
}
