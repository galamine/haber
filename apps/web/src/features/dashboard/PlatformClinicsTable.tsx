import { Button } from "@haber-final/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

type Clinic = {
	name: string;
	createdAt: string;
	activeChildren: number;
	activeTherapists: number;
	sessionsThisMonth: number;
};

type PlatformClinicsTableProps = {
	data: Clinic[];
};

type SortKey =
	| "name"
	| "createdAt"
	| "activeChildren"
	| "activeTherapists"
	| "sessionsThisMonth";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 10;

export function PlatformClinicsTable({ data }: PlatformClinicsTableProps) {
	const [sortKey, setSortKey] = useState<SortKey>("name");
	const [sortDir, setSortDir] = useState<SortDir>("asc");
	const [page, setPage] = useState(1);

	const handleSort = (key: SortKey) => {
		if (sortKey === key) {
			setSortDir(sortDir === "asc" ? "desc" : "asc");
		} else {
			setSortKey(key);
			setSortDir("asc");
		}
	};

	const sorted = [...data].sort((a, b) => {
		const aVal = a[sortKey];
		const bVal = b[sortKey];
		if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
		if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
		return 0;
	});

	const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
	const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	const formatDate = (dateStr: string) =>
		new Date(dateStr).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});

	const SortHeader = ({
		colKey,
		children,
	}: {
		colKey: SortKey;
		children: React.ReactNode;
	}) => (
		<button
			type="button"
			onClick={() => handleSort(colKey)}
			className="flex items-center gap-1 font-medium text-on-surface-variant text-xs transition-colors hover:text-on-surface"
		>
			{children}
			{sortKey === colKey && (sortDir === "asc" ? "↑" : "↓")}
		</button>
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="font-medium text-on-surface">
					All Clinics
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-outline-variant border-b">
								<th className="p-2 text-left">
									<SortHeader colKey="name">Name</SortHeader>
								</th>
								<th className="p-2 text-left">
									<SortHeader colKey="createdAt">Created</SortHeader>
								</th>
								<th className="p-2 text-left">
									<SortHeader colKey="activeChildren">Children</SortHeader>
								</th>
								<th className="p-2 text-left">
									<SortHeader colKey="activeTherapists">Therapists</SortHeader>
								</th>
								<th className="p-2 text-left">
									<SortHeader colKey="sessionsThisMonth">
										Sessions (Mo.)
									</SortHeader>
								</th>
							</tr>
						</thead>
						<tbody>
							{paginated.map((clinic, i) => (
								<tr
									key={i}
									className="border-outline-variant border-b hover:bg-muted/50"
								>
									<td className="p-2 font-medium text-on-surface">
										{clinic.name}
									</td>
									<td className="p-2 text-on-surface-variant">
										{formatDate(clinic.createdAt)}
									</td>
									<td className="p-2 text-on-surface-variant">
										{clinic.activeChildren}
									</td>
									<td className="p-2 text-on-surface-variant">
										{clinic.activeTherapists}
									</td>
									<td className="p-2 text-on-surface-variant">
										{clinic.sessionsThisMonth}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="flex items-center justify-between">
					<p className="text-on-surface-variant text-xs">
						Showing {(page - 1) * PAGE_SIZE + 1}–
						{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
							disabled={page === totalPages}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
