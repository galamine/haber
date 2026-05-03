# Frontend design system (@haber/frontend)

This package follows a **tokens → primitives → composites** structure: semantic CSS variables and Tailwind v4, Radix-based UI primitives under `components/ui`, and feature-oriented building blocks beside them.

## Principles

- **Single visual language** — Brown-neutral palette, Inter, and shared radii/spacing live in `src/styles/globals.css` and `typography.css`. Prefer semantic utilities (`bg-background`, `text-foreground`, `border-border`) over raw hex in product screens.
- **One entry stylesheet** — `main.tsx` imports `@/styles/globals.css` only. Tailwind is activated via the Vite plugin (`@tailwindcss/vite`), not a legacy `tailwind.config` theme file.
- **Composable UI** — Import primitives from `@/components/ui/*`. App chrome (logo, sidebar, page header) lives under `components/shell/`; reusable non-primitive blocks under `components/blocks/`; images and fallbacks under `components/media/`.

## Layout

| Area | Path |
|------|------|
| Design tokens + Tailwind layers | `src/styles/globals.css`, `src/styles/typography.css` |
| `cn()` helper | `src/lib/utils.ts` |
| Primitives (Radix + CVA) | `src/components/ui/` |
| Shell (logo, sidebar, headers) | `src/components/shell/` |
| Shared blocks (cards, layouts, code) | `src/components/blocks/` |
| Media helpers | `src/components/media/` |
| Route guards | `src/routes/` |
| Static assets for UI demos | `src/constants/` |
| Cross-cutting hooks | `src/hooks/` |

## Imports

```ts
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
```

Dark mode follows the usual shadcn convention: toggle the `dark` class on a root ancestor (e.g. `<html>`).

## Extending primitives

New files under `components/ui/` may pull in extra libraries (`sonner`, `vaul`, `recharts`, etc.). Add dependencies only for components you ship; remove unused primitives rather than installing deps “just in case.”
