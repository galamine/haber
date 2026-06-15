import type { ReactNode } from "react";

export function SectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm">
			<div className="border-outline-variant border-b px-6 py-4">
				<h2 className="font-semibold text-on-surface text-xl">{title}</h2>
				{description && (
					<p className="mt-1 text-on-surface-variant text-sm">{description}</p>
				)}
			</div>
			<div className="grid grid-cols-1 gap-x-6 gap-y-5 p-6 md:grid-cols-2">
				{children}
			</div>
		</div>
	);
}
