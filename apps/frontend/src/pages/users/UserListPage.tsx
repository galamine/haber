import { Link } from 'react-router-dom';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUsers } from '@/hooks/useUsers';

export function UserListPage() {
  const { data, isLoading, error } = useUsers();

  if (isLoading) return <p className="text-muted-foreground">Loading users...</p>;
  if (error) return <p className="text-destructive">Failed to load users: {error.message}</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Users</h1>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-4 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Email</TableHead>
              <TableHead className="px-4 py-3">Role</TableHead>
              <TableHead className="px-4 py-3">Verified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="px-4 py-3">
                  <Link to={`/users/${user.id}`} className="font-medium hover:underline">
                    {user.name}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{user.email}</TableCell>
                <TableCell className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{user.role}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{user.isEmailVerified ? 'Yes' : 'No'}</TableCell>
              </TableRow>
            ))}
            {data && data.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                  No users found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {data && (
        <p className="text-sm text-muted-foreground">
          Page {data.page} of {data.totalPages} — {data.totalResults} total
        </p>
      )}
    </div>
  );
}
