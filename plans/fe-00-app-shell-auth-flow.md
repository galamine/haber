# FE-00: App Shell, Sidebar Navigation & OTP Auth Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated app shell with a role-filtered sidebar and the two-step OTP login flow, wiring auth state through Zustand + TanStack Router context.

**Architecture:** Zustand auth store (persisted to localStorage) holds tokens, role, and last-activity timestamp. The store is passed into TanStack Router's context; `beforeLoad` on `_authenticated.tsx` gate-checks `isAuthenticated`. The root layout is stripped of its Header; authenticated routes render a full-height `SidebarProvider` shell (`AppShell`); the login page renders a centered card. `httpBatchLink` reads the access token dynamically per request for `protectedProcedure` calls. A `setTimeout` in the auth store schedules a token refresh 1 minute before the 15-min access token expires.

**Tech Stack:** React 18, TanStack Router v1 (file-based), Zustand 5 + `persist` middleware, tRPC v11 + `httpBatchLink`, `@habe-final/ui` (Sidebar, InputOTP), Lucide React icons, Tailwind CSS v4 with the project's warm brown design tokens.

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Install | `apps/web` | Add `zustand` dependency |
| Create | `apps/web/src/stores/auth.ts` | Persisted auth state + refresh timer |
| Modify | `apps/web/src/utils/trpc.ts` | Add dynamic `Authorization` header |
| Modify | `apps/web/src/routes/__root.tsx` | Remove `Header`, simplify layout |
| Modify | `apps/web/src/main.tsx` | Add `auth` to router context |
| Create | `apps/web/src/routes/login.tsx` | Two-step OTP login page |
| Create | `apps/web/src/components/shell/AppShell.tsx` | Sidebar shell with role-based nav |
| Create | `apps/web/src/routes/_authenticated.tsx` | Auth guard + AppShell layout route |
| Create | `apps/web/src/routes/_authenticated/dashboard.tsx` | Dashboard placeholder |
| Modify | `apps/web/src/routes/index.tsx` | Redirect to /dashboard or /login |

---

## Task 1: Install Zustand

**Files:**
- Modify: `apps/web/package.json` (via pnpm)

- [ ] **Step 1: Install zustand in the web workspace**

```bash
pnpm --filter web add zustand
```

Expected: `packages/web/node_modules/zustand` appears, `package.json` shows `"zustand": "^5.x.x"`.

- [ ] **Step 2: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add zustand for auth state management"
```

---

## Task 2: Create the auth store

**Files:**
- Create: `apps/web/src/stores/auth.ts`

The store holds `accessToken`, `refreshToken`, `role`, `tenantId`, `userId`, `isAuthenticated`, and `lastActivity`. It persists everything except the in-memory refresh timer. `setTokens()` decodes the JWT `exp` claim client-side (via `atob`) and schedules a refresh 1 minute before expiry.

- [ ] **Step 1: Create the store file**

Create `apps/web/src/stores/auth.ts` with the following content:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { UserRole } from "@habe-final/db";

type AuthState = {
	accessToken: string | null;
	refreshToken: string | null;
	role: UserRole | null;
	tenantId: string | null;
	userId: string | null;
	isAuthenticated: boolean;
	lastActivity: number;
	setTokens: (accessToken: string, refreshToken: string) => void;
	clearTokens: () => void;
	updateActivity: () => void;
	isIdle: () => boolean;
};

function parseJwt(token: string): Record<string, unknown> | null {
	try {
		return JSON.parse(atob(token.split(".")[1]));
	} catch {
		return null;
	}
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRefresh(accessToken: string, refreshToken: string) {
	if (refreshTimer) clearTimeout(refreshTimer);
	const payload = parseJwt(accessToken);
	if (!payload || typeof payload.exp !== "number") return;
	const msUntilRefresh = payload.exp * 1000 - Date.now() - 60_000;
	if (msUntilRefresh <= 0) return;
	refreshTimer = setTimeout(async () => {
		const { trpcClient } = await import("../utils/trpc");
		try {
			const result = await trpcClient.auth.refreshToken.mutate({
				refreshToken,
			});
			useAuthStore.getState().setTokens(result.accessToken, result.refreshToken);
		} catch {
			useAuthStore.getState().clearTokens();
		}
	}, msUntilRefresh);
}

export const useAuthStore = create<AuthState>()(
	persist(
		(set, get) => ({
			accessToken: null,
			refreshToken: null,
			role: null,
			tenantId: null,
			userId: null,
			isAuthenticated: false,
			lastActivity: 0,

			setTokens: (accessToken, refreshToken) => {
				const payload = parseJwt(accessToken);
				set({
					accessToken,
					refreshToken,
					isAuthenticated: true,
					role: (payload?.role as UserRole) ?? null,
					tenantId: (payload?.tenantId as string) ?? null,
					userId: (payload?.sub as string) ?? null,
					lastActivity: Date.now(),
				});
				scheduleRefresh(accessToken, refreshToken);
			},

			clearTokens: () => {
				if (refreshTimer) clearTimeout(refreshTimer);
				refreshTimer = null;
				set({
					accessToken: null,
					refreshToken: null,
					role: null,
					tenantId: null,
					userId: null,
					isAuthenticated: false,
					lastActivity: 0,
				});
			},

			updateActivity: () => set({ lastActivity: Date.now() }),

			isIdle: () => {
				const { lastActivity } = get();
				return Date.now() - lastActivity > 24 * 60 * 60 * 1000;
			},
		}),
		{ name: "haber-auth" },
	),
);
```

- [ ] **Step 2: Verify it type-checks**

```bash
pnpm check-types 2>&1 | grep -E "auth.ts|error"
```

Expected: No errors from `stores/auth.ts`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/stores/auth.ts
git commit -m "feat(web): create Zustand auth store with JWT parsing and refresh timer"
```

---

## Task 3: Add Bearer token header to tRPC client

**Files:**
- Modify: `apps/web/src/utils/trpc.ts`

The `httpBatchLink` needs a `headers` function that reads the current access token from the store on every request. This enables `protectedProcedure` calls (logout, logoutAll) to authenticate.

- [ ] **Step 1: Update trpc.ts**

Replace the contents of `apps/web/src/utils/trpc.ts`:

```ts
import type { AppRouter } from "@habe-final/api/routers/index";
import { env } from "@habe-final/env/web";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";

export const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) => {
			toast.error(error.message, {
				action: {
					label: "retry",
					onClick: query.invalidate,
				},
			});
		},
	}),
});

export const trpcClient = createTRPCClient<AppRouter>({
	links: [
		httpBatchLink({
			url: `${env.VITE_SERVER_URL}/trpc`,
			headers: () => {
				const token = useAuthStore.getState().accessToken;
				return token ? { Authorization: `Bearer ${token}` } : {};
			},
		}),
	],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
	client: trpcClient,
	queryClient,
});
```

- [ ] **Step 2: Verify type-check**

```bash
pnpm check-types 2>&1 | grep -E "trpc.ts|error"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/utils/trpc.ts
git commit -m "feat(web): send Authorization Bearer token in tRPC requests"
```

---

## Task 4: Simplify root layout (remove Header)

**Files:**
- Modify: `apps/web/src/routes/__root.tsx`

Remove the `Header` import and the `grid h-svh grid-rows-[auto_1fr]` wrapper. Authenticated routes bring their own full-height layout via `AppShell`; login provides its own centered layout.

- [ ] **Step 1: Update __root.tsx**

Replace `apps/web/src/routes/__root.tsx` with:

```tsx
import { Toaster } from "@habe-final/ui/components/sonner";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ThemeProvider } from "@/components/theme-provider";
import type { useAuthStore } from "@/stores/auth";
import type { trpc } from "@/utils/trpc";

import "../index.css";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
	auth: ReturnType<typeof useAuthStore.getState>;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	head: () => ({
		meta: [
			{ title: "HaberApp" },
			{ name: "description", content: "HaberApp Clinical Platform" },
		],
		links: [{ rel: "icon", href: "/favicon.ico" }],
	}),
});

function RootComponent() {
	return (
		<>
			<HeadContent />
			<ThemeProvider
				attribute="class"
				defaultTheme="light"
				disableTransitionOnChange
				storageKey="vite-ui-theme"
			>
				<Outlet />
				<Toaster richColors />
			</ThemeProvider>
			<TanStackRouterDevtools position="bottom-left" />
			<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
		</>
	);
}
```

- [ ] **Step 2: Verify type-check**

```bash
pnpm check-types 2>&1 | grep "__root"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/__root.tsx
git commit -m "refactor(web): remove Header from root layout to support full-height auth shell"
```

---

## Task 5: Wire auth store into router context

**Files:**
- Modify: `apps/web/src/main.tsx`

- [ ] **Step 1: Update main.tsx**

Replace `apps/web/src/main.tsx` with:

```tsx
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import ReactDOM from "react-dom/client";

import Loader from "./components/loader";
import { routeTree } from "./routeTree.gen";
import { useAuthStore } from "./stores/auth";
import { queryClient, trpc } from "./utils/trpc";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	scrollRestoration: true,
	defaultPendingComponent: () => <Loader />,
	context: { trpc, queryClient, auth: useAuthStore.getState() },
	Wrap: function WrapComponent({ children }: { children: React.ReactNode }) {
		return (
			<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
		);
	},
});

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("app");

if (!rootElement) {
	throw new Error("Root element not found");
}

if (!rootElement.innerHTML) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<RouterProvider router={router} />);
}
```

- [ ] **Step 2: Verify type-check**

```bash
pnpm check-types 2>&1 | grep "main.tsx"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/main.tsx
git commit -m "feat(web): add auth store to TanStack Router context"
```

---

## Task 6: Build the OTP login page

**Files:**
- Create: `apps/web/src/routes/login.tsx`

Two-step flow: Step 1 collects email and calls `requestOtp`; on success, shows Step 2 (OTP entry). Step 2 calls `verifyOtp`; on success, stores tokens and redirects to `/dashboard`. Error states: wrong code with attempt counter, expired OTP, and rate-limit message.

The stitch design uses a centered card (`max-w-md`) with a warm brown top accent bar, a `medical_services` logo icon, and the project's semantic token classes (`bg-background`, `text-on-surface`, `text-brown-600`, etc.).

- [ ] **Step 1: Create login.tsx**

Create `apps/web/src/routes/login.tsx`:

```tsx
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@habe-final/ui/components/input-otp";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { Stethoscope } from "lucide-react";
import { useState } from "react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

export const Route = createFileRoute("/login")({
	beforeLoad: ({ context }) => {
		if (context.auth.isAuthenticated) {
			throw redirect({ to: "/_authenticated/dashboard" });
		}
	},
	component: LoginPage,
});

function LoginPage() {
	const [step, setStep] = useState<"email" | "otp">("email");
	const [email, setEmail] = useState("");
	const [otp, setOtp] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);

	const router = useRouter();
	const setTokens = useAuthStore((s) => s.setTokens);

	const requestOtpMutation = trpc.auth.requestOtp.useMutation();
	const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();

	async function handleRequestOtp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			await requestOtpMutation.mutateAsync({ email });
			setStep("otp");
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Something went wrong";
			if (msg.includes("TOO_MANY_REQUESTS") || msg.includes("Too many")) {
				setError("Too many requests, try again in 10 minutes");
			} else {
				setError("Failed to send code. Check your email and try again.");
			}
		}
	}

	async function handleVerifyOtp(e: React.FormEvent) {
		e.preventDefault();
		setError(null);
		try {
			const result = await verifyOtpMutation.mutateAsync({ email, code: otp });
			setTokens(result.accessToken, result.refreshToken);
			router.navigate({ to: "/_authenticated/dashboard" });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "";
			if (msg.includes("UNAUTHORIZED") || msg.toLowerCase().includes("invalid")) {
				const remaining = attemptsLeft !== null ? attemptsLeft - 1 : 4;
				if (remaining <= 0) {
					setError("OTP invalidated, request a new one");
					setStep("email");
					setOtp("");
					setAttemptsLeft(null);
				} else {
					setAttemptsLeft(remaining);
					setError(`Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining`);
				}
			} else {
				setError("Something went wrong. Please try again.");
			}
		}
	}

	return (
		<div className="bg-background min-h-screen flex items-center justify-center p-4">
			<main className="w-full max-w-md bg-white rounded-xl shadow-sm border border-border p-8 flex flex-col gap-6 relative overflow-hidden">
				<div className="absolute top-0 left-0 w-full h-1 bg-brown-600" />

				{step === "email" ? (
					<>
						<div className="flex flex-col items-center text-center">
							<div className="w-16 h-16 bg-brown-50 rounded-xl flex items-center justify-center mb-4 border border-brown-200">
								<Stethoscope className="w-8 h-8 text-brown-800" />
							</div>
							<h1 className="text-3xl font-black text-brown-800 mb-1">HaberApp</h1>
							<h2 className="text-xl font-medium text-on-surface mt-2">Welcome to HaberApp</h2>
							<p className="text-sm text-on-surface-variant mt-1">
								Enter your clinic email to receive a login code
							</p>
						</div>

						<form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
							<div className="flex flex-col gap-1">
								<label htmlFor="email" className="text-sm font-medium text-on-surface">
									Email Address
								</label>
								<input
									id="email"
									type="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									placeholder="doctor@clinic.com"
									className="w-full px-4 py-2 rounded-lg border border-brown-300 bg-white focus:outline-none focus:ring-2 focus:ring-brown-700 text-on-surface text-sm"
								/>
							</div>

							{error && (
								<p className="text-sm text-danger">{error}</p>
							)}

							<button
								type="submit"
								disabled={requestOtpMutation.isPending}
								className="w-full mt-2 py-2 px-6 bg-brown-600 hover:bg-brown-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
							>
								{requestOtpMutation.isPending ? "Sending…" : "Send OTP"}
							</button>
						</form>
					</>
				) : (
					<>
						<div className="flex flex-col items-center text-center">
							<div className="w-16 h-16 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center mb-6">
								<span className="text-3xl">🔐</span>
							</div>
							<h1 className="text-2xl font-medium text-on-surface mb-2">Verify Identity</h1>
							<p className="text-sm text-on-surface-variant">
								Enter the 6-digit code sent to <strong>{email}</strong>
							</p>
						</div>

						<form onSubmit={handleVerifyOtp} className="flex flex-col items-center gap-4">
							<InputOTP
								maxLength={6}
								value={otp}
								onChange={setOtp}
							>
								<InputOTPGroup>
									<InputOTPSlot index={0} />
									<InputOTPSlot index={1} />
									<InputOTPSlot index={2} />
									<InputOTPSlot index={3} />
									<InputOTPSlot index={4} />
									<InputOTPSlot index={5} />
								</InputOTPGroup>
							</InputOTP>

							{error && (
								<p className="text-sm text-danger text-center">{error}</p>
							)}

							<button
								type="submit"
								disabled={verifyOtpMutation.isPending || otp.length < 6}
								className="w-full bg-primary hover:bg-brown-600 disabled:opacity-60 text-white py-3 rounded-lg text-sm font-medium transition-colors"
							>
								{verifyOtpMutation.isPending ? "Verifying…" : "Verify and Login"}
							</button>
						</form>

						<div className="text-center">
							<p className="text-sm text-on-surface-variant">
								Didn't receive a code?{" "}
								<button
									type="button"
									onClick={() => { setStep("email"); setError(null); setOtp(""); }}
									className="text-brown-600 font-medium hover:underline"
								>
									Resend code
								</button>
							</p>
						</div>
					</>
				)}

				<div className="text-center">
					<p className="text-sm text-on-surface-variant">
						Need help?{" "}
						<a href="mailto:support@haberapp.com" className="text-brown-600 font-medium hover:underline">
							Contact IT Support
						</a>
					</p>
				</div>
			</main>
		</div>
	);
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm check-types 2>&1 | grep "login.tsx"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/login.tsx
git commit -m "feat(web): add two-step OTP login page with error states"
```

---

## Task 7: Build AppShell (sidebar shell component)

**Files:**
- Create: `apps/web/src/components/shell/AppShell.tsx`

Uses the `Sidebar`, `SidebarProvider`, `SidebarHeader`, `SidebarContent`, `SidebarFooter`, `SidebarMenu`, `SidebarMenuItem`, `SidebarMenuButton`, `SidebarInset` primitives from `@habe-final/ui/components/sidebar`.

Role-based nav visibility:
- All roles: Dashboard, Children, Sessions Today
- THERAPIST | CLINIC_ADMIN | SUPER_ADMIN: Assessments, Treatment Plans
- CLINIC_ADMIN | SUPER_ADMIN: Staff, Clinic Settings, Reports
- SUPER_ADMIN only: Platform Overview

- [ ] **Step 1: Create the component**

Create `apps/web/src/components/shell/AppShell.tsx`:

```tsx
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@habe-final/ui/components/sidebar";
import { Link, Outlet, useRouter } from "@tanstack/react-router";
import {
	BarChart2,
	Baby,
	CalendarDays,
	ClipboardList,
	LayoutDashboard,
	LineChart,
	LogOut,
	Settings,
	Shield,
	Stethoscope,
	Users,
} from "lucide-react";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

type NavItem = {
	label: string;
	to: string;
	icon: React.ReactNode;
	roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
	{ label: "Dashboard", to: "/_authenticated/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
	{ label: "Children", to: "/_authenticated/dashboard", icon: <Baby className="w-4 h-4" /> },
	{ label: "Sessions Today", to: "/_authenticated/dashboard", icon: <CalendarDays className="w-4 h-4" /> },
	{
		label: "Assessments",
		to: "/_authenticated/dashboard",
		icon: <BarChart2 className="w-4 h-4" />,
		roles: ["THERAPIST", "CLINIC_ADMIN", "SUPER_ADMIN"],
	},
	{
		label: "Treatment Plans",
		to: "/_authenticated/dashboard",
		icon: <ClipboardList className="w-4 h-4" />,
		roles: ["THERAPIST", "CLINIC_ADMIN", "SUPER_ADMIN"],
	},
	{
		label: "Staff",
		to: "/_authenticated/dashboard",
		icon: <Users className="w-4 h-4" />,
		roles: ["CLINIC_ADMIN", "SUPER_ADMIN"],
	},
	{
		label: "Clinic Settings",
		to: "/_authenticated/dashboard",
		icon: <Settings className="w-4 h-4" />,
		roles: ["CLINIC_ADMIN", "SUPER_ADMIN"],
	},
	{
		label: "Reports",
		to: "/_authenticated/dashboard",
		icon: <LineChart className="w-4 h-4" />,
		roles: ["CLINIC_ADMIN", "SUPER_ADMIN"],
	},
	{
		label: "Platform Overview",
		to: "/_authenticated/dashboard",
		icon: <Shield className="w-4 h-4" />,
		roles: ["SUPER_ADMIN"],
	},
];

export function AppShell() {
	const { role, clearTokens, refreshToken, userId } = useAuthStore();
	const router = useRouter();

	const logoutMutation = trpc.auth.logout.useMutation();
	const logoutAllMutation = trpc.auth.logoutAll.useMutation();

	const visibleNav = NAV_ITEMS.filter(
		(item) => !item.roles || item.roles.includes(role ?? ""),
	);

	async function handleLogout() {
		if (refreshToken) {
			await logoutMutation.mutateAsync({ refreshToken }).catch(() => null);
		}
		clearTokens();
		router.navigate({ to: "/login" });
	}

	async function handleLogoutAll() {
		await logoutAllMutation.mutateAsync().catch(() => null);
		clearTokens();
		router.navigate({ to: "/login" });
	}

	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader>
					<div className="flex items-center gap-3 px-2 py-2">
						<div className="w-9 h-9 rounded-lg bg-brown-600 flex items-center justify-center shrink-0">
							<Stethoscope className="w-5 h-5 text-white" />
						</div>
						<div className="flex flex-col">
							<span className="font-black text-brown-800 dark:text-brown-100 leading-tight">
								HaberApp
							</span>
							<span className="text-xs text-on-surface-variant tracking-wide">
								Clinical Excellence
							</span>
						</div>
					</div>
				</SidebarHeader>

				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{visibleNav.map((item) => (
									<SidebarMenuItem key={item.label}>
										<SidebarMenuButton asChild>
											<Link to={item.to}>
												{item.icon}
												<span>{item.label}</span>
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<div className="flex flex-col gap-1 px-2 pb-2">
						<div className="flex flex-col gap-0.5 bg-muted rounded-lg p-2 mb-1">
							<span className="text-sm font-medium text-on-surface truncate">
								{userId ?? "User"}
							</span>
							{role && (
								<span className="text-xs text-on-surface-variant">
									{role.replace("_", " ")}
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={handleLogout}
							className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-on-surface-variant hover:bg-accent transition-colors w-full"
						>
							<LogOut className="w-4 h-4" />
							Log out
						</button>
						<button
							type="button"
							onClick={handleLogoutAll}
							className="text-xs text-on-surface-variant hover:underline px-2 py-1 text-left"
						>
							Log out everywhere
						</button>
					</div>
				</SidebarFooter>
			</Sidebar>

			<SidebarInset>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm check-types 2>&1 | grep "AppShell"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/shell/AppShell.tsx
git commit -m "feat(web): add AppShell sidebar with role-based nav and user footer"
```

---

## Task 8: Create authenticated layout route and dashboard placeholder

**Files:**
- Create: `apps/web/src/routes/_authenticated.tsx`
- Create: `apps/web/src/routes/_authenticated/dashboard.tsx`

The `_authenticated.tsx` file is a **layout route** (no path segment of its own). TanStack Router nests all `_authenticated/*` routes inside it. The `beforeLoad` guard checks `isAuthenticated`.

- [ ] **Step 1: Create the directory and _authenticated.tsx**

```bash
mkdir -p apps/web/src/routes/_authenticated
```

Create `apps/web/src/routes/_authenticated.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

import { AppShell } from "@/components/shell/AppShell";

export const Route = createFileRoute("/_authenticated")({
	beforeLoad: ({ context }) => {
		if (!context.auth.isAuthenticated) {
			throw redirect({ to: "/login" });
		}
	},
	component: AppShell,
});
```

- [ ] **Step 2: Create dashboard.tsx**

Create `apps/web/src/routes/_authenticated/dashboard.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
	component: DashboardPage,
});

function DashboardPage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-semibold text-on-surface">Dashboard</h1>
			<p className="text-on-surface-variant mt-2">
				Welcome back. More content coming soon.
			</p>
		</div>
	);
}
```

- [ ] **Step 3: Type-check**

```bash
pnpm check-types 2>&1 | grep -E "_authenticated|dashboard"
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/routes/_authenticated.tsx apps/web/src/routes/_authenticated/dashboard.tsx
git commit -m "feat(web): add authenticated layout route with beforeLoad guard and dashboard placeholder"
```

---

## Task 9: Update index route to redirect

**Files:**
- Modify: `apps/web/src/routes/index.tsx`

Replace the ASCII art dev page with a redirect: authenticated users go to `/dashboard`, unauthenticated go to `/login`.

- [ ] **Step 1: Update index.tsx**

Replace `apps/web/src/routes/index.tsx` with:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		throw redirect({
			to: context.auth.isAuthenticated ? "/_authenticated/dashboard" : "/login",
		});
	},
	component: () => null,
});
```

- [ ] **Step 2: Type-check**

```bash
pnpm check-types 2>&1 | grep "index.tsx"
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/routes/index.tsx
git commit -m "feat(web): redirect / to dashboard or login based on auth state"
```

---

## Task 10: Full type-check and lint

- [ ] **Step 1: Full type-check**

```bash
pnpm check-types
```

Expected: 0 errors.

- [ ] **Step 2: Lint**

```bash
pnpm check
```

Expected: 0 lint/format errors (Biome auto-fix runs).

- [ ] **Step 3: Final commit if check made auto-fixes**

```bash
git add -A
git status
# only commit if there are actual changes from Biome fixes
```

---

## Verification

### Manual test checklist

1. **Start the app**: `pnpm dev:web` — confirm no console errors on start.

2. **Unauthenticated redirect**: Navigate to `http://localhost:5173/` → should redirect to `/login`.

3. **Email step**: Enter a valid clinic email → click "Send OTP" → should show the OTP entry step (or error if email not in DB).

4. **OTP entry**: Enter correct 6-digit code → should redirect to `/dashboard` and show the sidebar shell.

5. **Role-based nav**: Check sidebar shows only nav items appropriate to the user's role.

6. **Persist across refresh**: While on `/dashboard`, refresh the page → should stay on `/dashboard` (Zustand persist keeps tokens).

7. **Wrong OTP error**: Enter wrong OTP code → error message with attempt counter; after 5 wrong attempts: "OTP invalidated, request a new one".

8. **Log out**: Click "Log out" in sidebar footer → tokens cleared, redirected to `/login`.

9. **Log out everywhere**: Click "Log out everywhere" → all sessions revoked, redirected to `/login`.

10. **Protected redirect**: After logging out, navigate to `http://localhost:5173/dashboard` → should redirect to `/login`.
