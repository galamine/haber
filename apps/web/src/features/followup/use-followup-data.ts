import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useFollowUpData({ childId }: { childId: string }) {
	const therapistMe = useQuery(trpc.auth.me.queryOptions());
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
		initialAssessment,
		followUps,
		activePlan,
		equipment,
		sensorySystems,
	].some((q) => q.isLoading);

	return {
		therapistMe,
		initialAssessment,
		followUps,
		activePlan,
		equipment,
		sensorySystems,
		isLoading,
	};
}
