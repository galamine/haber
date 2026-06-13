import { Button } from "@haber-final/ui/components/button";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import {
	CheckCircle,
	DoorOpen,
	Package,
	Pencil,
	Plus,
	Power,
	Wrench,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/_authenticated/settings/rooms/")({
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
	const router = useRouter();
	const queryClient = useQueryClient();

	const { data: rawRooms, isLoading } = useQuery(
		trpc.clinic.listSensoryRooms.queryOptions(),
	);
	const rooms = rawRooms as SensoryRoom[] | undefined;

	const toggleMutation = useMutation(
		trpc.clinic.toggleRoomStatus.mutationOptions(),
	);

	return (
		<div className="p-8">
			<div className="mb-6 flex items-center justify-between">
				<h1 className="font-semibold text-2xl text-on-surface">
					Sensory Rooms
				</h1>
				<Button onClick={() => router.navigate({ to: "/settings/rooms/new" })}>
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
							onEdit={() =>
								router.navigate({
									to: "/settings/rooms/$roomId",
									params: { roomId: room.id },
								})
							}
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
		</div>
	);
}
