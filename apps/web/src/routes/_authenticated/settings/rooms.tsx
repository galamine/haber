import { Button } from "@haber-final/ui/components/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@haber-final/ui/components/form";
import { Input } from "@haber-final/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@haber-final/ui/components/sheet";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
	CheckCircle,
	DoorOpen,
	Package,
	Pencil,
	Plus,
	Power,
	Wrench,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/rooms")({
	beforeLoad: () => {
		if (useAuthStore.getState().role !== "CLINIC_ADMIN") {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: SensoryRoomsPage,
});

type SensoryRoom = {
	id: string;
	code: string;
	name: string;
	status: "ACTIVE" | "MAINTENANCE";
	equipmentList: unknown;
};

// Single form schema that covers both create and edit (id is optional for create)
const RoomFormSchema = z.object({
	id: z.string().optional(),
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),
	equipmentList: z.array(z.string()).default([]),
});

type RoomFormValues = z.infer<typeof RoomFormSchema>;

function RoomStatusBadge({ status }: { status: "ACTIVE" | "MAINTENANCE" }) {
	if (status === "ACTIVE") {
		return (
			<span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 font-medium text-green-700 text-xs">
				<CheckCircle className="h-3 w-3" />
				Active
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-700 text-xs">
			<Wrench className="h-3 w-3" />
			Maintenance
		</span>
	);
}

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

function RoomFormSheet({
	open,
	onOpenChange,
	initial,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initial?: SensoryRoom;
}) {
	const queryClient = useQueryClient();
	const isEdit = Boolean(initial);

	const form = useForm<RoomFormValues>({
		resolver: zodResolver(RoomFormSchema) as never,
		defaultValues: {
			id: initial?.id,
			code: initial?.code ?? "",
			name: initial?.name ?? "",
			status: (initial?.status ?? "ACTIVE") as "ACTIVE" | "MAINTENANCE",
			equipmentList: (initial?.equipmentList as string[]) ?? [],
		},
	});

	useEffect(() => {
		form.reset({
			id: initial?.id,
			code: initial?.code ?? "",
			name: initial?.name ?? "",
			status: (initial?.status ?? "ACTIVE") as "ACTIVE" | "MAINTENANCE",
			equipmentList: (initial?.equipmentList as string[]) ?? [],
		});
	}, [initial, form]);

	const createMutation = useMutation(
		trpc.clinic.createSensoryRoom.mutationOptions(),
	);
	const updateMutation = useMutation(
		trpc.clinic.updateSensoryRoom.mutationOptions(),
	);

	const isPending = createMutation.isPending || updateMutation.isPending;

	async function onSubmit(values: RoomFormValues) {
		try {
			if (isEdit && values.id) {
				const { id, ...rest } = values;
				await updateMutation.mutateAsync({ id, ...rest });
			} else {
				await createMutation.mutateAsync({
					code: values.code,
					name: values.name,
					status: values.status,
					equipmentList: values.equipmentList,
				});
			}
			toast.success(isEdit ? "Room updated" : "Room created");
			onOpenChange(false);
			queryClient.invalidateQueries({
				queryKey: trpc.clinic.listSensoryRooms.queryOptions().queryKey,
			});
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		}
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>{isEdit ? "Edit Room" : "Add Room"}</SheetTitle>
				</SheetHeader>

				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="mt-4 flex flex-col gap-4"
					>
						<FormField
							control={form.control}
							name="code"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Room Code</FormLabel>
									<FormControl>
										<Input placeholder="e.g. RM-101" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Room Name</FormLabel>
									<FormControl>
										<Input
											placeholder="e.g. Sensory Integration Room"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="status"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Status</FormLabel>
									<FormControl>
										<Select value={field.value} onValueChange={field.onChange}>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												<SelectItem value="ACTIVE">Active</SelectItem>
												<SelectItem value="MAINTENANCE">Maintenance</SelectItem>
											</SelectContent>
										</Select>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="equipmentList"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Equipment</FormLabel>
									<FormControl>
										<EquipmentTagInput
											value={field.value ?? []}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" disabled={isPending} className="mt-2">
							{isEdit ? "Save Changes" : "Create Room"}
						</Button>
					</form>
				</Form>
			</SheetContent>
		</Sheet>
	);
}

function RoomCard({
	room,
	onEdit,
	onToggle,
}: {
	room: SensoryRoom;
	onEdit: () => void;
	onToggle: () => void;
}) {
	const equipment = Array.isArray(room.equipmentList)
		? (room.equipmentList as string[])
		: [];

	return (
		<div className="rounded-xl border border-outline-variant bg-surface p-6 transition-shadow hover:shadow-md">
			<div className="mb-3 flex items-start justify-between">
				<div>
					<span className="mb-1 inline-block rounded bg-primary-container px-2 py-1 font-mono text-on-primary-container text-xs">
						{room.code}
					</span>
					<h3 className="font-medium text-on-surface">{room.name}</h3>
				</div>
				<RoomStatusBadge status={room.status} />
			</div>

			{equipment.length > 0 && (
				<ul className="mb-4 flex flex-col gap-1">
					{equipment.map((item) => (
						<li
							key={item}
							className="flex items-center gap-1.5 text-on-surface-variant text-xs"
						>
							<Package className="h-3 w-3 shrink-0" />
							{item}
						</li>
					))}
				</ul>
			)}

			<div className="flex items-center gap-2 border-outline-variant border-t pt-4">
				<Button size="icon-sm" variant="ghost" onClick={onEdit}>
					<Pencil className="h-3.5 w-3.5" />
				</Button>
				<Button size="icon-sm" variant="ghost" onClick={onToggle}>
					<Power className="h-3.5 w-3.5" />
				</Button>
			</div>
		</div>
	);
}

function SensoryRoomsPage() {
	const queryClient = useQueryClient();
	const [sheetOpen, setSheetOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<SensoryRoom | null>(null);

	const { data: rawRooms, isLoading } = useQuery(
		trpc.clinic.listSensoryRooms.queryOptions(),
	);
	const rooms = rawRooms as SensoryRoom[] | undefined;

	const toggleMutation = useMutation(
		trpc.clinic.toggleRoomStatus.mutationOptions(),
	);

	function openCreate() {
		setEditTarget(null);
		setSheetOpen(true);
	}

	function openEdit(room: SensoryRoom) {
		setEditTarget(room);
		setSheetOpen(true);
	}

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">
					Sensory Rooms
				</h1>
				<Button onClick={openCreate}>
					<Plus className="h-4 w-4" />
					Add Room
				</Button>
			</div>

			{isLoading ? (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<Skeleton key={i} className="h-48 rounded-xl" />
					))}
				</div>
			) : !rooms?.length ? (
				<div className="flex flex-col items-center justify-center gap-3 py-16 text-on-surface-variant">
					<DoorOpen className="h-8 w-8" />
					<p className="text-sm">No sensory rooms configured yet.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
					{rooms.map((room) => (
						<RoomCard
							key={room.id}
							room={room}
							onEdit={() => openEdit(room)}
							onToggle={() =>
								toggleMutation.mutate(
									{ id: room.id },
									{
										onSuccess: () =>
											queryClient.invalidateQueries({
												queryKey:
													trpc.clinic.listSensoryRooms.queryOptions().queryKey,
											}),
										onError: (err) => toast.error(err.message),
									},
								)
							}
						/>
					))}
				</div>
			)}

			<RoomFormSheet
				open={sheetOpen}
				onOpenChange={(o) => {
					setSheetOpen(o);
					if (!o) setEditTarget(null);
				}}
				initial={editTarget ?? undefined}
			/>
		</div>
	);
}
