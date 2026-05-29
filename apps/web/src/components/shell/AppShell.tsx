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
} from "@haber-final/ui/components/sidebar";
import { useMutation } from "@tanstack/react-query";
import { Outlet, useRouter } from "@tanstack/react-router";
import {
	Building2,
	LayoutDashboard,
	LogOut,
	Settings,
	Shield,
	Stethoscope,
	Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/stores/auth";
import { trpc } from "@/utils/trpc";

type NavItem = {
	label: string;
	to: string;
	icon: React.ReactNode;
	roles?: string[];
};

const NAV_ITEMS: NavItem[] = [
	{
		label: "Clinics",
		to: "/platform/clinics",
		icon: <Shield className="h-4 w-4" />,
		roles: ["SUPER_ADMIN"],
	},
	{
		label: "Dashboard",
		to: "/dashboard",
		icon: <LayoutDashboard className="h-4 w-4" />,
		roles: ["CLINIC_ADMIN", "THERAPIST", "STAFF"],
	},
	{
		label: "Staff",
		to: "/settings/staff",
		icon: <Users className="h-4 w-4" />,
		roles: ["CLINIC_ADMIN"],
	},
	{
		label: "Departments",
		to: "/settings/departments",
		icon: <Settings className="h-4 w-4" />,
		roles: ["CLINIC_ADMIN"],
	},
	{
		label: "Sensory Rooms",
		to: "/settings/rooms",
		icon: <Building2 className="h-4 w-4" />,
		roles: ["CLINIC_ADMIN"],
	},
];

export function AppShell() {
	const { role, clearTokens, refreshToken, userId } = useAuthStore();
	const router = useRouter();

	const logoutMutation = useMutation(trpc.auth.logout.mutationOptions());
	const logoutAllMutation = useMutation(trpc.auth.logoutAll.mutationOptions());

	const visibleNav = NAV_ITEMS.filter(
		(item) => !item.roles || item.roles.includes(role ?? ""),
	);

	async function handleLogout() {
		if (refreshToken) {
			await logoutMutation
				.mutateAsync({ refreshToken })
				.catch((err) => toast.error(err.message));
		}
		toast.success("Logged out");
		clearTokens();
		router.navigate({ to: "/login" });
	}

	async function handleLogoutAll() {
		await logoutAllMutation
			.mutateAsync()
			.catch((err) => toast.error(err.message));
		toast.success("Logged out everywhere");
		clearTokens();
		router.navigate({ to: "/login" });
	}

	return (
		<SidebarProvider>
			<Sidebar>
				<SidebarHeader>
					<div className="flex items-center gap-3 px-2 py-2">
						<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brown-600">
							<Stethoscope className="h-5 w-5 text-white" />
						</div>
						<div className="flex flex-col">
							<span className="font-black text-brown-800 leading-tight dark:text-brown-100">
								HaberApp
							</span>
							<span className="text-on-surface-variant text-xs tracking-wide">
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
										<SidebarMenuButton
											onClick={() => router.navigate({ to: item.to })}
										>
											{item.icon}
											<span>{item.label}</span>
										</SidebarMenuButton>
									</SidebarMenuItem>
								))}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>

				<SidebarFooter>
					<div className="flex flex-col gap-1 px-2 pb-2">
						<div className="mb-1 flex flex-col gap-0.5 rounded-lg bg-muted p-2">
							<span className="truncate font-medium text-on-surface text-sm">
								{userId ?? "User"}
							</span>
							{role && (
								<span className="text-on-surface-variant text-xs">
									{role.replace("_", " ")}
								</span>
							)}
						</div>
						<button
							type="button"
							onClick={handleLogout}
							className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-on-surface-variant text-sm transition-colors hover:bg-accent"
						>
							<LogOut className="h-4 w-4" />
							Log out
						</button>
						<button
							type="button"
							onClick={handleLogoutAll}
							className="px-2 py-1 text-left text-on-surface-variant text-xs hover:underline"
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
