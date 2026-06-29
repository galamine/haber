import { Badge } from "@haber-final/ui/components/badge";
import { Button } from "@haber-final/ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import type { GameVersion } from "@prisma/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { queryClient, trpc } from "@/utils/trpc";

interface GameVersionsTableProps {
	gameId: string;
	versions: GameVersion[];
	onAddVersion?: () => void;
}

export function GameVersionsTable({
	gameId,
	versions,
	onAddVersion,
}: GameVersionsTableProps) {
	const deprecateMutation = useMutation(
		trpc.game.deprecate.mutationOptions({
			onSuccess: () => {
				toast.success("Version deprecated successfully");
				queryClient.invalidateQueries({ queryKey: ["game.get"] });
			},
			onError: (error) => {
				toast.error(error.message || "Failed to deprecate version");
			},
		}),
	);

	const handleDeprecate = () => {
		if (confirm("Are you sure you want to deprecate this version?")) {
			deprecateMutation.mutate({ gameId });
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<h3 className="font-medium text-lg">Version History</h3>
				{onAddVersion && (
					<Button onClick={onAddVersion} size="sm">
						Add New Version
					</Button>
				)}
			</div>

			<div className="rounded-lg border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Version</TableHead>
							<TableHead>Rubric Version</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{versions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={5} className="py-8 text-center">
									No versions found.
								</TableCell>
							</TableRow>
						) : (
							versions.map((version) => (
								<TableRow key={version.id}>
									<TableCell className="font-medium">
										v{version.versionNumber}
									</TableCell>
									<TableCell>{version.rubricVersion}</TableCell>
									<TableCell>
										{version.isLatest ? (
											<Badge className="bg-green-100 text-green-800">
												Latest
											</Badge>
										) : (
											<Badge variant="secondary">Deprecated</Badge>
										)}
									</TableCell>
									<TableCell>
										{new Date(version.createdAt).toLocaleDateString("en-US", {
											year: "numeric",
											month: "short",
											day: "numeric",
										})}
									</TableCell>
									<TableCell className="text-right">
										{version.isLatest && (
											<Button
												variant="outline"
												size="sm"
												onClick={handleDeprecate}
												disabled={deprecateMutation.isPending}
											>
												Deprecate
											</Button>
										)}
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
