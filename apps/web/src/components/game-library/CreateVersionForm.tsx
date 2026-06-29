import { Button } from "@haber-final/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@haber-final/ui/components/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@haber-final/ui/components/form";
import { Input } from "@haber-final/ui/components/input";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { queryClient, trpc } from "@/utils/trpc";

const createVersionSchema = z.object({
	versionNumber: z.string().min(1, "Version number is required"),
	rubricVersion: z.string().min(1, "Rubric version is required"),
	scoringSchema: z.string().default("{}"),
});

type CreateVersionValues = z.infer<typeof createVersionSchema>;

interface CreateVersionFormProps {
	gameId: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	onSuccess?: () => void;
}

export function CreateVersionForm({
	gameId,
	open,
	onOpenChange,
	onSuccess,
}: CreateVersionFormProps) {
	const [internalOpen, setInternalOpen] = useState(false);
	const isControlled = open !== undefined;
	const currentOpen = isControlled ? open : internalOpen;
	const handleOpenChange = isControlled ? onOpenChange! : setInternalOpen;

	const form = useForm<CreateVersionValues>({
		resolver: zodResolver(createVersionSchema),
		defaultValues: {
			versionNumber: "",
			rubricVersion: "",
			scoringSchema: "{}",
		},
	});

	const createVersionMutation = useMutation(
		trpc.game.createVersion.mutationOptions({
			onSuccess: () => {
				toast.success("Version created successfully");
				queryClient.invalidateQueries({ queryKey: ["game.get"] });
				handleOpenChange(false);
				form.reset();
				onSuccess?.();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create version");
			},
		}),
	);

	function onSubmit(values: CreateVersionValues) {
		let scoringSchema: Record<string, unknown> = {};
		try {
			scoringSchema = JSON.parse(values.scoringSchema);
		} catch {
			toast.error("Invalid JSON in scoring schema");
			return;
		}

		createVersionMutation.mutate({
			gameId,
			versionNumber: values.versionNumber,
			rubricVersion: values.rubricVersion,
			scoringSchema,
		});
	}

	return (
		<Dialog open={currentOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					Add Version
				</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add New Version</DialogTitle>
					<DialogDescription>
						Creating a new version will set the previous latest version to
						deprecated.
					</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
						<FormField
							control={form.control}
							name="versionNumber"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Version Number *</FormLabel>
									<FormControl>
										<Input placeholder="e.g. 2.0" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="rubricVersion"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Rubric Version *</FormLabel>
									<FormControl>
										<Input placeholder="e.g. 2" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="scoringSchema"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Scoring Schema (JSON)</FormLabel>
									<FormControl>
										<Textarea
											placeholder='{"accuracy": 85, "responseTime": 1200}'
											rows={3}
											{...(field as React.ComponentProps<"textarea">)}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<DialogFooter>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleOpenChange(false)}
							>
								Cancel
							</Button>
							<Button type="submit" disabled={createVersionMutation.isPending}>
								{createVersionMutation.isPending
									? "Creating..."
									: "Create Version"}
							</Button>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
