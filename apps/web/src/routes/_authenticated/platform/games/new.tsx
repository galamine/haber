import { Button } from "@haber-final/ui/components/button";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { GameForm } from "@/components/game-library/GameForm";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated/platform/games/new")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "SUPER_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: NewGamePage,
});

function NewGamePage() {
	const router = useRouter();

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

			<div className="mb-6">
				<h1 className="font-semibold text-2xl text-on-surface">Add New Game</h1>
				<p className="mt-1 text-on-surface-variant text-sm">
					Create a new global game for the platform
				</p>
			</div>

			<div className="max-w-2xl">
				<div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
					<GameForm
						onSuccess={() => {
							router.navigate({ to: "/platform/games" });
						}}
						onCancel={() => {
							router.navigate({ to: "/platform/games" });
						}}
					/>
				</div>
			</div>
		</div>
	);
}
