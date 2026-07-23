import type * as React from "react";
import { cn } from "../lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge } from "./badge";

export interface SectionHeaderProps
	extends React.HTMLAttributes<HTMLDivElement> {
	avatar?: {
		src?: string;
		fallback: string;
	};
	icon?: React.ReactNode;
	badge?: {
		label: string;
		variant?:
			| "default"
			| "secondary"
			| "destructive"
			| "outline"
			| "warning"
			| "success";
	};
	title: string;
	description?: string;
	subtitle?: string;
	meta?: string | React.ReactNode;
	actions?: React.ReactNode;
}

function SectionHeader({
	avatar,
	icon,
	badge,
	title,
	description,
	subtitle,
	meta,
	actions,
	className,
	...props
}: SectionHeaderProps) {
	return (
		<header
			className={cn(
				"rounded-t-xl border border-b bg-accent px-6 py-4",
				className,
			)}
			{...props}
		>
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					{avatar && (
						<Avatar className="h-12 w-12 border border-border">
							{avatar.src ? (
								<AvatarImage src={avatar.src} />
							) : (
								<AvatarFallback className="bg-muted font-semibold">
									{avatar.fallback}
								</AvatarFallback>
							)}
						</Avatar>
					)}
					{icon && <span className="text-muted-foreground">{icon}</span>}
					{badge && (
						<Badge variant={badge.variant ?? "outline"}>{badge.label}</Badge>
					)}
					<div>
						<h3 className="font-semibold text-lg">{title}</h3>
						{description && (
							<p className="text-muted-foreground text-sm">{description}</p>
						)}
						{subtitle && (
							<p className="text-muted-foreground text-sm">{subtitle}</p>
						)}
						{meta && <div className="mt-1 flex items-center gap-2">{meta}</div>}
					</div>
				</div>
				{actions && <div className="flex items-center gap-2">{actions}</div>}
			</div>
		</header>
	);
}

export { SectionHeader };
