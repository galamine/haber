import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Plus, Stethoscope } from "lucide-react";
import { useState } from "react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/platform/games/")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: PlatformGamesPage,
});

function GamesListSkeleton() {
	return (
		<div className="space-y-4">
			<div className="flex gap-4">
				<Skeleton className="h-10 w-64" />
				<Skeleton className="h-10 w-40" />
			</div>
			<div className="rounded-lg border">
				{Array.from({ length: 5 }).map((_, i) => (
					<div
						key={i}
						className="flex items-center gap-4 border-b px-4 py-3 last:border-b-0"
					>
						<Skeleton className="h-10 w-10" />
						<Skeleton className="h-4 w-40" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-16" />
						<Skeleton className="ml-auto h-8 w-20" />
					</div>
				))}
			</div>
		</div>
	);
}

function PlatformGamesPage() {
	const router = useRouter();
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState<string>("all");

	const { data: gamesData, isLoading } = useQuery(
		trpc.game.list.queryOptions({
			search: search || undefined,
			categoryId: categoryFilter !== "all" ? categoryFilter : undefined,
			pageSize: 100,
		}),
	);

	const { data: categories } = useQuery(
		trpc.game.listCategories.queryOptions(),
	);

	const games = gamesData?.items || [];

	const getStatusBadge = (game: (typeof games)[0]) => {
		const latestVersion = game.versions?.[0];
		if (!latestVersion) return <Badge variant="secondary">No Version</Badge>;
		if (latestVersion.isLatest) {
			return <Badge className="bg-green-100 text-green-800">Active</Badge>;
		}
		return <Badge variant="secondary">Deprecated</Badge>;
	};

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="font-semibold text-2xl text-on-surface">
						Global Games
					</h1>
					<p className="mt-1 text-on-surface-variant text-sm">
						Manage the platform&apos;s game library
					</p>
				</div>
				<Button onClick={() => router.navigate({ to: "/platform/games/new" })}>
					<Plus className="mr-2 h-4 w-4" />
					Add Game
				</Button>
			</div>

			<div className="mb-6 flex gap-4">
				<div className="relative w-64">
					<Input
						placeholder="Search games..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-10"
					/>
					<Stethoscope className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
				</div>
				<Select value={categoryFilter} onValueChange={setCategoryFilter}>
					<SelectTrigger className="w-48">
						<SelectValue placeholder="All Categories" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Categories</SelectItem>
						{categories?.map((cat) => (
							<SelectItem key={cat.id} value={cat.id}>
								{cat.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
				{isLoading ? (
					<GamesListSkeleton />
				) : games.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
						<Stethoscope className="h-8 w-8" />
						<p className="text-sm">No games found.</p>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Game</TableHead>
								<TableHead>Category</TableHead>
								<TableHead>Difficulty</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{games.map((game) => (
								<TableRow key={game.id}>
									<TableCell>
										<div className="flex items-center gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
												<Stethoscope className="h-5 w-5 text-muted-foreground" />
											</div>
											<div>
												<div className="font-medium text-on-surface">
													{game.name}
												</div>
												<div className="text-on-surface-variant text-xs">
													v{game.versions?.[0]?.versionNumber || "1"} ·{" "}
													{game.subCategory || game.category?.name || "General"}
												</div>
											</div>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{game.category?.name || "N/A"}
										</Badge>
									</TableCell>
									<TableCell>
										<span className="text-sm">
											{game.difficulty ? `Level ${game.difficulty}` : "N/A"}
										</span>
									</TableCell>
									<TableCell>{getStatusBadge(game)}</TableCell>
									<TableCell className="text-right">
										<div className="flex justify-end gap-2">
											<Button
												variant="ghost"
												size="sm"
												onClick={() =>
													router.navigate({
														to: "/platform/games/$gameId",
														params: { gameId: game.id },
													})
												}
											>
												Edit
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
