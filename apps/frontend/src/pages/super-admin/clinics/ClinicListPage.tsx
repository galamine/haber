import { MoreHorizontal, Pencil, Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useClinics, useReactivateClinic, useSuspendClinic } from '@/hooks/useClinics';

export function ClinicListPage() {
  const { data, isLoading, isError } = useClinics();
  const suspendClinic = useSuspendClinic();
  const reactivateClinic = useReactivateClinic();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading clinics...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Failed to load clinics</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Clinics</h1>
        <Button asChild>
          <Link to="/super-admin/clinics/new">
            <Plus className="mr-2 size-4" />
            Add Clinic
          </Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Subscription Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.results.map((clinic) => (
            <TableRow key={clinic.id}>
              <TableCell className="font-medium">{clinic.name}</TableCell>
              <TableCell>{clinic.subscriptionPlanId ? 'Assigned' : 'None'}</TableCell>
              <TableCell>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    clinic.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {clinic.status}
                </span>
              </TableCell>
              <TableCell>{new Date(clinic.createdAt).toLocaleDateString()}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="size-8 p-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/super-admin/clinics/${clinic.id}/edit`}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    {clinic.status === 'active' ? (
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => suspendClinic.mutate(clinic.id)}
                      >
                        <ShieldAlert className="mr-2 size-4" />
                        Suspend
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => reactivateClinic.mutate(clinic.id)}>
                        <ShieldCheck className="mr-2 size-4" />
                        Reactivate
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data?.results.length === 0 && <p className="text-muted-foreground text-center py-8">No clinics found</p>}
    </div>
  );
}
