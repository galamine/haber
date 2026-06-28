import { Badge } from "@haber-final/ui/components/badge";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { useState } from "react";
import { CreateVersionForm } from "@/components/game-library/CreateVersionForm";
import { GameForm } from "@/components/game-library/GameForm";
import { GameVersionsTable } from "@/components/game-library/GameVersionsTable";
import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/platform/games/$gameId/")(
	{
		beforeLoad: () => {
			if (useAuthStore.getState().role !== "SUPER_ADMIN") {
				throw redirect({ to: "/dashboard" });
			}
		},
		component: GameDetailPage,
		params: {
			parse: (params) => ({ gameId: params.gameId }),
		},
	},
);

function GameDetailPage() {
	const router = useRouter();
	const { gameId } = Route.useParams();
	const [isAddVersionOpen, setIsAddVersionOpen] = useState(false);

	const {
		data: game,
		isLoading,
		error,
	} = useQuery(trpc.game.get.queryOptions({ id: gameId }));

	if (isLoading) {
		return (
			<div className="p-8">
				<Skeleton className="mb-6 h-8 w-48" />
				<div className="grid gap-6 lg:grid-cols-2">
					<Skeleton className="h-96 w-full rounded-xl" />
					<Skeleton className="h-64 w-full rounded-xl" />
				</div>
			</div>
		);
	}

	if (error || !game) {
		return (
			<div className="p-8">
				<button
					type="button"
					onClick={() => router.navigate({ to: "/platform/games" })}
					className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Games
				</button>
				<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
					<Stethoscope className="h-8 w-8" />
					<p className="text-sm">Game not found.</p>
				</div>
			</div>
		);
	}

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/platform/games" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Games
			</button>

			<div className="mb-6 flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="font-semibold text-2xl text-on-surface">
							{game.name}
						</h1>
						<Badge variant="outline">{game.category?.name || "General"}</Badge>
					</div>
					<p className="mt-1 text-on-surface-variant text-sm">
						{game.subCategory ? `${game.subCategory} · ` : ""}
						{game.isGlobal ? "Global" : "Clinic-specific"}
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<div className="space-y-6">
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
						<h2 className="mb-4 font-medium text-lg">Edit Game</h2>
						<GameForm
							gameId={game.id}
							initialValues={{
								name: game.name,
								description: game.description || "",
								categoryId: game.categoryId,
								subCategory: game.subCategory || "",
								targetIssues: game.targetIssues || [],
								difficulty: game.difficulty || "",
								ageRangeMin: game.ageRangeMin ?? undefined,
								ageRangeMax: game.ageRangeMax ?? undefined,
								isGlobal: game.isGlobal,
							}}
							onSuccess={() => {}}
							onCancel={() => router.navigate({ to: "/platform/games" })}
						/>
					</div>
				</div>

				<div className="space-y-6">
					<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
						<GameVersionsTable
							gameId={game.id}
							versions={game.versions || []}
							onAddVersion={() => setIsAddVersionOpen(true)}
						/>
					</div>
					<CreateVersionForm
						gameId={game.id}
						open={isAddVersionOpen}
						onOpenChange={setIsAddVersionOpen}
					/>
				</div>
			</div>
		</div>
	);
}
