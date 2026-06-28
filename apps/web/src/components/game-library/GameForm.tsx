import { CreateGameInput } from "@haber-final/api/schemas/game";
import { Button } from "@haber-final/ui/components/button";
import { Checkbox } from "@haber-final/ui/components/checkbox";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@haber-final/ui/components/form";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Textarea } from "@haber-final/ui/components/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { trpc } from "@/utils/trpc";
import { DIFFICULTY_LEVELS, TARGET_ISSUES } from "./constants";

export const gameFormSchema = CreateGameInput.omit({
	isGlobal: true,
	clinicIds: true,
}).extend({
	isGlobal: z.boolean().default(true),
	clinicIds: z.array(z.string()).default([]),
	initialVersionNumber: z.string().default("1"),
	initialRubricVersion: z.string().default("1"),
	initialScoringSchema: z.string().default("{}"),
});

export type GameFormValues = z.infer<typeof gameFormSchema>;

interface GameFormProps {
	gameId?: string;
	initialValues?: Partial<GameFormValues>;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function GameForm({
	gameId,
	initialValues,
	onSuccess,
	onCancel,
}: GameFormProps) {
	const [selectedDifficulty, setSelectedDifficulty] = useState(
		initialValues?.difficulty || "",
	);

	const { data: categories } = useQuery(
		trpc.game.listCategories.queryOptions(),
	);
	const { data: clinics } = useQuery(
		trpc.clinic.list.queryOptions({ pageSize: 100 }),
	);

	const form = useForm<GameFormValues>({
		resolver: zodResolver(gameFormSchema),
		defaultValues: {
			name: initialValues?.name || "",
			description: initialValues?.description || "",
			categoryId: initialValues?.categoryId || "",
			subCategory: initialValues?.subCategory || "",
			targetIssues: initialValues?.targetIssues || [],
			difficulty: initialValues?.difficulty || "",
			ageRangeMin: initialValues?.ageRangeMin,
			ageRangeMax: initialValues?.ageRangeMax,
			isGlobal: initialValues?.isGlobal ?? true,
			clinicIds: initialValues?.clinicIds || [],
			initialVersionNumber: initialValues?.initialVersionNumber || "1",
			initialRubricVersion: initialValues?.initialRubricVersion || "1",
			initialScoringSchema: initialValues?.initialScoringSchema || "{}",
		},
	});

	const isGlobal = form.watch("isGlobal");

	const createMutation = useMutation(
		trpc.game.create.mutationOptions({
			onSuccess: () => {
				toast.success("Game created successfully");
				form.reset();
				onSuccess?.();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to create game");
			},
		}),
	);

	const updateMutation = useMutation(
		trpc.game.update.mutationOptions({
			onSuccess: () => {
				toast.success("Game updated successfully");
				onSuccess?.();
			},
			onError: (error) => {
				toast.error(error.message || "Failed to update game");
			},
		}),
	);

	const isPending = createMutation.isPending || updateMutation.isPending;

	function onSubmit(values: GameFormValues) {
		if (gameId) {
			updateMutation.mutate({
				id: gameId,
				name: values.name,
				description: values.description,
				categoryId: values.categoryId,
				subCategory: values.subCategory,
				targetIssues: values.targetIssues,
				difficulty: values.difficulty,
				ageRangeMin: values.ageRangeMin,
				ageRangeMax: values.ageRangeMax,
				isGlobal: values.isGlobal,
				clinicIds: values.isGlobal ? undefined : values.clinicIds,
			});
		} else {
			createMutation.mutate({
				name: values.name,
				description: values.description,
				categoryId: values.categoryId,
				subCategory: values.subCategory,
				targetIssues: values.targetIssues,
				difficulty: values.difficulty,
				ageRangeMin: values.ageRangeMin,
				ageRangeMax: values.ageRangeMax,
				isGlobal: values.isGlobal,
				clinicIds: values.isGlobal ? undefined : values.clinicIds,
			});
		}
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
				<FormField
					control={form.control}
					name="name"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Game Name *</FormLabel>
							<FormControl>
								<Input placeholder="e.g. Pattern Recog" {...field} />
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Description</FormLabel>
							<FormControl>
								<Textarea
									placeholder="Describe the game and its therapeutic benefits..."
									rows={4}
									{...(field as React.ComponentProps<"textarea">)}
								/>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="categoryId"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Category *</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select category" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										{categories?.map((cat) => (
											<SelectItem key={cat.id} value={cat.id}>
												{cat.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="subCategory"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Sub-category</FormLabel>
								<FormControl>
									<Input placeholder="e.g. Memory" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="difficulty"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Difficulty Level</FormLabel>
							<FormControl>
								<div className="flex gap-2">
									{DIFFICULTY_LEVELS.map((level) => (
										<button
											key={level}
											type="button"
											onClick={() => {
												setSelectedDifficulty(level);
												field.onChange(level);
											}}
											className={`h-10 w-10 rounded-lg border font-medium text-sm transition-colors ${
												selectedDifficulty === level
													? "border-primary bg-primary text-primary-foreground"
													: "border-input bg-background hover:bg-muted"
											}`}
										>
											{level}
										</button>
									))}
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid grid-cols-2 gap-4">
					<FormField
						control={form.control}
						name="ageRangeMin"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Min Age</FormLabel>
								<FormControl>
									<Input
										type="number"
										min={0}
										placeholder="3"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? Number.parseInt(e.target.value)
													: undefined,
											)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="ageRangeMax"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Max Age</FormLabel>
								<FormControl>
									<Input
										type="number"
										min={0}
										placeholder="18"
										{...field}
										onChange={(e) =>
											field.onChange(
												e.target.value
													? Number.parseInt(e.target.value)
													: undefined,
											)
										}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="targetIssues"
					render={() => (
						<FormItem>
							<div className="mb-2">
								<FormLabel>Target Issues</FormLabel>
							</div>
							<div className="grid grid-cols-2 gap-2">
								{TARGET_ISSUES.map((issue) => (
									<FormField
										key={issue}
										control={form.control}
										name="targetIssues"
										render={({ field }) => (
											<FormItem className="flex flex-row items-start space-x-3 space-y-0">
												<FormControl>
													<Checkbox
														checked={field.value?.includes(issue)}
														onCheckedChange={(checked) => {
															const current = field.value || [];
															if (checked) {
																field.onChange([...current, issue]);
															} else {
																field.onChange(
																	current.filter((v) => v !== issue),
																);
															}
														}}
													/>
												</FormControl>
												<FormLabel className="cursor-pointer font-normal">
													{issue}
												</FormLabel>
											</FormItem>
										)}
									/>
								))}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="isGlobal"
					render={({ field }) => (
						<FormItem className="flex flex-row items-start space-x-3 space-y-0">
							<FormControl>
								<Checkbox
									checked={field.value}
									onCheckedChange={field.onChange}
								/>
							</FormControl>
							<div className="space-y-1 leading-none">
								<FormLabel>Global Game</FormLabel>
								<FormDescription>
									Global games are available to all clinics. Non-global games
									are clinic-specific.
								</FormDescription>
							</div>
						</FormItem>
					)}
				/>

				{!isGlobal && (
					<FormField
						control={form.control}
						name="clinicIds"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Assign to Clinics</FormLabel>
								<FormDescription>
									Select which clinics can access this game
								</FormDescription>
								<div className="mt-2 max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
									{clinics?.items?.map((clinic) => (
										<div
											key={clinic.id}
											className="flex items-center space-x-2"
										>
											<Checkbox
												id={`clinic-${clinic.id}`}
												checked={field.value?.includes(clinic.id)}
												onCheckedChange={(checked) => {
													const current = field.value || [];
													if (checked) {
														field.onChange([...current, clinic.id]);
													} else {
														field.onChange(
															current.filter((id) => id !== clinic.id),
														);
													}
												}}
											/>
											<Label
												htmlFor={`clinic-${clinic.id}`}
												className="cursor-pointer font-normal text-sm"
											>
												{clinic.name}
											</Label>
										</div>
									))}
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				)}

				{!gameId && (
					<div className="rounded-lg border border-outline border-dashed p-4">
						<h4 className="mb-3 font-medium text-sm">Initial Version</h4>
						<div className="grid grid-cols-3 gap-4">
							<FormField
								control={form.control}
								name="initialVersionNumber"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Version</FormLabel>
										<FormControl>
											<Input placeholder="1.0" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="initialRubricVersion"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Rubric Version</FormLabel>
										<FormControl>
											<Input placeholder="1" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="initialScoringSchema"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Scoring Schema (JSON)</FormLabel>
										<FormControl>
											<Input placeholder="{}" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					</div>
				)}

				<div className="flex gap-3">
					{onCancel && (
						<Button
							type="button"
							variant="outline"
							onClick={onCancel}
							disabled={isPending}
						>
							Cancel
						</Button>
					)}
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : gameId ? "Update Game" : "Create Game"}
					</Button>
				</div>
			</form>
		</Form>
	);
}
