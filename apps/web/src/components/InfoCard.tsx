import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@haber-final/ui/components/avatar";
import { Badge } from "@haber-final/ui/components/badge";
import { Card } from "@haber-final/ui/components/card";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { cn } from "@haber-final/ui/lib/utils";
import type { LucideIcon } from "lucide-react";

interface InfoItem {
	icon: LucideIcon;
	label: string;
}

interface BadgeConfig {
	label: string;
	variant?: "default" | "secondary" | "destructive" | "outline";
	className?: string;
}

interface AvatarConfig {
	initials?: string;
	image?: string;
}

interface InfoCardProps {
	avatar?: AvatarConfig;
	title?: string;
	subtitle?: string;
	date?: string;
	badge?: BadgeConfig;
	infoItems?: InfoItem[];
	onClick?: () => void;
	isLoading?: boolean;
	className?: string;
}

export function InfoCard({
	avatar,
	title,
	subtitle,
	date,
	badge,
	infoItems,
	onClick,
	isLoading = false,
	className,
}: InfoCardProps) {
	if (isLoading) {
		return (
			<Card className={cn("overflow-hidden border-brown-200", className)}>
				<div className="p-6">
					<div className="mb-4 flex items-start gap-4">
						{avatar && <Skeleton className="h-12 w-12 rounded-full" />}
						<div className="flex-1 space-y-2">
							{title && <Skeleton className="h-4 w-32" />}
							{subtitle && <Skeleton className="h-3 w-24" />}
							{date && <Skeleton className="h-3 w-40" />}
						</div>
						{badge && <Skeleton className="h-5 w-16 rounded-full" />}
					</div>

					{infoItems && infoItems.length > 0 && (
						<div className="space-y-2">
							{infoItems.map((_, index) => (
								<div key={index} className="flex items-center gap-2">
									<Skeleton className="h-3 w-3" />
									<Skeleton className="h-3 w-24" />
								</div>
							))}
						</div>
					)}
				</div>
			</Card>
		);
	}

	return (
		<Card
			className={cn(
				"overflow-hidden border-brown-200",
				onClick && "cursor-pointer transition-shadow hover:shadow-md",
				className,
			)}
			onClick={onClick}
		>
			<div className="p-6">
				<div className="mb-4 flex items-start gap-4">
					{avatar && (
						<Avatar className="h-12 w-12">
							{avatar.image ? (
								<AvatarImage src={avatar.image} />
							) : (
								<AvatarFallback className="bg-brown-100 font-medium text-brown-700">
									{avatar.initials}
								</AvatarFallback>
							)}
						</Avatar>
					)}
					<div className="min-w-0 flex-1">
						<h3 className="mb-1 font-semibold text-sm">{title}</h3>
						{subtitle && (
							<p className="mb-1 text-brown-600 text-xs">{subtitle}</p>
						)}
						{date && (
							<p
								className="text-xs"
								style={{ color: "var(--color-text-tertiary)" }}
							>
								{date}
							</p>
						)}
					</div>
					{badge && (
						<Badge
							variant={badge.variant ?? "default"}
							className={badge.className}
						>
							{badge.label}
						</Badge>
					)}
				</div>

				{infoItems && infoItems.length > 0 && (
					<div className="space-y-2">
						{infoItems.map((item, index) => (
							<div key={index} className="flex items-center gap-2">
								<item.icon
									className="h-3 w-3"
									style={{ color: "var(--color-text-tertiary)" }}
								/>
								<span
									className="text-xs"
									style={{ color: "var(--color-text-tertiary)" }}
								>
									{item.label}
								</span>
							</div>
						))}
					</div>
				)}
			</div>
		</Card>
	);
}
