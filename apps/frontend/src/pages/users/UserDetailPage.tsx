import { useParams } from 'react-router-dom';
import { useUser } from '@/hooks/useUsers';

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: user, isLoading, error } = useUser(userId ?? '');

  if (isLoading) return <p className="text-muted-foreground">Loading user...</p>;
  if (error) return <p className="text-destructive">Failed to load user: {error.message}</p>;
  if (!user) return null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <dl className="divide-y rounded-md border">
        {[
          ['Email', user.email],
          ['Role', user.role],
          ['Member since', new Date(user.createdAt).toLocaleDateString()],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center gap-8 px-4 py-3">
            <dt className="w-32 shrink-0 text-sm font-medium text-muted-foreground">{label}</dt>
            <dd className="text-sm">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
