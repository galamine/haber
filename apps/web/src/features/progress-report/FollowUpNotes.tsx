import { Card, CardContent } from "@haber-final/ui/components/card";

type Props = { followUps: any[] };

export function FollowUpNotes({ followUps }: Props) {
	const notes = followUps
		.filter((f: any) => f.sectionD?.therapistObservations)
		.map((f: any) => ({
			date: f.createdAt,
			text: String(f.sectionD.therapistObservations),
		}))
		.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

	return (
		<section className="print-avoid-break">
			<h2 className="mb-4 font-medium text-display-xs">Follow-Up Notes</h2>
			<div className="space-y-4">
				{notes.map((note: any, i: number) => (
					<Card key={i}>
						<CardContent className="p-4">
							<div className="mb-2 flex justify-between text-on-surface-variant text-xs">
								<span>
									{note.date ? new Date(note.date).toLocaleDateString() : ""}
								</span>
							</div>
							<p className="text-sm">{note.text}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</section>
	);
}
