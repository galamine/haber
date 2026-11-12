import { Button } from "@haber-final/ui/components/button";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export interface GameLibraryFilters {
	search?: string;
	categoryId?: string;
}

interface GameLibrarySidebarProps {
	filters: GameLibraryFilters;
	onChange: (filters: GameLibraryFilters) => void;
}

export function GameLibrarySidebar({
	filters,
	onChange,
}: GameLibrarySidebarProps) {
	const { data: categories } = useQuery(
		trpc.game.listCategories.queryOptions(),
	);

	return (
		<div className="w-full max-w-xs space-y-6">
			{/* Search */}
			<div>
				<Label htmlFor="search" className="mb-2 block">
					Search Games
				</Label>
				<Input
					id="search"
					placeholder="Search..."
					value={filters.search || ""}
					onChange={(e) => onChange({ ...filters, search: e.target.value })}
				/>
			</div>

			{/* Category */}
			<div>
				<Label htmlFor="category" className="mb-2 block">
					Category
				</Label>
				<Select
					value={filters.categoryId || "all"}
					onValueChange={(val) =>
						onChange({
							...filters,
							categoryId: val === "all" ? undefined : val,
						})
					}
				>
					<SelectTrigger id="category">
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

			<Button
				variant="outline"
				className="w-full"
				onClick={() =>
					onChange({
						search: "",
						categoryId: undefined,
					})
				}
			>
				Clear Filters
			</Button>
		</div>
	);
}
