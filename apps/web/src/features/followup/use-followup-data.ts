import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useFollowUpData({ childId }: { childId: string }) {
	const therapistMe = useQuery(trpc.auth.me.queryOptions());
	const child = useQuery(trpc.child.get.queryOptions({ childId }));
	const initialAssessment = useQuery({
		...trpc.assessment.get.queryOptions({ childId }),
		retry: false,
		meta: { suppressErrorToast: true },
	});
	const followUps = useQuery(
		trpc.assessment.listFollowUps.queryOptions({ childId }),
	);
	const activePlan = useQuery(
		trpc.assessment.getActivePlan.queryOptions({ childId }),
	);
	const equipment = useQuery(trpc.taxonomy.listEquipment.queryOptions());
	const sensorySystems = useQuery(
		trpc.taxonomy.listSensorySystems.queryOptions(),
	);

	const isLoading = [
		therapistMe,
		child,
		initialAssessment,
		followUps,
		activePlan,
		equipment,
		sensorySystems,
	].some((q) => q.isLoading);

	return {
		therapistMe,
		child,
		initialAssessment,
		followUps,
		activePlan,
		equipment,
		sensorySystems,
		isLoading,
	};
}
