import type { UserRole } from '@haber/shared';
import { ShieldX } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

type ProtectedRouteProps = {
  children: ReactNode;
  requiredRoles?: UserRole[];
};

function Forbidden() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div
        className="size-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ backgroundColor: 'var(--brown-100)' }}
      >
        <ShieldX className="size-6" style={{ color: 'var(--brown-600)' }} />
      </div>
      <h2 className="text-xl font-semibold text-foreground mb-2">Access restricted</h2>
      <p className="text-sm text-muted-foreground max-w-xs mb-6">
        You don't have permission to view this page. Contact your administrator if you believe this is an error.
      </p>
      <Link
        to="/"
        className="text-sm font-medium underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        Back to dashboard
      </Link>
    </div>
  );
}

export function ProtectedRoute({ children, requiredRoles }: ProtectedRouteProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const role = useAuthStore((s) => s.role);

  if (!accessToken) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRoles && role && !requiredRoles.includes(role)) {
    return <Forbidden />;
  }

  return <>{children}</>;
}
