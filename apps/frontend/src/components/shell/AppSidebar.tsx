import type { UserRole } from '@haber/shared';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  CreditCard,
  LayoutDashboard,
  LogOut,
  LogOutIcon,
  PanelLeft,
  PanelLeftClose,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useLogout, useLogoutAll } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

interface NavItem {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    roles: ['super_admin', 'clinic_admin', 'therapist', 'staff'],
    exact: true,
  },
  { label: 'Users', href: '/users', icon: Users, roles: ['super_admin', 'clinic_admin'] },
  { label: 'Clinics', href: '/super-admin/clinics', icon: Building2, roles: ['super_admin'] },
  { label: 'Subscription Plans', href: '/super-admin/subscription-plans', icon: CreditCard, roles: ['super_admin'] },
  { label: 'My Clinic', href: '/clinic/me', icon: Stethoscope, roles: ['clinic_admin'] },
];

export function AppSidebar() {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const { mutate: logout } = useLogout();
  const { mutate: logoutAll, isPending: isLoggingOutAll } = useLogoutAll();

  const visibleNavItems = NAV_ITEMS.filter((item) => role && item.roles.includes(role));

  const isActive = (item: NavItem) => {
    if (item.exact) {
      return location.pathname === item.href;
    }
    return location.pathname.startsWith(item.href);
  };

  const navItem = (item: NavItem) => {
    const active = isActive(item);
    const Icon = item.icon;

    const content = (
      <Link
        to={item.href}
        className={`
          flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
          ${active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}
        `}
      >
        <Icon className="size-5 shrink-0" />
        <AnimatePresence>
          {isOpen && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );

    if (!isOpen) {
      return (
        <Tooltip key={item.href} delayDuration={2000}>
          <TooltipTrigger asChild>{content}</TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    return content;
  };

  return (
    <motion.nav
      animate={{ width: isOpen ? 225 : 60 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="sticky top-0 h-screen shrink-0 border-r border-border bg-card overflow-hidden flex flex-col"
    >
      <div className="flex h-16 items-center justify-between border-b border-border px-3">
        <AnimatePresence>
          {isOpen ? (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-semibold text-foreground"
            >
              Haber
            </motion.span>
          ) : (
            <span className="text-lg font-semibold text-foreground">H</span>
          )}
        </AnimatePresence>
        <Button type="button" variant="ghost" size="sm" className="size-8 p-0" onClick={() => setIsOpen(!isOpen)}>
          {isOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">{visibleNavItems.map((item) => navItem(item))}</div>
      </div>

      <div className="border-t border-border p-2">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`
                  flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${isOpen ? 'justify-start' : 'justify-center'}
                  text-muted-foreground hover:bg-accent hover:text-accent-foreground
                `}
              >
                <div
                  className="size-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                  style={{ backgroundColor: 'var(--brown-600)' }}
                  title={isOpen ? undefined : user.name}
                >
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden text-left"
                    >
                      <p className="truncate text-sm font-medium text-foreground leading-none">{user.name}</p>
                      {role && role !== 'super_admin' && (
                        <p className="truncate text-xs text-muted-foreground mt-0.5 capitalize">{role.replace('_', ' ')}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => logout(undefined, { onSuccess: () => (window.location.href = '/login') })}>
                <LogOut className="size-3.5" />
                Sign out this device
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isLoggingOutAll}
                onClick={() => logoutAll(undefined, { onSuccess: () => (window.location.href = '/login') })}
              >
                <LogOutIcon className="size-3.5" />
                {isLoggingOutAll ? 'Signing out everywhere…' : 'Sign out everywhere'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.nav>
  );
}
