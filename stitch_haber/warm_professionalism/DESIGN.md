---
name: Warm Professionalism
colors:
  surface: '#fff8f6'
  surface-dim: '#e0d8d7'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2f0'
  surface-container: '#f5ecea'
  surface-container-high: '#efe6e5'
  surface-container-highest: '#e9e1df'
  on-surface: '#1e1b1a'
  on-surface-variant: '#504441'
  inverse-surface: '#342f2f'
  inverse-on-surface: '#f7efed'
  outline: '#827471'
  outline-variant: '#d4c3bf'
  surface-tint: '#78564f'
  primary: '#75544d'
  on-primary: '#ffffff'
  primary-container: '#906c64'
  on-primary-container: '#fffbff'
  inverse-primary: '#e8bdb3'
  secondary: '#7b5454'
  on-secondary: '#ffffff'
  secondary-container: '#fecbca'
  on-secondary-container: '#7a5353'
  tertiary: '#47615b'
  on-tertiary: '#ffffff'
  tertiary-container: '#5f7a73'
  on-tertiary-container: '#f4fffa'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdad2'
  primary-fixed-dim: '#e8bdb3'
  on-primary-fixed: '#2d1510'
  on-primary-fixed-variant: '#5e3f38'
  secondary-fixed: '#ffdad9'
  secondary-fixed-dim: '#ecbaba'
  on-secondary-fixed: '#2f1314'
  on-secondary-fixed-variant: '#613d3d'
  tertiary-fixed: '#cce9e0'
  tertiary-fixed-dim: '#b0cdc4'
  on-tertiary-fixed: '#05201b'
  on-tertiary-fixed-variant: '#324c46'
  background: '#fff8f6'
  on-background: '#1e1b1a'
  surface-variant: '#e9e1df'
  brown-50: '#f6f2f0'
  brown-100: '#f0ece9'
  brown-200: '#e2d6d0'
  brown-300: '#d1bfb6'
  brown-400: '#b5978c'
  brown-500: '#947068'
  brown-600: '#7a5a54'
  brown-700: '#664242'
  brown-800: '#4d3232'
  brown-900: '#3d2626'
  success: '#22c55e'
  danger: '#ef4444'
  warning: '#f59e0b'
  info: '#3b82f6'
typography:
  display-2xl:
    fontFamily: Inter
    fontSize: 72px
    fontWeight: '500'
    lineHeight: '1.1'
  display-xl:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: '500'
    lineHeight: '1.1'
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '500'
    lineHeight: '1.2'
  display-md:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '500'
    lineHeight: '1.2'
  display-sm:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: '500'
    lineHeight: '1.3'
  display-xs:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  text-xl:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1.4'
  text-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.4'
  text-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  text-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.5'
  text-xs:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
---

# Stitch App — Design System Specification (`design.md`)
This document serves as the comprehensive design system specification for the Stitch App. It is compiled directly from the application's core CSS architecture, built on **Tailwind CSS v4**, **Tailwind Animate**, and the **Tailwind CSS Typography Plugin**.
---
## 1. Global Architecture & Setup
### 1.1 Source Scanning & Core Plugins
*   **Compiler Platform:** Tailwind CSS v4
*   **Source Paths:** Scan targets include all TypeScript and TSX files relative to the style root: `../**/*.{ts,tsx}`
*   **Custom Dark Variant:** Programmatically bound via the selector structure `@custom-variant dark (&:is(.dark *));`
*   **Core Plugins Integrated:**
    *   `@import "tailwind-animate";`
    *   `@plugin "@tailwindcss/typography";`
    *   `@import "./typography.css";`
---
## 2. Design Tokens & Foundations
### 2.1 Typography Foundations
*   **Sans-Serif Font Family (`--font-family-sans`):** `"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;`
*   **Monospace Font Family (`--font-family-mono`):** `ui-monospace, SFMono-Regular, "SF Mono", Monaco, Inconsolata, "Roboto Mono", monospace;`
*   **Font Weights:**
    *   Regular: `400` (`--font-weight-normal`)
    *   Medium: `500` (`--font-weight-medium`)
#### Typographic Scale & Line Heights
| Token Variable | Font Size | Line Height | Application Context |
| :--- | :--- | :--- | :--- |
| `--text-xs` | `12px` | `1.4` | Captions, small indicators, `h6` elements |
| `--text-sm` | `14px` | `1.5` | Forms, buttons, table copy, labels, `h5` elements |
| `--text-md` / `--text-base` | `16px` | `1.6` | Default body copy, paragraphs, list items, `h4` elements |
| `--text-lg` | `18px` | `1.4` | Blockquotes, prominent callouts, `h3` elements |
| `--text-xl` | `20px` | `1.4` | Lead paragraphs, card headings |
| `--text-display-xs` (`--display-xs`) | `24px` | `1.3` | Section headers, mobile entry headers |
| `--text-display-sm` (`--display-sm`) | `30px` | `1.3` | `h2` elements, dashboard module titles |
| `--text-display-md` (`--display-md`) | `36px` | `1.2` | Page sub-sections, product callouts |
| `--text-display-lg` (`--display-lg`) | `48px` | `1.2` | Standard `h1` main landing page headings |
| `--text-display-xl` (`--display-xl`) | `60px` | `1.1` | Marketing display titles |
| `--text-display-2xl` (`--display-2xl`) | `72px` | `1.1` | Ultra-large editorial display frames |
### 2.2 Grid & Spatial Tokens
*   **Base Spacing Unit (`--spacing`):** `4px` (All layouts, paddings, and margins map to increments of this 4px baseline).
*   **Corner Radii Structure:**
    *   Small (`--radius-sm`): `6px`
    *   Medium (`--radius-md`): `8px`
    *   Default (`--radius` / `--radius-lg`): `10px`
    *   Extra Large (`--radius-xl`): `14px`
---
## 3. The Palette Matrix
The system features a custom warm-toned aesthetic anchored by a dedicated Brown scale and refined warm grays.
### 3.1 The Primitive Color Scales
#### Core Brand Scale (Brown System)
*   `--brown-50`: `#f6f2f0`
*   `--brown-100`: `#f0ece9`
*   `--brown-200`: `#e2d6d0`
*   `--brown-300`: `#d1bfb6`
*   `--brown-400`: `#b5978c`
*   `--brown-500`: `#947068`
*   `--brown-600`: `#7a5a54`
*   `--brown-700`: `#664242`
*   `--brown-800`: `#4d3232`
*   `--brown-900`: `#3d2626`
#### Success Scale (Green)
`#f0fdf4` (50) • `#dcfce7` (100) • `#bbf7d0` (200) • `#86efac` (300) • `#4ade80` (400) • `#22c55e` (500) • `#16a34a` (600) • `#15803d` (700) • `#166534` (800) • `#14532d` (900)
#### Danger Scale (Red)
`#fef2f2` (50) • `#fee2e2` (100) • `#fecaca` (200) • `#fca5a5` (300) • `#f87171` (400) • `#ef4444` (500) • `#dc2626` (600) • `#b91c1c` (700) • `#991b1b` (800) • `#7f1d1d` (900)
#### Warning Scale (Yellow / Amber)
`#fffbeb` (50) • `#fef3c7` (100) • `#fde68a` (200) • `#fcd34d` (300) • `#fbbf24` (400) • `#f59e0b` (500) • `#d97706` (600) • `#b45309` (700) • `#92400e` (800) • `#78350f` (900)
#### Information Scale (Blue)
`#eff6ff` (50) • `#dbeafe` (100) • `#bfdbfe` (200) • `#93c5fd` (300) • `#60a5fa` (400) • `#3b82f6` (500) • `#2563eb` (600) • `#1d4ed8` (700) • `#1e40af` (800) • `#1e3a8a` (900)
---
### 3.2 Contextual Theme Configurations
#### Theme Semantics (Light vs. Dark Mode)
| Token Layer | Variable Name | Light Mode Value | Dark Mode Value |
| :--- | :--- | :--- | :--- |
| **Typography** | `--color-text-primary` | `#2c2420` (Deep Warm Charcoal) | `#fefefe` (Off-white) |
| | `--color-text-secondary` | `#544d47` | `#f3f1ee` |
| | `--color-text-tertiary` | `#6b6058` | `#e8e4df` |
| | `--color-text-quaternary` | `#8a7f73` | `#b5a99c` |
| | `--color-text-placeholder`| `#b5a99c` | `#8a7f73` |
| | `--color-text-disabled` | `#d4cdc1` | `#6b6058` |
| | `--color-text-inverse` | `#ffffff` | `#2c2420` |
| **Surfaces** | `--color-bg-primary` | `#ffffff` | `#1c1816` |
| | `--color-bg-secondary` | `#faf9f7` | `#2c2420` |
| | `--color-bg-tertiary` | `#f3f1ee` | `#544d47` |
| | `--color-bg-quaternary` | `#e8e4df` | `#6b6058` |
| | `--color-bg-active` | `#faf9f7` | `#2c2420` |
| | `--color-bg-hover` | `#fefefe` | `#25221f` |
| | `--color-bg-disabled` | `#faf9f7` | `#2c2420` |
| **Borders** | `--color-border-primary` | `#d1bfb6` | `#6b6058` |
| | `--color-border-secondary`| `#b5a99c` | `#8a7f73` |
| | `--color-border-tertiary` | `#947068` | `#b5a99c` |
| | `--color-border-disabled`| `#f0ede8` | `#544d47` |
| | `--color-border-focus` | `#664242` | — |
| **Text Selection**| `--color-selection-bg` | `#f0ece9` | `#544d47` |
| **Form Caret** | `--color-caret` | `#947068` | `#b5978c` |
#### Core Brand Tokens
*   `--color-fg-brand-primary`: `#947068` (Brown 500)
*   `--color-fg-brand-primary_alt`: `#7a5a54` (Brown 600)
*   `--color-fg-brand-secondary`: `#664242` (Brown 700)
*   `--color-focus-ring`: `#664242`
#### Chart Color Sequence
*   `--chart-1`: `#947068` (Muted Rose Brown)
*   `--chart-2`: `#10b981` (Emerald Green)
*   `--chart-3`: `#f59e0b` (Amber Yellow)
*   `--chart-4`: `#ef4444` (Vibrant Red)
*   `--chart-5`: `#06b6d4` (Cyan Blue)
---
### 3.3 Semantic Status Rules
#### Light Mode
*   **Success:** Surface: `var(--success-100)` (`#dcfce7`) | Text: `var(--success-700)` (`#15803d`) | Base Action: `var(--success-500)` (`#22c55e`)
*   **Danger:** Surface: `var(--danger-100)` (`#fee2e2`) | Text: `var(--danger-700)` (`#b91c1c`) | Base Action: `var(--danger-500)` (`#ef4444`)
*   **Warning:** Surface: `var(--warning-100)` (`#fef3c7`) | Text: `var(--warning-700)` (`#b45309`) | Base Action: `var(--warning-500)` (`#f59e0b`)
*   **Info:** Surface: `var(--info-100)` (`#dbeafe`) | Text: `var(--info-700)` (`#1d4ed8`) | Base Action: `var(--info-500)` (`#3b82f6`)
#### Dark Mode
*   **Success:** Surface: `var(--success-900)` (`#14532d`) | Text: `var(--success-300)` (`#86efac`) | Base Action: `var(--success-400)` (`#4ade80`)
*   **Danger:** Surface: `var(--danger-900)` (`#7f1d1d`) | Text: `var(--danger-300)` (`#fca5a5`) | Base Action: `var(--danger-400)` (`#f87171`)
*   **Warning:** Surface: `var(--warning-900)` (`#78350f`) | Text: `var(--warning-300)` (`#fcd34d`) | Base Action: `var(--warning-400)` (`#fbbf24`)
*   **Info:** Surface: `var(--info-900)` (`#1e3a8a`) | Text: `var(--info-300)` (`#93c5fd`) | Base Action: `var(--info-400)` (`#60a5fa`)
---
### 3.4 Legacy UI & Sidebar Architecture
To ensure backward compatibility (e.g., Shadcn platform conventions), components map to core definitions via standard aliases.
#### Infrastructure Surface Aliases
*   `--background`: `var(--color-bg-primary)`
*   `--foreground`: `var(--color-text-primary)`
*   `--card` / `--popover`: `var(--color-bg-primary)`
*   `--card-foreground` / `--popover-foreground`: `var(--color-text-primary)`
*   `--primary`: Light: `var(--brown-600)` | Dark: `var(--brown-400)`
*   `--primary-foreground`: `var(--color-text-inverse)`
*   `--secondary` / `--muted`: `var(--color-bg-secondary)`
*   `--secondary-foreground`: `var(--color-text-primary)`
*   `--muted-foreground`: `var(--color-text-tertiary)`
*   `--accent`: Light: `var(--brown-50)` | Dark: `var(--brown-800)`
*   `--accent-foreground`: Light: `var(--brown-700)` | Dark: `var(--brown-200)`
*   `--destructive`: Light: `var(--danger-500)` | Dark: `var(--danger-400)`
*   `--destructive-foreground`: Light: `var(--color-text-inverse)` | Dark: `var(--color-text-primary)`
*   `--border` / `--input`: `var(--color-border-primary)`
*   `--input-background`: `var(--color-bg-primary)`
*   `--switch-background`: `var(--color-border-secondary)`
*   `--ring`: `var(--color-focus-ring)`
#### Sidebar Component Matrix
| Sidebar Token Token | Light Mode Baseline | Dark Mode Baseline |
| :--- | :--- | :--- |
| `--sidebar` | `var(--color-bg-primary)` | `var(--color-bg-secondary)` |
| `--sidebar-foreground` | `var(--color-text-primary)` | `var(--color-text-primary)` |
| `--sidebar-primary" | "#947068" (Brown 500) | "#947068" (Brown 500) |
| `--sidebar-primary-foreground`| `var(--color-text-inverse)` | `var(--color-text-primary)` |
| `--sidebar-accent` | `var(--color-bg-hover)` | `var(--color-bg-primary)` |
| `--sidebar-accent-foreground` | `var(--color-text-secondary)`| `var(--color-text-primary)` |
| `--sidebar-border` | `var(--color-border-primary)`| `var(--color-border-primary)`|
| `--sidebar-ring` | `var(--color-focus-ring)` | `var(--color-focus-ring)` |
---
## 4. Global Interactive & Base Styling
### 4.1 HTML Document Layer
*   **Global Box Model Reset:** Elements default to explicit theme borders and interactive focus controls (`@apply border-border outline-ring/50;`).
*   **Body Configurations:**
    *   `font-family: var(--font-family-sans);`
    *   `font-feature-settings: "cv02", "cv03", "cv04", "cv11";` (Optimized legible character alternates for Inter).
    *   `font-variation-settings: normal;`
### 4.2 Interactive Selections & Fields
*   **User Selections (`::selection`):** Renders with soft text selection corner adjustments (`border-radius: 3px`) running atop theme background definitions (`var(--color-selection-bg)`).
*   **Caret Indicator Typing Logic:** Text inputs, textareas, and generic `[contenteditable]` zones inherit specific custom active accent properties (`caret-color: var(--color-caret);`).
