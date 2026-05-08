# Haber Frontend Design System

Component reference for coding agents. Use this to select the right component for a given task.

---

## Layout Shell

### Sidebar
Collapsible navigation sidebar with mobile-responsive sheet behavior; supports expanded/collapsed states, icon-only mode, and keyboard shortcut (Cmd+B).  
**Use:** Primary app navigation, admin dashboards, settings pages.

### PageHeader
Sticky page header with back button, title, optional badge, and description.  
**Use:** Detail pages, entity views, form pages.

### PageShell
Main app layout shell with header, nav links, auth state display, and React Router outlet for child routes.  
**Use:** Authenticated page layouts, dashboard wrapper.

### HaberLogo
Brand logo component with click handler and optional animation.  
**Use:** App branding, login page, sidebar header.

---

## Primitives (Form Inputs)

### Button
Multi-variant button (default, destructive, outline, secondary, ghost, link) with three sizes (default, sm, lg) and icon support.  
**Use:** Primary actions, navigation, toolbars, confirmation dialogs.

### Input
Text input with brown-300 border, hover state, focus ring, and disabled styling; accepts all native input attributes.  
**Use:** Login forms, search bars, filter inputs, any text entry.

### Textarea
Auto-sizing textarea with resize-none, matching Input styling and validation states.  
**Use:** Comments, descriptions, long-form text entry, bio fields.

### Select
Dropdown select built on Radix with trigger, content, items, groups, labels, and separators; supports sm/default sizes.  
**Use:** Category selection, country picker, any single-choice dropdown.

### Checkbox
Tri-state checkbox (checked, unchecked, indeterminate) with animated indicator.  
**Use:** Task lists, terms acceptance, multi-select tables, "select all".

### Switch
Toggle switch with thumb that slides left/right; follows same styling as Button variants.  
**Use:** On/off settings, feature flags, preferences, enabled/disabled states.

### Slider
Range slider with single or multiple thumbs, vertical/horizontal orientation, and disabled state.  
**Use:** Price range filters, volume controls, progress indicators, rating scales.

### RadioGroup
Radio button group with circular indicator and keyboard navigation.  
**Use:** Single-choice selection, payment method selection, shipping options.

### Toggle
Single toggle button with pressed state; supports default and outline variants.  
**Use:** View mode toggles (list/grid), filter chips, format toggles.

### ToggleGroup
Grouped toggle buttons with shared context for variant/size; items share borders.  
**Use:** Text formatting toolbars, filter groups, segmented controls.

### Label
Accessible form label linked to inputs via htmlFor; includes error state styling.  
**Use:** All form fields, required field indicators.

### Form
React Hook Form integration with FormProvider, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage.  
**Use:** Any form with validation, complex forms, multi-step wizards.

### InputOTP
One-time password input with individual slots, caret animation, and separator support.  
**Use:** Phone verification, email verification codes, 2FA.

---

## Primitives (Display)

### Badge
Small status indicator with variants (default, secondary, destructive, outline).  
**Use:** Status labels, counts, category tags, "NEW", "BETA" labels.

### Card
Content container with CardHeader (with optional CardAction), CardTitle, CardDescription, CardContent, CardFooter.  
**Use:** Dashboard widgets, feature cards, user profiles, pricing tiers.

### Avatar
User image with AvatarImage and AvatarFallback for initials when image fails to load.  
**Use:** User profiles, comments, author bylines, contact lists.

### Table
Data table with TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption; wraps overflow in horizontal scroll.  
**Use:** Admin panels, data grids, user lists, reports, pricing tables.

### Breadcrumb
Navigation path with BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis.  
**Use:** Deep category navigation, e-commerce paths, documentation.

### Tabs
Tabbed interface with TabsList, TabsTrigger, TabsContent; triggers have active/inactive states.  
**Use:** Settings sections, dashboard panels, feature panels.

### Pagination
Page navigation with PaginationContent, PaginationItem, PaginationLink (active state), PaginationPrevious, PaginationNext, PaginationEllipsis.  
**Use:** List views, search results, user lists, table pagination.

### Progress
Linear progress bar with animated indicator that fills based on value prop.  
**Use:** File uploads, loading states, completion percentage, bandwidth indicators.

### Skeleton
Loading placeholder with pulse animation; wraps any container.  
**Use:** Content loading states, skeleton screens, wireframe placeholders.

### Calendar
Date picker built on react-day-picker with custom classNames theming; supports range mode.  
**Use:** Date selection, scheduling, availability pickers.

### Chart
Recharts wrapper with ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartStyle.  
**Use:** Analytics dashboards, stats visualization, trend charts.

### Carousel
Embla Carousel wrapper with CarouselContent, CarouselItem, CarouselPrevious, CarouselNext; supports horizontal/vertical.  
**Use:** Image galleries, testimonials, feature highlights, hero sections.

---

## Primitives (Overlay/Modal)

### Dialog
Modal dialog with DialogOverlay, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription, DialogClose.  
**Use:** Confirmations, forms in modals, details popups, quick-create forms.

### AlertDialog
Blocking modal dialog for critical confirmations; requires user to choose an action before proceeding.  
**Use:** Delete confirmations, data loss warnings, irreversible action confirmations.

### Drawer
Slide-in panel using Vaul with DrawerOverlay, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription.  
**Use:** Mobile navigation, filter panels, detail views, mobile-specific drawers.

### Sheet
Side panel overlay similar to Drawer; slides from right by default with top/bottom/left variants.  
**Use:** Mobile navigation, quick actions, form sidebars, mobile-specific sheets.

### Popover
Floating content anchored to a trigger via Radix; positioned with align and sideOffset props.  
**Use:** Complex tooltips, contextual actions, date pickers, color pickers.

### HoverCard
Preloaded popover that appears on hover with slight delay; good for previews.  
**Use:** User profile previews, quick info cards, author details on hover.

### Tooltip
Short text hint that appears on hover with arrow; wraps TooltipProvider around content.  
**Use:** Icon-only buttons, truncated text, helper text, keyboard shortcut hints.

### Command
Command palette (Cmd+K style) with CommandDialog, CommandInput, CommandList, CommandGroup, CommandItem, CommandSeparator.  
**Use:** Quick navigation, command search, action palettes, keyboard-driven interfaces.

### DropdownMenu
Context menu triggered by click with items, groups, separators, shortcuts, and destructive variant.  
**Use:** Table row actions, user menus, action menus, gear icons.

### ContextMenu
Right-click context menu with the same API as DropdownMenu.  
**Use:** Right-click actions on cards, table rows, files, or any content.

### Menubar
Horizontal menu bar with MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarSeparator.  
**Use:** Application-style menus (File, Edit, View), admin toolbars.

### NavigationMenu
Full navigation system with NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuLink, NavigationMenuViewport.  
**Use:** Primary site navigation, admin navigation, mega-menu patterns.

---

## Primitives (Layout)

### Accordion
Collapsible accordion with AccordionItem, AccordionTrigger (with chevron), AccordionContent; supports multiple open items.  
**Use:** FAQ pages, feature descriptions, settings groups, collapsible sections.

### Collapsible
Basic collapsible container wrapping CollapsibleTrigger and CollapsibleContent.  
**Use:** Expandable details, optional content, nested sections.

### Separator
Horizontal or vertical divider with decorative prop; uses brown-50 color.  
**Use:** Section dividers, toolbar separators, sidebar group separators.

### ScrollArea
Scrollable container with custom styled ScrollBar (vertical/horizontal) and corner.  
**Use:** Chat windows, code blocks, long lists with custom scrollbars.

### Resizable
Resizable panel group using react-resizable-panels with ResizablePanelGroup, ResizablePanel, ResizableHandle (with optional handle grip).  
**Use:** Split views, dashboard layouts, IDE-style panels, email inbox.

### AspectRatio
Enforced aspect ratio container using Radix AspectRatio primitive.  
**Use:** Images, video embeds, responsive iframes, card thumbnails.

---

## Primitives (Feedback)

### Alert
Inline message box with variants (default, destructive, warning, info, success) and optional AlertTitle/AlertDescription.  
**Use:** Form errors, warnings, info banners, success confirmations.

### Sonner
Toast notification system (sonner) configured with light theme, top-right position, rich colors, and close button.  
**Use:** Action confirmations, error toasts, real-time updates, undo actions.

---

## Primitives (Media)

### Avatar
User avatar with image, fallback initials, and size styling.  
**Use:** User profiles, comments, author bylines, contact lists, team pages.

---

## Blocks (Composite Components)

### CodeBlock
Syntax-highlighted code block with copy-to-clipboard, expand/collapse for long code (>8 lines), animated fade overlay, and show more/less button.  
**Use:** Documentation pages, tutorial pages, API reference pages, changelog pages.

### DashboardCard
Pre-styled card for dashboard widgets with icon, title, description, feature list (up to 4), and badge showing widget count.  
**Use:** Dashboard home page, feature overview pages, widget galleries.

### PinterestLayout
CSS grid-based masonry layout with configurable columns and gap; uses break-inside-avoid for items.  
**Use:** Image galleries, Pinterest-style feeds, masonry grids, portfolio pages.

### SimpleDropdown
Lightweight dropdown without Radix dependencies; uses useEffect for click-outside and Escape key.  
**Use:** Simple dropdown menus, basic action menus, lightweight UI contexts.

---

## Media Helpers

### ImageWithFallback
Image component that shows an SVG placeholder on error (broken image icon).  
**Use:** User uploads, external images, profile pictures, any image that may 404.

---

## Utility Hooks & Functions

### cn()
Class name utility merger (clsx + tailwind-merge) from `lib/utils.ts`; used by all components for className merging.  
**Use:** All component files for conditional className merging.

### useSidebar()
Hook to access SidebarContext for state (expanded/collapsed), open, setOpen, isMobile, toggleSidebar.  
**Use:** Any component that needs to read or control sidebar state.

---

## Import Pattern

```ts
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
```

## Variant System

Most components use `class-variance-authority` (CVA) for variants:

| Component | Variants |
|-----------|----------|
| Button | variant (default, destructive, outline, secondary, ghost, link), size (default, sm, lg, icon) |
| Badge | variant (default, secondary, destructive, outline) |
| Alert | variant (default, destructive, warning, info, success) |
| Toggle | variant (default, outline), size (default, sm, lg) |
| Button | uses CVA with `buttonVariants()` export |

## Dark Mode

Toggle the `dark` class on a root ancestor (e.g., `<html>`). Components read CSS variables that adapt via Tailwind dark mode selectors.

## Design Tokens (in globals.css)

Key CSS variables: `background`, `foreground`, `card`, `card-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `border`, `input`, `ring`, `radius`.