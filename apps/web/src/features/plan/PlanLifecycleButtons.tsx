import { Button } from "@haber-final/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@haber-final/ui/components/dropdown-menu";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

type PlanLifecycleButtonsProps = {
	plan: { id: string; status: string };
	onModify?: () => void;
};

export function PlanLifecycleButtons({
	plan,
	onModify,
}: PlanLifecycleButtonsProps) {
	const queryClient = useQueryClient();

	const activate = useMutation(
		trpc.plan.activate.mutationOptions({
			onSuccess: () => {
				toast.success("Plan activated");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const pause = useMutation(
		trpc.plan.pause.mutationOptions({
			onSuccess: () => {
				toast.success("Plan paused");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const resume = useMutation(
		trpc.plan.resume.mutationOptions({
			onSuccess: () => {
				toast.success("Plan resumed");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const close = useMutation(
		trpc.plan.close.mutationOptions({
			onSuccess: () => {
				toast.success("Plan closed");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	const extend = useMutation(
		trpc.plan.extend.mutationOptions({
			onSuccess: () => {
				toast.success("Plan extended");
				queryClient.invalidateQueries({
					queryKey: trpc.plan.get.queryOptions({ planId: plan.id }).queryKey,
				});
			},
			onError: (err) => toast.error(err.message),
		}),
	);

	if (plan.status === "CLOSED") return null;

	return (
		<div className="flex flex-wrap gap-2">
			{plan.status === "DRAFT" && (
				<Button onClick={() => activate.mutate({ planId: plan.id })}>
					Activate
				</Button>
			)}
			{plan.status === "ACTIVE" && (
				<>
					<Button
						variant="outline"
						onClick={() => pause.mutate({ planId: plan.id })}
					>
						Pause
					</Button>
					<Button variant="outline" onClick={onModify}>
						Modify Plan
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">Extend</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							{[4, 6, 8, 12].map((w) => (
								<DropdownMenuItem
									key={w}
									onClick={() =>
										extend.mutate({ planId: plan.id, programLengthWeeks: w })
									}
								>
									{w} weeks
								</DropdownMenuItem>
							))}
						</DropdownMenuContent>
					</DropdownMenu>
					<Button
						variant="destructive"
						onClick={() =>
							close.mutate({
								planId: plan.id,
								closureReason: "",
								outcomeSummary: "",
							})
						}
					>
						Close
					</Button>
				</>
			)}
			{plan.status === "PAUSED" && (
				<>
					<Button onClick={() => resume.mutate({ planId: plan.id })}>
						Resume
					</Button>
					<Button
						variant="destructive"
						onClick={() =>
							close.mutate({
								planId: plan.id,
								closureReason: "",
								outcomeSummary: "",
							})
						}
					>
						Close
					</Button>
				</>
			)}
		</div>
	);
}
