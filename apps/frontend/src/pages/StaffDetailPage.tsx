'use client';

import { ArrowLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useDeactivateStaff, useReactivateStaff, useStaffMember, useUpdateStaff } from '@/hooks/useStaff';

export function StaffDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: staff, isLoading, error } = useStaffMember(userId ?? '');
  const updateStaff = useUpdateStaff();
  const deactivateStaff = useDeactivateStaff();
  const reactivateStaff = useReactivateStaff();

  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  if (isLoading) return <p className="text-muted-foreground">Loading staff member...</p>;
  if (error) return <p className="text-destructive">Failed to load staff member: {error.message}</p>;
  if (!staff) return null;

  const handlePermissionToggle = (permission: string, enabled: boolean) => {
    setPermissions((prev) => ({ ...prev, [permission]: enabled }));
  };

  const handleSavePermissions = async () => {
    const enabledPermissions = Object.entries(permissions)
      .filter(([, enabled]) => enabled)
      .map(([perm]) => perm);

    try {
      await updateStaff.mutateAsync({
        userId: staff.id,
        data: { permissions: enabledPermissions },
      });
      toast.success('Permissions updated successfully');
    } catch {
      toast.error('Failed to update permissions');
    }
  };

  const handleDeactivate = async () => {
    try {
      await deactivateStaff.mutateAsync(staff.id);
      toast.success('Staff member deactivated');
    } catch {
      toast.error('Failed to deactivate staff member');
    }
  };

  const handleReactivate = async () => {
    try {
      await reactivateStaff.mutateAsync(staff.id);
      toast.success('Staff member reactivated');
    } catch {
      toast.error('Failed to reactivate staff member');
    }
  };

  const availablePermissions = ['student.intake', 'student.notes', 'student.attendance', 'reports.view'];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/staff">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Staff Details</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Staff member information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{staff.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{staff.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="secondary">{staff.role}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              {staff.isActive ? <Badge variant="default">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Department IDs</p>
              <p className="font-medium">
                {staff.departmentIds.length > 0 ? staff.departmentIds.join(', ') : 'None assigned'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Permissions</CardTitle>
            <CardDescription>Manage staff permissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {availablePermissions.map((permission) => (
              <div key={permission} className="flex items-center justify-between">
                <span className="text-sm">{permission}</span>
                <Switch
                  checked={permissions[permission] ?? staff.permissions.includes(permission)}
                  onCheckedChange={(enabled) => handlePermissionToggle(permission, enabled)}
                />
              </div>
            ))}
            <Button className="w-full" onClick={handleSavePermissions} disabled={updateStaff.isPending}>
              {updateStaff.isPending ? 'Saving...' : 'Save Permissions'}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>Actions that cannot be undone</CardDescription>
        </CardHeader>
        <CardContent>
          {staff.isActive ? (
            <Button variant="destructive" onClick={handleDeactivate} disabled={deactivateStaff.isPending}>
              {deactivateStaff.isPending ? 'Deactivating...' : 'Deactivate Staff Member'}
            </Button>
          ) : (
            <Button onClick={handleReactivate} disabled={reactivateStaff.isPending}>
              {reactivateStaff.isPending ? 'Reactivating...' : 'Reactivate Staff Member'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
