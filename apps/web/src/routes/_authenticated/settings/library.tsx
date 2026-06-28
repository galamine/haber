import { createFileRoute, redirect } from "@tanstack/react-router";
import { ClinicLibrarySettingsTable } from "@/components/game-library/ClinicLibrarySettingsTable";
import { CreateSubCategoryForm } from "@/components/game-library/CreateSubCategoryForm";
import { useAuthStore } from "@/stores/auth";

export const Route = createFileRoute("/_authenticated/settings/library")({
	beforeLoad: () => {
		const { role } = useAuthStore.getState();
		if (role !== "CLINIC_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SettingsLibraryPage,
});

function SettingsLibraryPage() {
	return (
		<div className="mx-auto max-w-6xl space-y-8 p-8">
			<div className="flex items-start justify-between">
				<div>
					<h1 className="font-bold text-2xl">Game Library Settings</h1>
					<p className="mt-1 text-muted-foreground">
						Manage which games are available to therapists in your clinic, and
						create custom sub-categories.
					</p>
				</div>
				<CreateSubCategoryForm />
			</div>

			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<ClinicLibrarySettingsTable />
			</div>
		</div>
	);
}
