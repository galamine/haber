"use client";

import { cn } from "@habe-final/ui/lib/utils";
import { PanelLeftIcon } from "lucide-react";
import * as React from "react";

// --- Context ---

type SidebarContextValue = {
	open: boolean;
	setOpen: (open: boolean) => void;
	toggle: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue>({
	open: true,
	setOpen: () => {},
	toggle: () => {},
});

function useSidebar() {
	const context = React.useContext(SidebarContext);
	if (!context)
		throw new Error("useSidebar must be used within a SidebarProvider");
	return context;
}

// --- Provider ---

function SidebarProvider({
	children,
	defaultOpen = true,
	open: controlledOpen,
	onOpenChange,
}: {
	children: React.ReactNode;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) {
	const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
	const open = controlledOpen ?? internalOpen;
	const setOpen = React.useCallback(
		(value: boolean) => {
			setInternalOpen(value);
			onOpenChange?.(value);
		},
		[onOpenChange],
	);
	const toggle = React.useCallback(() => setOpen(!open), [open, setOpen]);
	return (
		<SidebarContext.Provider value={{ open, setOpen, toggle }}>
			{children}
		</SidebarContext.Provider>
	);
}

// --- Sidebar (aside element) ---

function Sidebar({
	className,
	children,
	...props
}: React.ComponentProps<"aside">) {
	const { open } = useSidebar();
	return (
		<aside
			data-slot="sidebar"
			data-open={open || undefined}
			data-collapsed={!open || undefined}
			className={cn(
				"relative flex h-full flex-col border-border border-r bg-card text-card-foreground transition-all duration-300 ease-in-out",
				open ? "w-64" : "w-14",
				className,
			)}
			{...props}
		>
			{children}
		</aside>
	);
}

// --- SidebarHeader ---

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-header"
			className={cn(
				"flex h-14 items-center border-border border-b px-3",
				className,
			)}
			{...props}
		/>
	);
}

// --- SidebarContent ---

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-content"
			className={cn(
				"flex flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden px-2 py-2",
				className,
			)}
			{...props}
		/>
	);
}

// --- SidebarFooter ---

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-footer"
			className={cn("flex items-center border-border border-t p-3", className)}
			{...props}
		/>
	);
}

// --- SidebarGroup ---

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group"
			className={cn("flex flex-col gap-1", className)}
			{...props}
		/>
	);
}

// --- SidebarGroupLabel ---

function SidebarGroupLabel({
	className,
	...props
}: React.ComponentProps<"div">) {
	const { open } = useSidebar();
	return (
		<div
			data-slot="sidebar-group-label"
			className={cn(
				"px-2 py-1 font-medium text-muted-foreground text-xs transition-all duration-200",
				!open && "sr-only",
				className,
			)}
			{...props}
		/>
	);
}

// --- SidebarGroupContent ---

function SidebarGroupContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="sidebar-group-content"
			className={cn("flex flex-col gap-0.5", className)}
			{...props}
		/>
	);
}

// --- SidebarMenu ---

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
	return (
		<ul
			data-slot="sidebar-menu"
			className={cn("m-0 flex list-none flex-col gap-0.5 p-0", className)}
			{...props}
		/>
	);
}

// --- SidebarMenuItem ---

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
	return (
		<li
			data-slot="sidebar-menu-item"
			className={cn("group/menu-item relative", className)}
			{...props}
		/>
	);
}

// --- SidebarMenuButton ---

function SidebarMenuButton({
	className,
	isActive,
	tooltip,
	children,
	...props
}: React.ComponentProps<"button"> & {
	isActive?: boolean;
	tooltip?: string;
}) {
	const { open } = useSidebar();
	return (
		<button
			data-slot="sidebar-menu-button"
			data-active={isActive || undefined}
			title={!open && tooltip ? tooltip : undefined}
			className={cn(
				"flex w-full items-center gap-2 rounded-none px-2 py-1.5 font-medium text-xs outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent data-[active]:text-accent-foreground",
				!open && "justify-center px-0",
				className,
			)}
			{...props}
		>
			{children}
		</button>
	);
}

// --- SidebarTrigger ---

function SidebarTrigger({
	className,
	onClick,
	...props
}: React.ComponentProps<"button">) {
	const { toggle } = useSidebar();
	return (
		<button
			data-slot="sidebar-trigger"
			onClick={(e) => {
				onClick?.(e);
				toggle();
			}}
			className={cn(
				"inline-flex size-7 items-center justify-center rounded-none text-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-1 focus-visible:ring-ring/50",
				className,
			)}
			{...props}
		>
			<PanelLeftIcon className="size-4" />
			<span className="sr-only">Toggle Sidebar</span>
		</button>
	);
}

// --- SidebarInset ---

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
	return (
		<main
			data-slot="sidebar-inset"
			className={cn("flex flex-1 flex-col overflow-hidden", className)}
			{...props}
		/>
	);
}

export {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	useSidebar,
};
