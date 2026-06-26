import { Button } from "@haber-final/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";

type GameLibraryBrowserSheetProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSelectGame: (gameVersionId: string) => void;
};

export function GameLibraryBrowserSheet({
	open,
	onOpenChange,
}: GameLibraryBrowserSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent side="right" className="sm:max-w-md">
				<SheetHeader>
					<SheetTitle>Game Library</SheetTitle>
					<SheetDescription>
						Select a game to add to this plan.
					</SheetDescription>
				</SheetHeader>
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<span className="material-symbols-outlined mb-4 text-4xl text-on-surface-variant">
						videogame_asset_off
					</span>
					<p className="text-on-surface-variant text-sm">
						Game library browsing coming soon.
					</p>
					<p className="mt-1 text-on-surface-variant text-xs">
						Contact your administrator to add games to plans.
					</p>
				</div>
				<div className="mt-auto flex flex-col gap-2">
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
				</div>
			</SheetContent>
		</Sheet>
	);
}
