import { Link, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useLogout } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';

export function PageShell() {
  const user = useAuthStore((s) => s.user);
  const { mutate: logout } = useLogout();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(undefined, { onSuccess: () => navigate('/login') });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link to="/" className="text-xl font-bold">
                Haber
              </Link>
              <nav className="flex gap-4">
                <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link to="/users" className="text-sm text-muted-foreground hover:text-foreground">
                    Users
                  </Link>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user?.name}</span>
              <Button type="button" variant="ghost" size="sm" onClick={handleLogout}>
                Logout
              </Button>
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
