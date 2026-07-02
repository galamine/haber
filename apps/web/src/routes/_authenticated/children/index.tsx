import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@haber-final/ui/components/avatar";
import { Button } from "@haber-final/ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { Baby, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/children/")({
	component: ChildrenListPage,
});

type ConsentStatus = "PENDING" | "GRANTED" | "WITHDRAWN";

const CONSENT_BADGE: Record<ConsentStatus, string> = {
	GRANTED: "bg-[#DCFCE7] text-[#15803D]",
	PENDING: "bg-[#FEF08A] text-[#854D0E]",
	WITHDRAWN: "bg-red-100 text-red-700",
};

function getAge(dob: Date) {
	const d = new Date(dob);
	const now = new Date();
	let age = now.getFullYear() - d.getFullYear();
	const m = now.getMonth() - d.getMonth();
	if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
	return age;
}

function getInitials(name: string) {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();
}

type ChildItem = {
	id: string;
	fullName: string;
	dob: string | Date;
	opNumber: string;
	consentStatus: string;
	photoUrl: string | null;
};

function ChildRow({ child }: { child: ChildItem }) {
	const router = useRouter();
	return (
		<button
			type="button"
			className="grid w-full cursor-pointer grid-cols-[2fr_80px_150px_120px] items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
			onClick={() =>
				router.navigate({
					to: "/children/$childId",
					params: { childId: child.id },
				})
			}
		>
			<div className="flex items-center gap-3">
				<Avatar className="h-9 w-9 shrink-0">
					{child.photoUrl && (
						<AvatarImage src={child.photoUrl} alt={child.fullName} />
					)}
					<AvatarFallback className="bg-brown-100 text-brown-700 text-xs">
						{getInitials(child.fullName)}
					</AvatarFallback>
				</Avatar>
				<div>
					<p className="font-medium text-on-surface text-sm">
						{child.fullName}
					</p>
					<p className="text-on-surface-variant text-xs">
						DOB: {new Date(child.dob).toLocaleDateString()}
					</p>
				</div>
			</div>
			<span className="text-on-surface text-sm">
				{getAge(new Date(child.dob))} yrs
			</span>
			<span className="text-on-surface text-sm">{child.opNumber}</span>
			<span
				className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium text-xs ${CONSENT_BADGE[child.consentStatus as ConsentStatus] ?? ""}`}
			>
				{child.consentStatus.charAt(0) +
					child.consentStatus.slice(1).toLowerCase()}
			</span>
		</button>
	);
}

function ListSkeleton() {
	return (
		<div className="divide-y divide-outline-variant">
			{Array.from({ length: 5 }).map((_, i) => (
				<div
					key={i}
					className="grid grid-cols-[2fr_80px_150px_120px] items-center gap-4 px-4 py-3"
				>
					<div className="flex items-center gap-3">
						<Skeleton className="h-9 w-9 shrink-0 rounded-full" />
						<div className="space-y-1.5">
							<Skeleton className="h-3.5 w-32" />
							<Skeleton className="h-3 w-20" />
						</div>
					</div>
					<Skeleton className="h-3.5 w-10" />
					<Skeleton className="h-3.5 w-24" />
					<Skeleton className="h-5 w-16 rounded-full" />
				</div>
			))}
		</div>
	);
}

function ChildrenListPage() {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");
	const [consentFilter, setConsentFilter] = useState<ConsentStatus | "all">(
		"all",
	);
	const [page, setPage] = useState(1);

	useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedSearch(search);
			setPage(1);
		}, 300);
		return () => clearTimeout(timer);
	}, [search]);

	const { data, isLoading } = useQuery(
		trpc.child.list.queryOptions({
			page,
			pageSize: 20,
			search: debouncedSearch || undefined,
			consentStatus: consentFilter === "all" ? undefined : consentFilter,
		}),
	);

	const items: ChildItem[] = (data?.items as unknown as ChildItem[]) ?? [];

	return (
		<div className="p-8">
			<div className="mb-6 flex items-start justify-between">
				<div>
					<h1 className="font-semibold text-2xl text-on-surface">Children</h1>
					<p className="mt-1 text-on-surface-variant text-sm">
						Manage child records, intake, and consent
					</p>
				</div>
				<Button onClick={() => router.navigate({ to: "/children/new" })}>
					Register New Child
				</Button>
			</div>

			<div className="mb-4 flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:flex-row sm:items-center">
				<div className="relative flex-1">
					<Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
					<input
						type="text"
						placeholder="Search by name or OP number…"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="w-full rounded-lg border border-outline-variant bg-background py-2 pr-4 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-brown-600"
					/>
				</div>
				<Select
					value={consentFilter}
					onValueChange={(v) => {
						setConsentFilter(v as ConsentStatus | "all");
						setPage(1);
					}}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Consent status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All statuses</SelectItem>
						<SelectItem value="GRANTED">Granted</SelectItem>
						<SelectItem value="PENDING">Pending</SelectItem>
						<SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
					</SelectContent>
				</Select>
			</div>

			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
				<div className="grid grid-cols-[2fr_80px_150px_120px] gap-4 border-outline-variant border-b bg-surface-container-low px-4 py-3">
					<span className="font-medium text-on-surface-variant text-xs">
						Name
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Age
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						OP Number
					</span>
					<span className="font-medium text-on-surface-variant text-xs">
						Consent
					</span>
				</div>

				{isLoading ? (
					<ListSkeleton />
				) : !items.length ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
						<Baby className="h-8 w-8" />
						<p className="text-sm">No children registered yet.</p>
					</div>
				) : (
					<div className="divide-y divide-outline-variant">
						{items.map((child) => (
							<ChildRow key={child.id} child={child} />
						))}
					</div>
				)}
			</div>

			{data && data.totalPages > 1 && (
				<div className="mt-4 flex items-center justify-center gap-2">
					<Button
						variant="outline"
						size="sm"
						disabled={page <= 1}
						onClick={() => setPage((p) => p - 1)}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<span className="text-on-surface-variant text-sm">
						Page {data.page} of {data.totalPages}
					</span>
					<Button
						variant="outline"
						size="sm"
						disabled={page >= data.totalPages}
						onClick={() => setPage((p) => p + 1)}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			)}
		</div>
	);
}
