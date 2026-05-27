"use client";

import { NavigationMenu as NavigationMenuPrimitive } from "@base-ui/react/navigation-menu";
import { cn } from "@habe-final/ui/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type * as React from "react";

function NavigationMenu({
	className,
	children,
	viewport = true,
	...props
}: NavigationMenuPrimitive.Root.Props & { viewport?: boolean }) {
	return (
		<NavigationMenuPrimitive.Root
			data-slot="navigation-menu"
			className={cn(
				"relative flex max-w-max flex-1 items-center justify-center",
				className,
			)}
			{...props}
		>
			{children}
			{viewport && <NavigationMenuViewport />}
		</NavigationMenuPrimitive.Root>
	);
}

function NavigationMenuList({
	className,
	...props
}: NavigationMenuPrimitive.List.Props) {
	return (
		<NavigationMenuPrimitive.List
			data-slot="navigation-menu-list"
			className={cn(
				"group flex flex-1 list-none items-center justify-center gap-1",
				className,
			)}
			{...props}
		/>
	);
}

function NavigationMenuItem({ ...props }: NavigationMenuPrimitive.Item.Props) {
	return (
		<NavigationMenuPrimitive.Item data-slot="navigation-menu-item" {...props} />
	);
}

function NavigationMenuTrigger({
	className,
	children,
	...props
}: NavigationMenuPrimitive.Trigger.Props) {
	return (
		<NavigationMenuPrimitive.Trigger
			data-slot="navigation-menu-trigger"
			className={cn(
				"group inline-flex h-8 w-max items-center justify-center gap-1 rounded-none bg-background px-3 py-1 font-medium text-xs transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50",
				className,
			)}
			{...props}
		>
			{children}
			<ChevronDownIcon
				className="relative size-3 transition duration-300 group-data-[open]:rotate-180"
				aria-hidden="true"
			/>
		</NavigationMenuPrimitive.Trigger>
	);
}

function NavigationMenuContent({
	className,
	...props
}: NavigationMenuPrimitive.Content.Props) {
	return (
		<NavigationMenuPrimitive.Content
			data-slot="navigation-menu-content"
			className={cn(
				"data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out md:absolute md:w-auto",
				className,
			)}
			{...props}
		/>
	);
}

function NavigationMenuLink({
	className,
	...props
}: NavigationMenuPrimitive.Link.Props) {
	return (
		<NavigationMenuPrimitive.Link
			data-slot="navigation-menu-link"
			className={cn(
				"block select-none rounded-none p-3 text-xs leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function NavigationMenuViewport({
	className,
	...props
}: NavigationMenuPrimitive.Viewport.Props) {
	return (
		<div className={cn("absolute top-full left-0 flex justify-center")}>
			<NavigationMenuPrimitive.Viewport
				data-slot="navigation-menu-viewport"
				className={cn(
					"data-open:zoom-in-90 data-closed:zoom-out-95 relative mt-1.5 h-auto w-auto origin-top-center overflow-hidden rounded-none bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10 data-closed:animate-out data-open:animate-in",
					className,
				)}
				{...props}
			/>
		</div>
	);
}

function NavigationMenuIndicator({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="navigation-menu-indicator"
			className={cn(
				"data-open:fade-in data-closed:fade-out top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-closed:animate-out data-open:animate-in",
				className,
			)}
			{...props}
		>
			<div className="relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" />
		</div>
	);
}

export {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuIndicator,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	NavigationMenuViewport,
};
