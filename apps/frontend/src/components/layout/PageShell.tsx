import { LogOut, LogOutIcon } from 'lucide-react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLogout, useLogoutAll } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

const ADMIN_ROLES = ['super_admin', 'clinic_admin'] as const;

export function PageShell() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const { mutate: logout } = useLogout();
  const { mutate: logoutAll, isPending: isLoggingOutAll } = useLogoutAll();
  const navigate = useNavigate();

  const isAdmin = role && (ADMIN_ROLES as readonly string[]).includes(role);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-lg font-semibold tracking-tight">
                Haber
              </Link>
              <nav className="flex gap-1">
                <Link
                  to="/"
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                >
                  Dashboard
                </Link>
                {isAdmin && (
                  <Link
                    to="/users"
                    className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    Users
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-3">
              {user && (
                <div className="flex items-center gap-2.5">
                  <div
                    className="size-7 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--brown-600)' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{role?.replace('_', ' ') ?? ''}</p>
                  </div>
                </div>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="gap-1.5">
                    <LogOut className="size-3.5" />
                    <span className="hidden sm:inline">Sign out</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => logout(undefined, { onSuccess: () => navigate('/login') })}>
                    <LogOut className="size-3.5" />
                    Sign out this device
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={isLoggingOutAll}
                    onClick={() => logoutAll(undefined, { onSuccess: () => navigate('/login') })}
                  >
                    <LogOutIcon className="size-3.5" />
                    {isLoggingOutAll ? 'Signing out everywhere…' : 'Sign out everywhere'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
