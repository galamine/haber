import { useAuthStore } from '@/store/authStore';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome back, {user?.name}.</p>
    </div>
  );
}
