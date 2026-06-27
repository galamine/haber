import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function usePlanData({
	childId,
	planId,
}: {
	childId: string;
	planId?: string;
}) {
	const child = useQuery(trpc.child.get.queryOptions({ childId }));
	const plans = useQuery(trpc.plan.list.queryOptions({ childId }));
	const presets = useQuery(trpc.plan.listPresets.queryOptions());
	const activePlans = useQuery(trpc.plan.listActive.queryOptions({ childId }));

	const plan = useQuery(
		planId
			? trpc.plan.get.queryOptions({ planId })
			: { queryKey: ["unused"], queryFn: () => null },
		{ enabled: !!planId },
	);

	const sessionDuration = useQuery(
		planId
			? trpc.plan.checkSessionDuration.queryOptions({ planId })
			: { queryKey: ["unused"], queryFn: () => null },
		{ enabled: !!planId },
	);

	const goals = useQuery({
		...(planId
			? trpc.goal.list.queryOptions({ treatmentPlanId: planId })
			: { queryKey: ["unused"], queryFn: () => null }),
		enabled: !!planId,
	});

	const isLoading = [
		child,
		plans,
		presets,
		activePlans,
		plan,
		sessionDuration,
		goals,
	].some((q) => q.isLoading);

	return {
		child,
		plans,
		presets,
		activePlans,
		plan,
		sessionDuration,
		goals,
		isLoading,
	};
}
