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
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/rooms/new")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: NewRoomPage,
});

const RoomFormSchema = z.object({
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),
	equipmentList: z.array(z.string()).default([]),
});

type RoomFormValues = z.infer<typeof RoomFormSchema>;

function EquipmentTagInput({
	value,
	onChange,
}: {
	value: string[];
	onChange: (v: string[]) => void;
}) {
	const [input, setInput] = useState("");

	function add() {
		const trimmed = input.trim();
		if (trimmed && !value.includes(trimmed)) {
			onChange([...value, trimmed]);
		}
		setInput("");
	}

	return (
		<div className="flex flex-col gap-2">
			<div className="flex gap-2">
				<Input
					value={input}
					onChange={(e) => setInput((e.target as HTMLInputElement).value)}
					onKeyDown={(e) => {
						if (e.key === "Enter") {
							e.preventDefault();
							add();
						}
					}}
					placeholder="Add equipment and press Enter"
				/>
				<Button type="button" variant="outline" size="sm" onClick={add}>
					<Plus className="h-3.5 w-3.5" />
				</Button>
			</div>
			<div className="flex flex-wrap gap-1.5">
				{value.map((item) => (
					<span
						key={item}
						className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs"
					>
						{item}
						<button
							type="button"
							onClick={() => onChange(value.filter((v) => v !== item))}
						>
							<X className="h-3 w-3" />
						</button>
					</span>
				))}
			</div>
		</div>
	);
}

function NewRoomPage() {
	const router = useRouter();
	const queryClient = useQueryClient();

	const {
		register,
		handleSubmit,
		control,
		formState: { errors },
	} = useForm<RoomFormValues>({
		resolver: zodResolver(RoomFormSchema) as never,
		defaultValues: {
			code: "",
			name: "",
			status: "ACTIVE",
			equipmentList: [],
		},
	});

	const mutation = useMutation(
		// @ts-expect-error TS2589 -- TanStack Router route tree type recursion
		trpc.clinic.createSensoryRoom.mutationOptions({
			onSuccess: () => {
				toast.success("Room created");
				queryClient.invalidateQueries({
					queryKey: trpc.clinic.listSensoryRooms.queryOptions().queryKey,
				});
				router.navigate({ to: "/settings/rooms" });
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	function onSubmit(values: RoomFormValues) {
		mutation.mutate({
			code: values.code,
			name: values.name,
			status: values.status,
			equipmentList: values.equipmentList,
		});
	}

	return (
		<div className="p-8">
			<button
				type="button"
				onClick={() => router.navigate({ to: "/settings/rooms" })}
				className="mb-6 flex items-center gap-1.5 text-on-surface-variant text-sm hover:text-on-surface"
			>
				<ArrowLeft className="h-4 w-4" />
				Back to Rooms
			</button>

			<h1 className="mb-6 font-semibold text-2xl text-on-surface">Add Room</h1>

			<div className="max-w-lg">
				<form onSubmit={handleSubmit(onSubmit)}>
					<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
						<div className="space-y-6 p-6">
							<div>
								<Label htmlFor="code">Room Code</Label>
								<Input
									id="code"
									placeholder="e.g. RM-101"
									className={
										errors.code ? "border-red-500 focus:ring-red-500" : ""
									}
									{...register("code")}
								/>
								{errors.code && (
									<p className="mt-1 text-red-600 text-xs">
										{errors.code.message}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="name">Room Name</Label>
								<Input
									id="name"
									placeholder="e.g. Sensory Integration Room"
									className={
										errors.name ? "border-red-500 focus:ring-red-500" : ""
									}
									{...register("name")}
								/>
								{errors.name && (
									<p className="mt-1 text-red-600 text-xs">
										{errors.name.message}
									</p>
								)}
							</div>

							<div>
								<Label htmlFor="status">Status</Label>
								<Controller
									control={control}
									name="status"
									render={({ field }) => (
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger id="status">
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACTIVE">Active</SelectItem>
												<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
											</SelectContent>
										</Select>
									)}
								/>
							</div>

							<div>
								<Label>Equipment</Label>
								<Controller
									control={control}
									name="equipmentList"
									render={({ field }) => (
										<EquipmentTagInput
											value={field.value ?? []}
											onChange={field.onChange}
										/>
									)}
								/>
							</div>
						</div>

						<div className="flex gap-3 border-outline-variant border-t px-6 py-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => router.navigate({ to: "/settings/rooms" })}
							>
								Cancel
							</Button>
							<Button
								size="lg"
								type="submit"
								disabled={mutation.isPending}
								className="w-full"
							>
								{mutation.isPending ? "Creating…" : "Create Room"}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
