# Front-End Development Workflow

Steps for building pages from Stitch exports into production-ready React components.

---

## 1. Read the issue and locate stitch exports

- Read the issue description carefully and identify which screens are required.
- Find the corresponding folder(s) in `stitch_haber/` (e.g. `stitch_haber/login_email_entry/`).
- Load `code.html` and `screen.png` from each folder into context.

## 2. Break down components and plan skeletons

- From the stitch HTML and PNG, decompose the page into named React components (e.g. `ChildProfileCard`, `SessionTable`).
- For each component, identify its skeleton loading counterpart using the `Skeleton` primitive.

## 3. Map to the design system

- Cross-reference `stitch_haber/design.md` for token values (colors, spacing, radii, typography).
- Prefer existing components over building new ones.

## 4. Generate React component code

- Invoke the `stitch-to-react` skill when converting stitch HTML to TSX.
- Use existing design system components (`Button`, `Card`, `Table`, etc.) from `@/components/ui/*`.
- Use semantic token classes (`bg-background`, `text-foreground`, `border-border`, etc.) — avoid raw hex values.
- Create new components only when no existing primitive or block satisfies the requirement.
- Skeleton components mirror the real layout using `Skeleton` in place of content.

## 5. Complete event handlers, state, and API logic

- Wire tRPC queries and mutations.
- Manage client state (auth tokens, UI state) through the Zustand stores in `@/stores/`.
- Handle loading, error, and empty states for every async operation.
- Complete all event handlers so the feature is fully functional end-to-end.
