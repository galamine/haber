# Plan: Migrate haber to Desact Design System

## Context

Replace haber's current shadcn/@base-ui design system with the Desact design system
(shadcn/@radix-ui). The Desact repo ships a self-contained portable bundle at
`/Users/faiyaz/workspace/Desact/DESACT/`. The migration targets `packages/ui` only —
the web app (`apps/web`) imports everything via `@haber-final/ui/*` and its imports don't change.

---

## Version Conflict Analysis

| Package | Desact | Haber UI | Verdict |
|---------|--------|----------|---------|
| react | ^18.3.1 | ^19.2.6 (catalog) | Low risk — `forwardRef` is deprecated but functional in React 19 |
| react-resizable-panels | ^2.1.7 | **^4.11.2** | **Breaking** — v4 has incompatible API, keep haber's `resizable.tsx` |
| react-day-picker | ^8.10.1 | (not installed) | Skip `calendar.tsx` — v8 peer dep says <19, web app doesn't use it |
| lucide-react | ^0.487.0 | **^0.546.0** | Compatible — haber's v0.546 is newer than Desact's v0.487, both v0.x |
| tailwindcss | * | ^4.1.18 (ui) / ^4.2.2 (web) | Compatible — v4.2 is backward-compatible with v4.1 CSS |
| class-variance-authority | ^0.7.1 | ^0.7.1 | Same |
| tailwind-merge | * | ^3.3.1 | Compatible |
| sonner | ^2.0.3 | ^2.0.5 | Compatible |
| react-hook-form | ^7.55.0 | ^7.76.1 | Compatible |
| cmdk | ^1.1.1 | ^1.1.1 | Same |
| framer-motion | * | **not installed** | Add — use latest (v12.x, React 19 compatible) |
| vaul | ^1.1.2 | **not installed** | Add latest v1.x |
| embla-carousel-react | ^8.6.0 | **not installed** | Add latest v8.x |
| input-otp | ^1.4.2 | **not installed** | Add latest v1.x |
| recharts | ^2.15.2 | **not installed** | Add ^2.x (React 19 compatible via compat shim) |
| @tailwindcss/typography | * | **not installed** | Add — needed by globals.css import |

---

## Phase 1 — Update `packages/ui/package.json`

**Remove:**
- `@base-ui/react`
- `tw-animate-css`
- `shadcn` (runtime no longer needed)

**Add to `dependencies`:**
```json
"@radix-ui/react-accordion": "^1.2.3",
"@radix-ui/react-alert-dialog": "^1.1.6",
"@radix-ui/react-aspect-ratio": "^1.1.2",
"@radix-ui/react-avatar": "^1.1.3",
"@radix-ui/react-checkbox": "^1.1.4",
"@radix-ui/react-collapsible": "^1.1.3",
"@radix-ui/react-context-menu": "^2.2.6",
"@radix-ui/react-dialog": "^1.1.6",
"@radix-ui/react-dropdown-menu": "^2.1.6",
"@radix-ui/react-hover-card": "^1.1.6",
"@radix-ui/react-label": "^2.1.2",
"@radix-ui/react-menubar": "^1.1.6",
"@radix-ui/react-navigation-menu": "^1.2.5",
"@radix-ui/react-popover": "^1.1.6",
"@radix-ui/react-progress": "^1.1.2",
"@radix-ui/react-radio-group": "^1.2.3",
"@radix-ui/react-scroll-area": "^1.2.3",
"@radix-ui/react-select": "^2.1.6",
"@radix-ui/react-separator": "^1.1.2",
"@radix-ui/react-slider": "^1.2.3",
"@radix-ui/react-slot": "^1.1.2",
"@radix-ui/react-switch": "^1.1.3",
"@radix-ui/react-tabs": "^1.1.3",
"@radix-ui/react-toggle": "^1.1.2",
"@radix-ui/react-toggle-group": "^1.1.2",
"@radix-ui/react-tooltip": "^1.1.8",
"embla-carousel-react": "^8.6.0",
"framer-motion": "^12.0.0",
"input-otp": "^1.4.2",
"recharts": "^2.15.2",
"vaul": "^1.1.2"
```

**Add to `devDependencies`:**
```json
"@tailwindcss/typography": "^0.5.15"
```

Note: `@tailwindcss/typography` v0.5.x supports the Tailwind v4 CSS `@import` syntax.
Keep the existing `react-resizable-panels: ^4.11.2` — do **not** downgrade it to Desact's v2.

---

## Phase 2 — Replace globals.css in `packages/ui/src/styles/`

**Strategy:** Use Desact's globals.css as the base but merge in haber's critical directives.

Build the new `globals.css` with this header (order matters):

```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap");
@import "tailwindcss";
@import "@tailwindcss/typography";
@import "./typography.css";

/* Tailwind content scanning — covers the full haber monorepo */
@source "../../../apps/**/*.{ts,tsx}";
@source "../**/*.{ts,tsx}";

@custom-variant dark (&:is(.dark *));
```

Then paste the full `:root { ... }` and `.dark { ... }` variable blocks from Desact's
`DESACT/styles/globals.css` exactly (design tokens, `@theme inline`, component overrides,
sidebar tokens, typography element styles).

**Remove** these lines from Desact's version (not needed):
- `@import "tw-animate-css"` — not in haber
- `@import "shadcn/tailwind.css"` — Desact doesn't have this, but verify it's absent

**Add** `packages/ui/src/styles/typography.css` — copy `DESACT/styles/typography.css` verbatim.

---

## Phase 3 — Replace components in `packages/ui/src/components/`

Copy all files from `DESACT/ui/` into `packages/ui/src/components/`, **with these exceptions:**

### Skip (version or dependency conflicts):
- **`calendar.tsx`** — requires react-day-picker v8 which has React 19 peer dep conflict;
  web app doesn't use it; delete after copying
- **`resizable.tsx`** — Desact uses react-resizable-panels v2 API; haber has v4 installed;
  keep haber's existing `resizable.tsx` (do not overwrite)

### Keep haber's version:
- **`resizable.tsx`** — already works with react-resizable-panels v4

All other 47 components from DESACT/ui/ can be copied directly. Their relative imports resolve correctly:
- `../lib/utils` → `packages/ui/src/lib/utils.ts` ✓ (same `cn()` implementation)
- `../hooks/use-mobile` → added in Phase 4
- `@radix-ui/react-*` → installed in Phase 1

The package.json export glob `"./components/*": "./src/components/*.tsx"` covers all new files automatically.

---

## Phase 4 — Add the mobile hook

Copy `DESACT/hooks/use-mobile.ts` → `packages/ui/src/hooks/use-mobile.ts`.
This is required by `sidebar.tsx`.

---

## Phase 5 — Install dependencies

From the monorepo root:
```bash
pnpm install
```

This installs all new @radix-ui packages, removes @base-ui and tw-animate-css, and
installs the new optional packages.

---

## Phase 6 — Biome compliance pass

Haber enforces Biome on all staged files via lint-staged (`biome check --write`). Running it
proactively after copying avoids a wall of issues on first commit.

### Known style gaps between Desact code and haber's biome.json

| Issue | Biome rule | Auto-fixable? |
|-------|-----------|---------------|
| 2-space indent → tabs | `formatter.indentStyle: "tab"` | ✓ Yes |
| Tailwind class order in `cn()`/`cva()`/`clsx()` | `nursery.useSortedClasses` (warn, safe fix) | ✓ Yes |
| Import order reorganization | `assist.organizeImports: on` | ✓ Yes |
| `"use client"` directives (Next.js artifact, meaningless in Vite) | Not a lint error, but noise | Manual remove |
| Redundant type annotations | `style.noInferrableTypes` (error) | ✓ Yes |
| `else` after `return` | `style.noUselessElse` (error) | ✓ Yes |

Note: Desact already uses **double quotes** everywhere — matches haber's `quoteStyle: "double"` ✓

### Step 1 — Remove `"use client"` directives

Some Desact components (sidebar.tsx and possibly others) include `"use client"` for Next.js
App Router compatibility. This is meaningless in a Vite app and is a loose string expression.
Remove the directive and its trailing blank line from any affected files:

```bash
# Find all affected components
grep -rl '"use client"' packages/ui/src/components/
```

For each file listed, delete the first line (`"use client";`) and the blank line after it.

### Step 2 — Auto-fix all formatting and lint issues

Run Biome's write mode against the entire packages/ui source tree:

```bash
pnpm biome check --write packages/ui/src/
```

This one command handles: indentation, Tailwind class sorting, import order, and all
safe-fix style rules in a single pass.

### Step 3 — Check for remaining manual issues

```bash
pnpm biome check packages/ui/src/
```

Any remaining errors after Step 2 are non-auto-fixable and need manual attention.
Expected to be zero or very few — Desact's component code is clean.

---

## Phase 8 — Spot-check `apps/web` for breakage

The web app import paths don't change. Review these specific files for API compatibility:

**`apps/web/src/components/shell/AppShell.tsx`** — sidebar
- Uses `SidebarProvider`, `Sidebar`, `SidebarContent`, `SidebarHeader`, `SidebarFooter`,
  `SidebarInset`, `SidebarGroup`, `SidebarGroupContent`, `SidebarMenu`, `SidebarMenuItem`,
  `SidebarMenuButton`
- Desact's sidebar exports the same sub-component names with the same prop API ✓
- Verify `SidebarMenuButton` still accepts `isActive` and `asChild` props

**`apps/web/src/routes/_authenticated/settings/staff/index.tsx`** — button + avatar
- Uses `variant="outline"`, `size="sm"` on Button — both exist in Desact ✓
- Uses `<Avatar>` with className sizing — same API ✓

**`apps/web/src/routes/login.tsx`** — uses custom inline `<input>` elements, not UI package ✓

**`apps/web/src/routes/__root.tsx`** — uses `<Toaster />` from sonner — same import ✓

**`apps/web/src/index.css`** — no change needed:
```css
@import "@haber-final/ui/globals.css";  /* still resolves to packages/ui/src/styles/globals.css */
```

---

## Phase 9 — Type check and smoke test

```bash
# From packages/ui
pnpm check-types

# From apps/web (or monorepo root)
pnpm dev:web
```

Fix any TypeScript errors from changed component props (most likely in sidebar or button).

---

## Verification Checklist

1. `pnpm check-types` passes with no errors in `packages/ui`
2. Dev server starts at `:3001` without Vite module errors
3. `/login` renders — email input + OTP flow usable
4. AppShell sidebar opens/closes, nav links active state works
5. `/settings/staff` renders the table, invite button opens modal
6. Dark mode toggle switches `.dark` on `<html>`, all semantic colors respond
7. `/ui-test` renders without crashes
8. No missing icon errors (lucide-react icons in sidebar/components resolve)

---

## Summary of Files Modified

| File | Action |
|------|--------|
| `packages/ui/package.json` | Remove @base-ui/tw-animate/shadcn; add @radix-ui + optional packages |
| `packages/ui/src/styles/globals.css` | Merge Desact tokens with haber's @source directives |
| `packages/ui/src/styles/typography.css` | New — copy from DESACT/styles/typography.css |
| `packages/ui/src/components/*.tsx` | Replace all except `resizable.tsx`; skip `calendar.tsx` |
| `packages/ui/src/hooks/use-mobile.ts` | New — copy from DESACT/hooks/use-mobile.ts |

## Files NOT changed

| File | Reason |
|------|--------|
| `packages/ui/src/lib/utils.ts` | Same `cn()` implementation |
| `packages/ui/src/components/resizable.tsx` | Keep haber's v4-compatible version |
| `apps/web/src/index.css` | Still imports `@haber-final/ui/globals.css` |
| `apps/web/vite.config.ts` | Already has `tailwindcss()` plugin, `@tailwindcss/vite ^4.2.2` |
| All `apps/web/src/routes/*.tsx` | Component import API is backward-compatible |
