import type { NotesTimelineEntrySchema } from "@haber-final/api/schemas/dashboard";
import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { Card } from "@haber-final/ui/components/card";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";

type NotesTimelineEntry = z.infer<typeof NotesTimelineEntrySchema>;

type NotesTimelineProps = {
	data: NotesTimelineEntry[];
};

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
	session: {
		label: "Session",
		className: "bg-blue-100 text-blue-700",
	},
	assessment: {
		label: "Assessment",
		className: "bg-amber-100 text-amber-700",
	},
	followUp: {
		label: "Follow-up",
		className: "bg-purple-100 text-purple-700",
	},
};

function formatDate(date: Date) {
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(date));
}

function truncateContent(content: string, maxLength = 150) {
	if (content.length <= maxLength) return content;
	return `${content.slice(0, maxLength).trim()}...`;
}

type NoteItemProps = {
	entry: NotesTimelineEntry;
};

function NoteItem({ entry }: NoteItemProps) {
	const [expanded, setExpanded] = useState(false);
	const badgeInfo = SOURCE_BADGE[entry.source] ?? {
		label: entry.source,
		className: "bg-gray-100 text-gray-700",
	};
	const needsTruncation = entry.content.length > 150;

	return (
		<div className="relative pl-6">
			<div className="absolute top-1 left-0 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-primary bg-background" />
			<div className="pb-6 last:pb-0">
				<div className="flex items-center gap-2">
					<span className="text-on-surface-variant text-xs">
						{formatDate(new Date(entry.date))}
					</span>
					<Badge className={badgeInfo.className}>
						{badgeInfo.label}
						{entry.section && ` (${entry.section})`}
					</Badge>
				</div>
				<p className="mt-2 text-on-surface text-sm">
					{expanded || !needsTruncation
						? entry.content
						: truncateContent(entry.content)}
				</p>
				{needsTruncation && (
					<Button
						variant="ghost"
						size="sm"
						className="mt-1 h-auto p-0 text-on-surface-variant text-xs hover:text-on-surface"
						onClick={() => setExpanded(!expanded)}
					>
						{expanded ? (
							<>
								<ChevronUp className="mr-1 h-3 w-3" />
								Show less
							</>
						) : (
							<>
								<ChevronDown className="mr-1 h-3 w-3" />
								Show more
							</>
						)}
					</Button>
				)}
			</div>
		</div>
	);
}

export function NotesTimeline({ data }: NotesTimelineProps) {
	if (!data || data.length === 0) {
		return (
			<Card className="p-5">
				<h3 className="mb-4 font-medium text-on-surface">Notes Timeline</h3>
				<div className="flex h-48 items-center justify-center rounded-xl border border-surface-container-highest bg-surface-container-lowest">
					<p className="text-on-surface-variant text-sm">
						No notes to display.
					</p>
				</div>
			</Card>
		);
	}

	const sortedData = [...data].sort(
		(a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
	);

	return (
		<Card className="p-5">
			<h3 className="mb-4 font-medium text-on-surface">Notes Timeline</h3>
			<div className="relative">
				<div className="absolute top-0 left-0 h-full w-px bg-outline-variant" />
				{sortedData.map((entry, index) => (
					<NoteItem key={`${entry.date}-${index}`} entry={entry} />
				))}
			</div>
		</Card>
	);
}
