import { Link } from 'react-router-dom';
import { CapacityWidget } from '@/components/CapacityWidget';
import { InviteStaffModal } from '@/components/InviteStaffModal';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStaff } from '@/hooks/useStaff';

export function StaffPage() {
  const { data, isLoading, error } = useStaff();

  if (isLoading) return <p className="text-muted-foreground">Loading staff...</p>;
  if (error) return <p className="text-destructive">Failed to load staff: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <InviteStaffModal />
      </div>

      <CapacityWidget />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-4 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Email</TableHead>
              <TableHead className="px-4 py-3">Role</TableHead>
              <TableHead className="px-4 py-3">Permissions</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((staff) => (
              <TableRow key={staff.id} className={!staff.isActive ? 'bg-muted/30' : undefined}>
                <TableCell className="px-4 py-3">
                  <Link to={`/staff/${staff.id}`} className="font-medium hover:underline">
                    {staff.name}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{staff.email}</TableCell>
                <TableCell className="px-4 py-3">
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs">{staff.role}</span>
                </TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">
                  {staff.permissions.length > 0 ? `${staff.permissions.length} permissions` : 'None'}
                </TableCell>
                <TableCell className="px-4 py-3">
                  {staff.isActive ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                </TableCell>
              </TableRow>
            ))}
            {data && data.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No staff members found
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
