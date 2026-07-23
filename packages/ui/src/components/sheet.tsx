import { XIcon } from "lucide-react";
import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { cn } from "../lib/utils";

function Sheet({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
	return <DrawerPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
	return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
	return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
	return <DrawerPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

const SheetOverlay = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Overlay>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
	<DrawerPrimitive.Overlay
		ref={ref}
		data-slot="sheet-overlay"
		className={cn(
			"fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=open]:animate-in",
			className,
		)}
		{...props}
	/>
));
SheetOverlay.displayName = DrawerPrimitive.Overlay.displayName;

const SheetContent = React.forwardRef<
	React.ElementRef<typeof DrawerPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
		side?: "top" | "right" | "bottom" | "left";
	}
>(({ side = "right", className, children, ...props }, ref) => (
	<SheetPortal>
		<SheetOverlay />
		<DrawerPrimitive.Content
			ref={ref}
			data-slot="sheet-content"
			className={cn(
				"fixed z-50 flex h-auto flex-col bg-background shadow-lg",
				side === "right" &&
					"data-[vaul-drawer-direction=right]:slide-in-from-right inset-y-0 right-0 h-full w-3/4 border-l data-[vaul-drawer-direction=right]:animate-in data-[vaul-drawer-direction=right]:duration-300 sm:max-w-sm",
				side === "left" &&
					"data-[vaul-drawer-direction=left]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r data-[vaul-drawer-direction=left]:animate-in data-[vaul-drawer-direction=left]:duration-300 sm:max-w-sm",
				side === "top" &&
					"data-[vaul-drawer-direction=top]:slide-in-from-top inset-x-0 top-0 h-auto border-b data-[vaul-drawer-direction=top]:animate-in data-[vaul-drawer-direction=top]:duration-300",
				side === "bottom" &&
					"data-[vaul-drawer-direction=bottom]:slide-in-from-bottom inset-x-0 bottom-0 h-auto border-t data-[vaul-drawer-direction=bottom]:animate-in data-[vaul-drawer-direction=bottom]:duration-300",
				className,
			)}
			data-vaul-drawer-direction={side}
			{...props}
		>
			<div className="mx-auto mb-4 hidden h-2 w-[100px] shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/sheet-content:block" />
			{children}
			<DrawerPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
				<XIcon className="size-4" />
				<span className="sr-only">Close</span>
			</DrawerPrimitive.Close>
		</DrawerPrimitive.Content>
	</SheetPortal>
));
SheetContent.displayName = DrawerPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 p-4", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

function SheetTitle({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
	return (
		<DrawerPrimitive.Title
			data-slot="sheet-title"
			className={cn("font-semibold text-foreground", className)}
			{...props}
		/>
	);
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
	return (
		<DrawerPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	);
}

export {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetOverlay,
	SheetPortal,
	SheetTitle,
	SheetTrigger,
};
