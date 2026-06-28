import { Button } from "@haber-final/ui/components/button";
import { Checkbox } from "@haber-final/ui/components/checkbox";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Slider } from "@haber-final/ui/components/slider";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { DIFFICULTY_LEVELS, TARGET_ISSUES } from "./constants";

export interface GameLibraryFilters {
	search?: string;
	categoryId?: string;
	difficulty?: string;
	ageRangeMin?: number;
	ageRangeMax?: number;
	targetIssues?: string[];
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

	const handleTargetIssueChange = (issue: string, checked: boolean) => {
		const current = filters.targetIssues || [];
		const next = checked
			? [...current, issue]
			: current.filter((i) => i !== issue);
		onChange({ ...filters, targetIssues: next });
	};

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

			{/* Difficulty */}
			<div>
				<Label className="mb-2 block">Difficulty Level</Label>
				<div className="flex flex-wrap gap-2">
					{DIFFICULTY_LEVELS.map((diff) => (
						<Button
							key={diff}
							variant={filters.difficulty === diff ? "default" : "outline"}
							size="sm"
							onClick={() =>
								onChange({
									...filters,
									difficulty: filters.difficulty === diff ? undefined : diff,
								})
							}
						>
							Level {diff}
						</Button>
					))}
				</div>
			</div>

			{/* Age Range */}
			<div>
				<div className="mb-2 flex items-center justify-between">
					<Label>Age Range</Label>
					<span className="text-muted-foreground text-sm">
						{filters.ageRangeMin || 3} - {filters.ageRangeMax || 100} yrs
					</span>
				</div>
				<Slider
					min={3}
					max={100}
					step={1}
					value={[filters.ageRangeMin || 3, filters.ageRangeMax || 100]}
					onValueChange={([min, max]) =>
						onChange({ ...filters, ageRangeMin: min, ageRangeMax: max })
					}
				/>
			</div>

			{/* Target Issues */}
			<div>
				<Label className="mb-2 block">Target Issues</Label>
				<div className="space-y-2">
					{TARGET_ISSUES.map((issue) => (
						<div key={issue} className="flex items-center space-x-2">
							<Checkbox
								id={`issue-${issue}`}
								checked={(filters.targetIssues || []).includes(issue)}
								onCheckedChange={(checked) =>
									handleTargetIssueChange(issue, checked as boolean)
								}
							/>
							<Label
								htmlFor={`issue-${issue}`}
								className="cursor-pointer font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{issue}
							</Label>
						</div>
					))}
				</div>
			</div>

			<Button
				variant="outline"
				className="w-full"
				onClick={() =>
					onChange({
						search: "",
						categoryId: undefined,
						difficulty: undefined,
						ageRangeMin: undefined,
						ageRangeMax: undefined,
						targetIssues: undefined,
					})
				}
			>
				Clear Filters
			</Button>
		</div>
	);
}
