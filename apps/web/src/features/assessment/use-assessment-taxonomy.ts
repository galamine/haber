import { useQuery } from "@tanstack/react-query";

import { trpc } from "@/utils/trpc";

export function useAssessmentTaxonomy() {
	const diagnoses = useQuery(trpc.taxonomy.listDiagnoses.queryOptions());
	const sensorySystems = useQuery(
		trpc.taxonomy.listSensorySystems.queryOptions(),
	);
	const functionalConcerns = useQuery(
		trpc.taxonomy.listFunctionalConcerns.queryOptions(),
	);
	const assessmentTools = useQuery(
		trpc.taxonomy.listAssessmentTools.queryOptions(),
	);
	const equipment = useQuery(trpc.taxonomy.listEquipment.queryOptions());
	const milestones = useQuery(trpc.milestone.list.queryOptions());
	const therapistMe = useQuery(trpc.auth.me.queryOptions());

	const isLoading = [
		diagnoses,
		sensorySystems,
		functionalConcerns,
		assessmentTools,
		equipment,
		milestones,
		therapistMe,
	].some((q) => q.isLoading);

	return {
		diagnoses,
		sensorySystems,
		functionalConcerns,
		assessmentTools,
		equipment,
		milestones,
		therapistMe,
		isLoading,
	};
}
