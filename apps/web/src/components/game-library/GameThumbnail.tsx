import { cn } from "@haber-final/ui/lib/utils";

// Placeholder until real game artwork exists: a tile coloured by clinical domain.
const CATEGORY_COLORS: Record<string, string> = {
	"Motor Skills": "bg-blue-100 text-blue-800",
	"Cognitive Processing": "bg-purple-100 text-purple-700",
	"Attention & Focus": "bg-amber-100 text-amber-700",
	"Memory & Learning": "bg-indigo-100 text-indigo-700",
	"Balance & Coordination": "bg-teal-100 text-teal-700",
	"Communication & Language": "bg-pink-100 text-pink-700",
	"Sensory Processing": "bg-green-100 text-green-800",
	"Emotional Regulation": "bg-rose-100 text-rose-700",
	"Social Interaction": "bg-orange-100 text-orange-700",
	"Daily Living Skills": "bg-cyan-100 text-cyan-700",
};

function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase())
		.join("");
}

interface GameThumbnailProps {
	name: string;
	categoryName?: string;
	size?: "sm" | "lg";
	className?: string;
}

export function GameThumbnail({
	name,
	categoryName,
	size = "sm",
	className,
}: GameThumbnailProps) {
	return (
		<div
			aria-hidden
			className={cn(
				"flex flex-shrink-0 items-center justify-center font-semibold",
				(categoryName && CATEGORY_COLORS[categoryName]) ||
					"bg-muted text-muted-foreground",
				size === "sm"
					? "h-16 w-16 rounded-lg text-lg"
					: "aspect-video w-full rounded-xl text-4xl",
				className,
			)}
		>
			{initials(name)}
		</div>
	);
}
