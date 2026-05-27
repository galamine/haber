"use client";

import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";

// Wave 1 — Atomic
import { Badge } from "@habe-final/ui/components/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@habe-final/ui/components/breadcrumb";
import { Separator } from "@habe-final/ui/components/separator";
import { Textarea } from "@habe-final/ui/components/textarea";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@habe-final/ui/components/table";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@habe-final/ui/components/avatar";
import { Progress } from "@habe-final/ui/components/progress";
import { Slider } from "@habe-final/ui/components/slider";
import { Switch } from "@habe-final/ui/components/switch";
import { Toggle } from "@habe-final/ui/components/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@habe-final/ui/components/toggle-group";

// Wave 2 — Layout
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@habe-final/ui/components/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@habe-final/ui/components/collapsible";
import { ScrollArea } from "@habe-final/ui/components/scroll-area";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@habe-final/ui/components/tabs";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@habe-final/ui/components/pagination";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@habe-final/ui/components/resizable";

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
} from "@habe-final/ui/components/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@habe-final/ui/components/drawer";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@habe-final/ui/components/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@habe-final/ui/components/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@habe-final/ui/components/hover-card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@habe-final/ui/components/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@habe-final/ui/components/select";
import {
  SimpleDropdown,
  SimpleDropdownContent,
  SimpleDropdownItem,
  SimpleDropdownSeparator,
  SimpleDropdownTrigger,
} from "@habe-final/ui/components/simple-dropdown";

// Wave 4 — Complex
import { RadioGroup, RadioGroupItem } from "@habe-final/ui/components/radio-group";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@habe-final/ui/components/command";
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
} from "@habe-final/ui/components/sidebar";

// Existing components (for context / combos)
import { Button } from "@habe-final/ui/components/button";
import { Input } from "@habe-final/ui/components/input";
import { Label } from "@habe-final/ui/components/label";
import { Skeleton } from "@habe-final/ui/components/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@habe-final/ui/components/card";
import { Checkbox } from "@habe-final/ui/components/checkbox";
import {
  HomeIcon,
  InboxIcon,
  SearchIcon,
  SettingsIcon,
  BoldIcon,
  ItalicIcon,
  UnderlineIcon,
  CalendarIcon,
  ChevronsUpDownIcon,
} from "lucide-react";

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
      <h2 className="text-lg font-semibold tracking-tight border-b pb-2">{title}</h2>
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
      <div className="container mx-auto max-w-4xl px-4 py-8 space-y-12">
        <div>
          <h1 className="text-2xl font-bold mb-1">UI Component Showcase</h1>
          <p className="text-sm text-muted-foreground">
            All 32 newly added components — scroll to explore each section.
          </p>
        </div>

        {/* ── Wave 1: Atomic ─────────────────────────────────────────────── */}
        <Section title="Wave 1 — Atomic / Stateless">

          {/* Badge */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Badge</p>
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
            <p className="text-xs text-muted-foreground font-mono">Avatar</p>
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
            <p className="text-xs text-muted-foreground font-mono">Progress</p>
            <div className="w-64 space-y-2">
              <Progress value={progress} />
              <Row>
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.max(0, progress - 10))}>−10</Button>
                <span className="text-sm tabular-nums">{progress}%</span>
                <Button size="sm" variant="outline" onClick={() => setProgress(Math.min(100, progress + 10))}>+10</Button>
              </Row>
            </div>
          </div>

          <Separator />

          {/* Slider */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Slider</p>
            <div className="w-64">
              <Slider
                value={sliderVal}
                onValueChange={(val) => setSliderVal(val as number)}
                min={0}
                max={100}
                step={1}
              />
              <p className="mt-1 text-xs text-muted-foreground">Value: {sliderVal}</p>
            </div>
          </div>

          <Separator />

          {/* Switch */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Switch</p>
            <Row>
              <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
              <Label>{switchOn ? "On" : "Off"}</Label>
            </Row>
          </div>

          <Separator />

          {/* Toggle */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Toggle</p>
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
            <p className="text-xs text-muted-foreground font-mono">ToggleGroup</p>
            <ToggleGroup defaultValue={["center"]} aria-label="Text alignment">
              <ToggleGroupItem value="left">Left</ToggleGroupItem>
              <ToggleGroupItem value="center">Center</ToggleGroupItem>
              <ToggleGroupItem value="right">Right</ToggleGroupItem>
            </ToggleGroup>
          </div>

          <Separator />

          {/* Textarea */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Textarea</p>
            <Textarea placeholder="Type a message…" className="w-72 resize-none" rows={3} />
          </div>

          <Separator />

          {/* Table */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Table</p>
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
            <p className="text-xs text-muted-foreground font-mono">Breadcrumb</p>
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
            <p className="text-xs text-muted-foreground font-mono">Skeleton</p>
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
            <p className="text-xs text-muted-foreground font-mono">Accordion</p>
            <Accordion className="w-full max-w-md">
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
            <p className="text-xs text-muted-foreground font-mono">Collapsible</p>
            <Collapsible open={collapsibleOpen} onOpenChange={setCollapsibleOpen} className="w-full max-w-sm">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Starred repos</span>
                <CollapsibleTrigger
                  render={<Button variant="ghost" size="sm"><ChevronsUpDownIcon className="size-4" /></Button>}
                />
              </div>
              <div className="rounded border px-3 py-2 text-sm mt-2">@radix-ui/primitives</div>
              <CollapsibleContent className="space-y-2 mt-2">
                <div className="rounded border px-3 py-2 text-sm">@radix-ui/colors</div>
                <div className="rounded border px-3 py-2 text-sm">@stitches/react</div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <Separator />

          {/* Tabs */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Tabs</p>
            <Tabs defaultValue="account" className="w-full max-w-sm">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="password">Password</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="account" className="pt-2 text-sm text-muted-foreground">
                Manage your account settings here.
              </TabsContent>
              <TabsContent value="password" className="pt-2 text-sm text-muted-foreground">
                Change your password here.
              </TabsContent>
              <TabsContent value="settings" className="pt-2 text-sm text-muted-foreground">
                Configure application settings.
              </TabsContent>
            </Tabs>
          </div>

          <Separator />

          {/* ScrollArea */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">ScrollArea</p>
            <ScrollArea className="h-40 w-64 rounded border">
              <div className="p-3 space-y-2">
                {Array.from({ length: 20 }, (_, i) => (
                  <div key={i} className="text-sm">Item {i + 1}</div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Separator />

          {/* Pagination */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Pagination</p>
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                <PaginationItem><PaginationEllipsis /></PaginationItem>
                <PaginationItem><PaginationNext href="#" /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>

          <Separator />

          {/* Resizable */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Resizable</p>
            <ResizablePanelGroup orientation="horizontal" className="h-32 w-full max-w-md rounded border">
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Panel A
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={50}>
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
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
              <DialogTrigger render={<Button variant="outline">Open Dialog</Button>} />
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
                  <DialogClose render={<Button variant="outline">Cancel</Button>} />
                  <Button>Save</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Drawer */}
            <Drawer>
              <DrawerTrigger render={<Button variant="outline">Open Drawer</Button>} />
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Move Goal</DrawerTitle>
                  <DrawerDescription>Set your daily activity goal.</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  Content goes here.
                </div>
                <DrawerFooter>
                  <Button>Submit</Button>
                  <DrawerClose render={<Button variant="outline">Cancel</Button>} />
                </DrawerFooter>
              </DrawerContent>
            </Drawer>

            {/* Sheet */}
            <Sheet>
              <SheetTrigger render={<Button variant="outline">Open Sheet</Button>} />
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Edit Profile</SheetTitle>
                  <SheetDescription>
                    Make changes to your profile here.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4 text-sm text-muted-foreground">Sheet content here.</div>
                <SheetFooter>
                  <SheetClose render={<Button variant="outline">Close</Button>} />
                </SheetFooter>
              </SheetContent>
            </Sheet>

            {/* Popover */}
            <Popover>
              <PopoverTrigger render={<Button variant="outline"><CalendarIcon className="size-4 mr-1" /> Popover</Button>} />
              <PopoverContent className="w-60 p-3">
                <p className="text-sm font-medium">Dimensions</p>
                <p className="text-xs text-muted-foreground mt-1">
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
              <HoverCardTrigger render={<Button variant="link">@faiyaz</Button>} />
              <HoverCardContent className="w-60">
                <div className="flex gap-3">
                  <Avatar>
                    <AvatarFallback>FZ</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">@faiyaz</p>
                    <p className="text-xs text-muted-foreground">Building a beautiful UI library with Base UI.</p>
                  </div>
                </div>
              </HoverCardContent>
            </HoverCard>

            {/* Tooltip */}
            <Tooltip>
              <TooltipTrigger render={<Button variant="outline">Hover me</Button>} />
              <TooltipContent>
                <p>This is a tooltip!</p>
              </TooltipContent>
            </Tooltip>

          </Row>

          <Separator />

          {/* Select */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Select</p>
            <Select>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select a fruit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
                <SelectItem value="banana">Banana</SelectItem>
                <SelectItem value="cherry">Cherry</SelectItem>
                <SelectItem value="durian" disabled>Durian (disabled)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* SimpleDropdown */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">SimpleDropdown</p>
            <SimpleDropdown>
              <SimpleDropdownTrigger render={<Button variant="outline">Open Menu</Button>} />
              <SimpleDropdownContent>
                <SimpleDropdownItem>Profile</SimpleDropdownItem>
                <SimpleDropdownItem>Settings</SimpleDropdownItem>
                <SimpleDropdownSeparator />
                <SimpleDropdownItem>Log out</SimpleDropdownItem>
              </SimpleDropdownContent>
            </SimpleDropdown>
          </div>
        </Section>

        {/* ── Wave 4: Complex ─────────────────────────────────────────────── */}
        <Section title="Wave 4 — Complex / Specialized">

          {/* RadioGroup */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">RadioGroup</p>
            <RadioGroup value={radioVal} onValueChange={setRadioVal} className="space-y-1">
              {["default", "comfortable", "compact"].map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <RadioGroupItem value={v} id={`radio-${v}`} />
                  <Label htmlFor={`radio-${v}`} className="capitalize">{v}</Label>
                </div>
              ))}
            </RadioGroup>
            <p className="text-xs text-muted-foreground">Selected: {radioVal}</p>
          </div>

          <Separator />

          {/* Command */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Command (inline)</p>
            <Command className="rounded border w-full max-w-md shadow-none">
              <CommandInput placeholder="Type a command or search…" />
              <CommandList>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup heading="Suggestions">
                  <CommandItem>
                    <CalendarIcon className="size-4 mr-2" />
                    Calendar
                  </CommandItem>
                  <CommandItem>
                    <SearchIcon className="size-4 mr-2" />
                    Search
                    <CommandShortcut>⌘K</CommandShortcut>
                  </CommandItem>
                  <CommandItem>
                    <SettingsIcon className="size-4 mr-2" />
                    Settings
                    <CommandShortcut>⌘S</CommandShortcut>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup heading="Navigation">
                  <CommandItem>
                    <HomeIcon className="size-4 mr-2" />
                    Home
                  </CommandItem>
                  <CommandItem>
                    <InboxIcon className="size-4 mr-2" />
                    Inbox
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </div>

          <Separator />

          {/* Sidebar */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Sidebar</p>
            <div className="h-64 w-full max-w-md border rounded overflow-hidden relative flex">
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
                  <SidebarFooter className="px-3 py-2 text-xs text-muted-foreground">
                    v1.0.0
                  </SidebarFooter>
                </Sidebar>
                <div className="flex flex-col flex-1 p-3">
                  <SidebarTrigger />
                  <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                    Main content area
                  </div>
                </div>
              </SidebarProvider>
            </div>
          </div>

          <Separator />

          {/* Card (existing, combined with new) */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-mono">Card + Checkbox + Label</p>
            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose what you want to be notified about.</CardDescription>
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
