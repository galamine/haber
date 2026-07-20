import { Badge } from "@haber-final/ui/components/badge";

type TagListProps = {
	items: string[];
};

export function TagList({ items }: TagListProps) {
	if (!items || items.length === 0) {
		return <span className="text-outline">—</span>;
	}

	return (
		<div className="flex flex-wrap gap-1.5">
			{items.map((item, index) => (
				<Badge
					key={`${item}-${index}`}
					variant="secondary"
					className="whitespace-normal break-words border-brown-200 bg-brown-100 text-brown-700 text-sm"
				>
					{item}
				</Badge>
			))}
		</div>
	);
}
