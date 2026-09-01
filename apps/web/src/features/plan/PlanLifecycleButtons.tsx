import { Button } from "@haber-final/ui/components/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

type PlanLifecycleButtonsProps = {
	plan: { id: string; status: string };
};

export function PlanLifecycleButtons({ plan }: PlanLifecycleButtonsProps) {
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

	if (plan.status === "CLOSED") return null;

	return (
		<div className="flex flex-wrap gap-2">
			{plan.status === "DRAFT" && (
				<Button onClick={() => activate.mutate({ planId: plan.id })}>
					Activate
				</Button>
			)}
			{plan.status === "ACTIVE" && (
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
			)}
		</div>
	);
}
