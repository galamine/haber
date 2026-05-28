"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@haber-final/ui/lib/utils";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
	return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
	return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerContent({
	className,
	children,
	...props
}: DrawerPrimitive.Popup.Props) {
	return (
		<DrawerPrimitive.Portal>
			<DrawerPrimitive.Backdrop className="data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in" />
			<DrawerPrimitive.Popup
				data-slot="drawer-content"
				className={cn(
					"data-open:slide-in-from-bottom data-closed:slide-out-to-bottom fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[80vh] flex-col rounded-t-none bg-background ring-1 ring-foreground/10 data-closed:animate-out data-open:animate-in",
					className,
				)}
				{...props}
			>
				<div className="mx-auto mt-4 h-1.5 w-24 shrink-0 rounded-full bg-muted" />
				{children}
			</DrawerPrimitive.Popup>
		</DrawerPrimitive.Portal>
	);
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-header"
			className={cn("flex flex-col gap-1.5 p-4", className)}
			{...props}
		/>
	);
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-footer"
			className={cn("mt-auto flex flex-col gap-2 p-4", className)}
			{...props}
		/>
	);
}

function DrawerTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="drawer-title"
			className={cn("font-medium text-sm leading-none", className)}
			{...props}
		/>
	);
}

function DrawerDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="drawer-description"
			className={cn("text-muted-foreground text-xs", className)}
			{...props}
		/>
	);
}

export {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
};
