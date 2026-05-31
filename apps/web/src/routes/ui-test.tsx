"use client";

// Wave 2 — Layout
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@haber-final/ui/components/accordion";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@haber-final/ui/components/avatar";

// Wave 1 — Atomic
import { Badge } from "@haber-final/ui/components/badge";
import {
	Breadcrumb,
	BreadcrumbEllipsis,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@haber-final/ui/components/breadcrumb";
// Existing components (for context / combos)
import { Button } from "@haber-final/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@haber-final/ui/components/card";
import { Checkbox } from "@haber-final/ui/components/checkbox";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@haber-final/ui/components/collapsible";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator,
	CommandShortcut,
} from "@haber-final/ui/components/command";
// Wave 3 — Floating / Overlay
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@haber-final/ui/components/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@haber-final/ui/components/drawer";
import {
	HoverCard,
	HoverCardContent,
	HoverCardTrigger,
} from "@haber-final/ui/components/hover-card";
import { Input } from "@haber-final/ui/components/input";
import { Label } from "@haber-final/ui/components/label";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@haber-final/ui/components/pagination";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@haber-final/ui/components/popover";
import { Progress } from "@haber-final/ui/components/progress";
// Wave 4 — Complex
import {
	RadioGroup,
	RadioGroupItem,
} from "@haber-final/ui/components/radio-group";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@haber-final/ui/components/resizable";
import { ScrollArea } from "@haber-final/ui/components/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@haber-final/ui/components/select";
import { Separator } from "@haber-final/ui/components/separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@haber-final/ui/components/sheet";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
} from "@haber-final/ui/components/sidebar";
import {
	SimpleDropdown,
	SimpleDropdownItem,
	SimpleDropdownSeparator,
} from "@haber-final/ui/components/simple-dropdown";
import { Skeleton } from "@haber-final/ui/components/skeleton";
import { Slider } from "@haber-final/ui/components/slider";
import { Switch } from "@haber-final/ui/components/switch";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "@haber-final/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@haber-final/ui/components/tabs";
import { Textarea } from "@haber-final/ui/components/textarea";
import { Toggle } from "@haber-final/ui/components/toggle";
import {
	ToggleGroup,
	ToggleGroupItem,
} from "@haber-final/ui/components/toggle-group";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@haber-final/ui/components/tooltip";
import { createFileRoute } from "@tanstack/react-router";
import {
	BoldIcon,
	CalendarIcon,
	ChevronsUpDownIcon,
	HomeIcon,
	InboxIcon,
	ItalicIcon,
	SearchIcon,
	SettingsIcon,
	UnderlineIcon,
} from "lucide-react";
import * as React from "react";

export const Route = createFileRoute("/ui-test")({
	component: UITestPage,
});

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<section className="space-y-4">
			<h2 className="border-b pb-2 font-semibold text-lg tracking-tight">
				{title}
			</h2>
			{children}
		</section>
	);
}

function Row({ children }: { children: React.ReactNode }) {
	return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function UITestPage() {
	const [progress, setProgress] = React.useState(45);
	const [sliderVal, setSliderVal] = React.useState(33);
	const [switchOn, setSwitchOn] = React.useState(false);
	const [radioVal, setRadioVal] = React.useState("comfortable");
	const [toggleActive, setToggleActive] = React.useState(false);
	const [collapsibleOpen, setCollapsibleOpen] = React.useState(false);

	return (
		<TooltipProvider>
			<div className="container mx-auto max-w-4xl space-y-12 px-4 py-8">
				<div>
					<h1 className="mb-1 font-bold text-2xl">UI Component Showcase</h1>
					<p className="text-muted-foreground text-sm">
						All 32 newly added components — scroll to explore each section.
					</p>
				</div>

				{/* ── Wave 1: Atomic ─────────────────────────────────────────────── */}
				<Section title="Wave 1 — Atomic / Stateless">
					{/* Badge */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Badge</p>
						<Row>
							<Badge>Default</Badge>
							<Badge variant="secondary">Secondary</Badge>
							<Badge variant="destructive">Destructive</Badge>
							<Badge variant="outline">Outline</Badge>
						</Row>
					</div>

					<Separator />

					{/* Avatar */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Avatar</p>
						<Row>
							<Avatar>
								<AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
								<AvatarFallback>SC</AvatarFallback>
							</Avatar>
							<Avatar>
								<AvatarFallback>JD</AvatarFallback>
							</Avatar>
							<Avatar>
								<AvatarImage src="/broken-link.jpg" alt="broken" />
								<AvatarFallback>?</AvatarFallback>
							</Avatar>
						</Row>
					</div>

					<Separator />

					{/* Progress */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Progress</p>
						<div className="w-64 space-y-2">
							<Progress value={progress} />
							<Row>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setProgress(Math.max(0, progress - 10))}
								>
									−10
								</Button>
								<span className="text-sm tabular-nums">{progress}%</span>
								<Button
									size="sm"
									variant="outline"
									onClick={() => setProgress(Math.min(100, progress + 10))}
								>
									+10
								</Button>
							</Row>
						</div>
					</div>

					<Separator />

					{/* Slider */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Slider</p>
						<div className="w-64">
							<Slider
								value={[sliderVal]}
								onValueChange={(val) => setSliderVal(val[0])}
								min={0}
								max={100}
								step={1}
							/>
							<p className="mt-1 text-muted-foreground text-xs">
								Value: {sliderVal}
							</p>
						</div>
					</div>

					<Separator />

					{/* Switch */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Switch</p>
						<Row>
							<Switch checked={switchOn} onCheckedChange={setSwitchOn} />
							<Label>{switchOn ? "On" : "Off"}</Label>
						</Row>
					</div>

					<Separator />

					{/* Toggle */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Toggle</p>
						<Row>
							<Toggle pressed={toggleActive} onPressedChange={setToggleActive}>
								<BoldIcon className="size-4" /> Bold
							</Toggle>
							<Toggle variant="outline">
								<ItalicIcon className="size-4" /> Italic
							</Toggle>
							<Toggle variant="outline" size="sm">
								<UnderlineIcon className="size-4" /> Underline
							</Toggle>
						</Row>
					</div>

					<Separator />

					{/* ToggleGroup */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							ToggleGroup
						</p>
						<ToggleGroup
							type="multiple"
							defaultValue={["center"]}
							aria-label="Text alignment"
						>
							<ToggleGroupItem value="left">Left</ToggleGroupItem>
							<ToggleGroupItem value="center">Center</ToggleGroupItem>
							<ToggleGroupItem value="right">Right</ToggleGroupItem>
						</ToggleGroup>
					</div>

					<Separator />

					{/* Textarea */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Textarea</p>
						<Textarea
							placeholder="Type a message…"
							className="w-72 resize-none"
							rows={3}
						/>
					</div>

					<Separator />

					{/* Table */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Table</p>
						<Table>
							<TableCaption>A list of recent invoices.</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead>Invoice</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Amount</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{[
									{ id: "INV-001", status: "Paid", amount: "$250.00" },
									{ id: "INV-002", status: "Pending", amount: "$150.00" },
									{ id: "INV-003", status: "Unpaid", amount: "$350.00" },
								].map((row) => (
									<TableRow key={row.id}>
										<TableCell className="font-medium">{row.id}</TableCell>
										<TableCell>{row.status}</TableCell>
										<TableCell className="text-right">{row.amount}</TableCell>
									</TableRow>
								))}
							</TableBody>
							<TableFooter>
								<TableRow>
									<TableCell colSpan={2}>Total</TableCell>
									<TableCell className="text-right">$750.00</TableCell>
								</TableRow>
							</TableFooter>
						</Table>
					</div>

					<Separator />

					{/* Breadcrumb */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							Breadcrumb
						</p>
						<Breadcrumb>
							<BreadcrumbList>
								<BreadcrumbItem>
									<BreadcrumbLink href="#">Home</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbEllipsis />
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbLink href="#">Components</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage>Breadcrumb</BreadcrumbPage>
								</BreadcrumbItem>
							</BreadcrumbList>
						</Breadcrumb>
					</div>

					<Separator />

					{/* Skeleton */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Skeleton</p>
						<div className="flex items-center gap-3">
							<Skeleton className="h-12 w-12 rounded-full" />
							<div className="space-y-2">
								<Skeleton className="h-4 w-48" />
								<Skeleton className="h-4 w-32" />
							</div>
						</div>
					</div>
				</Section>

				{/* ── Wave 2: Layout ─────────────────────────────────────────────── */}
				<Section title="Wave 2 — Layout / Container">
					{/* Accordion */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Accordion</p>
						<Accordion type="single" collapsible className="w-full max-w-md">
							<AccordionItem value="item-1">
								<AccordionTrigger>Is it accessible?</AccordionTrigger>
								<AccordionContent>
									Yes. It adheres to the WAI-ARIA design pattern.
								</AccordionContent>
							</AccordionItem>
							<AccordionItem value="item-2">
								<AccordionTrigger>Is it styled?</AccordionTrigger>
								<AccordionContent>
									Yes. It comes with default styles that matches your theme.
								</AccordionContent>
							</AccordionItem>
						</Accordion>
					</div>

					<Separator />

					{/* Collapsible */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							Collapsible
						</p>
						<Collapsible
							open={collapsibleOpen}
							onOpenChange={setCollapsibleOpen}
							className="w-full max-w-sm"
						>
							<div className="flex items-center justify-between">
								<span className="font-medium text-sm">Starred repos</span>
								<CollapsibleTrigger asChild>
									<Button variant="ghost" size="sm">
										<ChevronsUpDownIcon className="size-4" />
									</Button>
								</CollapsibleTrigger>
							</div>
							<div className="mt-2 rounded border px-3 py-2 text-sm">
								@radix-ui/primitives
							</div>
							<CollapsibleContent className="mt-2 space-y-2">
								<div className="rounded border px-3 py-2 text-sm">
									@radix-ui/colors
								</div>
								<div className="rounded border px-3 py-2 text-sm">
									@stitches/react
								</div>
							</CollapsibleContent>
						</Collapsible>
					</div>

					<Separator />

					{/* Tabs */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Tabs</p>
						<Tabs defaultValue="account" className="w-full max-w-sm">
							<TabsList>
								<TabsTrigger value="account">Account</TabsTrigger>
								<TabsTrigger value="password">Password</TabsTrigger>
								<TabsTrigger value="settings">Settings</TabsTrigger>
							</TabsList>
							<TabsContent
								value="account"
								className="pt-2 text-muted-foreground text-sm"
							>
								Manage your account settings here.
							</TabsContent>
							<TabsContent
								value="password"
								className="pt-2 text-muted-foreground text-sm"
							>
								Change your password here.
							</TabsContent>
							<TabsContent
								value="settings"
								className="pt-2 text-muted-foreground text-sm"
							>
								Configure application settings.
							</TabsContent>
						</Tabs>
					</div>

					<Separator />

					{/* ScrollArea */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							ScrollArea
						</p>
						<ScrollArea className="h-40 w-64 rounded border">
							<div className="space-y-2 p-3">
								{Array.from({ length: 20 }, (_, i) => (
									<div key={i} className="text-sm">
										Item {i + 1}
									</div>
								))}
							</div>
						</ScrollArea>
					</div>

					<Separator />

					{/* Pagination */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							Pagination
						</p>
						<Pagination>
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious href="#" />
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#">1</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#" isActive>
										2
									</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationLink href="#">3</PaginationLink>
								</PaginationItem>
								<PaginationItem>
									<PaginationEllipsis />
								</PaginationItem>
								<PaginationItem>
									<PaginationNext href="#" />
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>

					<Separator />

					{/* Resizable */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Resizable</p>
						<ResizablePanelGroup
							orientation="horizontal"
							className="h-32 w-full max-w-md rounded border"
						>
							<ResizablePanel defaultSize={50}>
								<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
									Panel A
								</div>
							</ResizablePanel>
							<ResizableHandle withHandle />
							<ResizablePanel defaultSize={50}>
								<div className="flex h-full items-center justify-center text-muted-foreground text-sm">
									Panel B
								</div>
							</ResizablePanel>
						</ResizablePanelGroup>
					</div>
				</Section>

				{/* ── Wave 3: Floating / Overlay ──────────────────────────────────── */}
				<Section title="Wave 3 — Floating / Overlay">
					<Row>
						{/* Dialog */}
						<Dialog>
							<DialogTrigger asChild>
								<Button variant="outline">Open Dialog</Button>
							</DialogTrigger>
							<DialogContent className="sm:max-w-md">
								<DialogHeader>
									<DialogTitle>Edit profile</DialogTitle>
									<DialogDescription>
										Make changes to your profile here. Click save when done.
									</DialogDescription>
								</DialogHeader>
								<div className="space-y-2 py-2">
									<div className="space-y-1">
										<Label htmlFor="name">Name</Label>
										<Input id="name" defaultValue="John Doe" />
									</div>
								</div>
								<DialogFooter>
									<DialogClose asChild>
										<Button variant="outline">Cancel</Button>
									</DialogClose>
									<Button>Save</Button>
								</DialogFooter>
							</DialogContent>
						</Dialog>

						{/* Drawer */}
						<Drawer>
							<DrawerTrigger asChild>
								<Button variant="outline">Open Drawer</Button>
							</DrawerTrigger>
							<DrawerContent>
								<DrawerHeader>
									<DrawerTitle>Move Goal</DrawerTitle>
									<DrawerDescription>
										Set your daily activity goal.
									</DrawerDescription>
								</DrawerHeader>
								<div className="px-4 py-2 text-muted-foreground text-sm">
									Content goes here.
								</div>
								<DrawerFooter>
									<Button>Submit</Button>
									<DrawerClose asChild>
										<Button variant="outline">Cancel</Button>
									</DrawerClose>
								</DrawerFooter>
							</DrawerContent>
						</Drawer>

						{/* Sheet */}
						<Sheet>
							<SheetTrigger asChild>
								<Button variant="outline">Open Sheet</Button>
							</SheetTrigger>
							<SheetContent side="right">
								<SheetHeader>
									<SheetTitle>Edit Profile</SheetTitle>
									<SheetDescription>
										Make changes to your profile here.
									</SheetDescription>
								</SheetHeader>
								<div className="py-4 text-muted-foreground text-sm">
									Sheet content here.
								</div>
								<SheetFooter>
									<SheetClose asChild>
										<Button variant="outline">Close</Button>
									</SheetClose>
								</SheetFooter>
							</SheetContent>
						</Sheet>

						{/* Popover */}
						<Popover>
							<PopoverTrigger asChild>
								<Button variant="outline">
									<CalendarIcon className="mr-1 size-4" /> Popover
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-60 p-3">
								<p className="font-medium text-sm">Dimensions</p>
								<p className="mt-1 text-muted-foreground text-xs">
									Set the dimensions for the layer.
								</p>
								<div className="mt-3 space-y-2">
									<div className="flex items-center gap-2">
										<Label className="w-12 text-xs">Width</Label>
										<Input defaultValue="100%" className="h-7 text-xs" />
									</div>
								</div>
							</PopoverContent>
						</Popover>

						{/* HoverCard */}
						<HoverCard>
							<HoverCardTrigger asChild>
								<Button variant="link">@faiyaz</Button>
							</HoverCardTrigger>
							<HoverCardContent className="w-60">
								<div className="flex gap-3">
									<Avatar>
										<AvatarFallback>FZ</AvatarFallback>
									</Avatar>
									<div>
										<p className="font-semibold text-sm">@faiyaz</p>
										<p className="text-muted-foreground text-xs">
											Building a beautiful UI library with Base UI.
										</p>
									</div>
								</div>
							</HoverCardContent>
						</HoverCard>

						{/* Tooltip */}
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="outline">Hover me</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>This is a tooltip!</p>
							</TooltipContent>
						</Tooltip>
					</Row>

					<Separator />

					{/* Select */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Select</p>
						<Select>
							<SelectTrigger className="w-48">
								<SelectValue placeholder="Select a fruit" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="apple">Apple</SelectItem>
								<SelectItem value="banana">Banana</SelectItem>
								<SelectItem value="cherry">Cherry</SelectItem>
								<SelectItem value="durian" disabled>
									Durian (disabled)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<Separator />

					{/* SimpleDropdown */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							SimpleDropdown
						</p>
						<SimpleDropdown
							trigger={<Button variant="outline">Open Menu</Button>}
						>
							<SimpleDropdownItem>Profile</SimpleDropdownItem>
							<SimpleDropdownItem>Settings</SimpleDropdownItem>
							<SimpleDropdownSeparator />
							<SimpleDropdownItem>Log out</SimpleDropdownItem>
						</SimpleDropdown>
					</div>
				</Section>

				{/* ── Wave 4: Complex ─────────────────────────────────────────────── */}
				<Section title="Wave 4 — Complex / Specialized">
					{/* RadioGroup */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							RadioGroup
						</p>
						<RadioGroup
							value={radioVal}
							onValueChange={setRadioVal}
							className="space-y-1"
						>
							{["default", "comfortable", "compact"].map((v) => (
								<div key={v} className="flex items-center gap-2">
									<RadioGroupItem value={v} id={`radio-${v}`} />
									<Label htmlFor={`radio-${v}`} className="capitalize">
										{v}
									</Label>
								</div>
							))}
						</RadioGroup>
						<p className="text-muted-foreground text-xs">
							Selected: {radioVal}
						</p>
					</div>

					<Separator />

					{/* Command */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							Command (inline)
						</p>
						<Command className="w-full max-w-md rounded border shadow-none">
							<CommandInput placeholder="Type a command or search…" />
							<CommandList>
								<CommandEmpty>No results found.</CommandEmpty>
								<CommandGroup heading="Suggestions">
									<CommandItem>
										<CalendarIcon className="mr-2 size-4" />
										Calendar
									</CommandItem>
									<CommandItem>
										<SearchIcon className="mr-2 size-4" />
										Search
										<CommandShortcut>⌘K</CommandShortcut>
									</CommandItem>
									<CommandItem>
										<SettingsIcon className="mr-2 size-4" />
										Settings
										<CommandShortcut>⌘S</CommandShortcut>
									</CommandItem>
								</CommandGroup>
								<CommandSeparator />
								<CommandGroup heading="Navigation">
									<CommandItem>
										<HomeIcon className="mr-2 size-4" />
										Home
									</CommandItem>
									<CommandItem>
										<InboxIcon className="mr-2 size-4" />
										Inbox
									</CommandItem>
								</CommandGroup>
							</CommandList>
						</Command>
					</div>

					<Separator />

					{/* Sidebar */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">Sidebar</p>
						<div className="relative flex h-64 w-full max-w-md overflow-hidden rounded border">
							<SidebarProvider>
								<Sidebar>
									<SidebarHeader className="px-3 py-2 font-semibold text-sm">
										My App
									</SidebarHeader>
									<SidebarContent>
										<SidebarGroup>
											<SidebarGroupLabel>Navigation</SidebarGroupLabel>
											<SidebarGroupContent>
												<SidebarMenu>
													{[
														{ label: "Home", icon: HomeIcon },
														{ label: "Inbox", icon: InboxIcon },
														{ label: "Search", icon: SearchIcon },
														{ label: "Settings", icon: SettingsIcon },
													].map(({ label, icon: Icon }) => (
														<SidebarMenuItem key={label}>
															<SidebarMenuButton>
																<Icon className="size-4" />
																<span>{label}</span>
															</SidebarMenuButton>
														</SidebarMenuItem>
													))}
												</SidebarMenu>
											</SidebarGroupContent>
										</SidebarGroup>
									</SidebarContent>
									<SidebarFooter className="px-3 py-2 text-muted-foreground text-xs">
										v1.0.0
									</SidebarFooter>
								</Sidebar>
								<div className="flex flex-1 flex-col p-3">
									<SidebarTrigger />
									<div className="flex flex-1 items-center justify-center text-muted-foreground text-sm">
										Main content area
									</div>
								</div>
							</SidebarProvider>
						</div>
					</div>

					<Separator />

					{/* Card (existing, combined with new) */}
					<div className="space-y-2">
						<p className="font-mono text-muted-foreground text-xs">
							Card + Checkbox + Label
						</p>
						<Card className="w-full max-w-sm">
							<CardHeader>
								<CardTitle>Notifications</CardTitle>
								<CardDescription>
									Choose what you want to be notified about.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-3">
								{["Comments", "Candidates", "Offers"].map((item) => (
									<div key={item} className="flex items-center gap-2">
										<Checkbox id={`check-${item}`} />
										<Label htmlFor={`check-${item}`}>{item}</Label>
									</div>
								))}
							</CardContent>
							<CardFooter>
								<Button className="w-full">Save preferences</Button>
							</CardFooter>
						</Card>
					</div>
				</Section>
			</div>
		</TooltipProvider>
	);
}
