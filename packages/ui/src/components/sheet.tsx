"use client";

import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "@habe-final/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { XIcon } from "lucide-react";

const sheetVariants = cva(
	"fixed z-50 flex flex-col gap-4 bg-background shadow-lg ring-1 ring-foreground/10 transition ease-in-out data-closed:animate-out data-open:animate-in data-closed:duration-300 data-open:duration-500",
	{
		variants: {
			side: {
				top: "data-open:slide-in-from-top data-closed:slide-out-to-top inset-x-0 top-0 border-b",
				bottom:
					"data-open:slide-in-from-bottom data-closed:slide-out-to-bottom inset-x-0 bottom-0 border-t",
				left: "data-open:slide-in-from-left data-closed:slide-out-to-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
				right:
					"data-open:slide-in-from-right data-closed:slide-out-to-right inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
			},
		},
		defaultVariants: { side: "right" },
	},
);

function Sheet({ ...props }: DrawerPrimitive.Root.Props) {
	return <DrawerPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({ ...props }: DrawerPrimitive.Trigger.Props) {
	return <DrawerPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: DrawerPrimitive.Close.Props) {
	return <DrawerPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({ ...props }: DrawerPrimitive.Portal.Props) {
	return <DrawerPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({ className, ...props }: DrawerPrimitive.Backdrop.Props) {
	return (
		<DrawerPrimitive.Backdrop
			data-slot="sheet-overlay"
			className={cn(
				"data-open:fade-in-0 data-closed:fade-out-0 fixed inset-0 z-50 bg-black/50 data-closed:animate-out data-open:animate-in",
				className,
			)}
			{...props}
		/>
	);
}

function SheetContent({
	side = "right",
	className,
	children,
	...props
}: DrawerPrimitive.Popup.Props & VariantProps<typeof sheetVariants>) {
	return (
		<DrawerPrimitive.Portal>
			<SheetOverlay />
			<DrawerPrimitive.Popup
				data-slot="sheet-content"
				className={cn(sheetVariants({ side }), className)}
				{...props}
			>
				{children}
				<DrawerPrimitive.Close
					data-slot="sheet-close-button"
					className="absolute top-4 right-4 rounded-none opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none"
				>
					<XIcon className="size-4" />
					<span className="sr-only">Close</span>
				</DrawerPrimitive.Close>
			</DrawerPrimitive.Popup>
		</DrawerPrimitive.Portal>
	);
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-header"
			className={cn("flex flex-col gap-1.5 p-6", className)}
			{...props}
		/>
	);
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-footer"
			className={cn("mt-auto flex flex-col gap-2 p-6", className)}
			{...props}
		/>
	);
}

function SheetTitle({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sheet-title"
			className={cn("font-medium text-sm leading-none", className)}
			{...props}
		/>
	);
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-xs", className)}
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
	sheetVariants,
};
