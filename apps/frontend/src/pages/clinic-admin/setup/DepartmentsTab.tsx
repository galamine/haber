import { CreateDepartmentDtoSchema, UpdateDepartmentDtoSchema } from '@haber/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { DepartmentDto } from '@/api/departments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCreateDepartment, useDeleteDepartment, useDepartments, useUpdateDepartment } from '@/hooks/useDepartments';

type CreateForm = { name: string; description?: string | null };
type UpdateForm = { name?: string; description?: string | null };

export function DepartmentsTab() {
  const { data: departments, isLoading } = useDepartments();
  const createDept = useCreateDepartment();
  const updateDept = useUpdateDepartment();
  const deleteDept = useDeleteDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DepartmentDto | null>(null);

  const createForm = useForm<CreateForm>({ resolver: zodResolver(CreateDepartmentDtoSchema) });
  const editForm = useForm<UpdateForm>({ resolver: zodResolver(UpdateDepartmentDtoSchema) });

  const openCreate = () => {
    createForm.reset({ name: '', description: '' });
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (dept: DepartmentDto) => {
    setEditing(dept);
    editForm.reset({ name: dept.name, description: dept.description ?? '' });
    setDialogOpen(true);
  };

  const onSubmitCreate = (values: CreateForm) => {
    createDept.mutate(
      { name: values.name, description: values.description ?? null },
      {
        onSuccess: () => {
          toast.success('Department created');
          setDialogOpen(false);
        },
        onError: () => toast.error('Failed to create department'),
      }
    );
  };

  const onSubmitEdit = (values: UpdateForm) => {
    if (!editing) return;
    updateDept.mutate(
      { id: editing.id, data: { name: values.name, description: values.description ?? null } },
      {
        onSuccess: () => {
          toast.success('Department updated');
          setDialogOpen(false);
        },
        onError: () => toast.error('Failed to update department'),
      }
    );
  };

  const handleDelete = (dept: DepartmentDto) => {
    deleteDept.mutate(dept.id, {
      onSuccess: () => toast.success('Department deleted'),
      onError: (err) =>
        toast.error(
          err.message === 'DEPARTMENT_HAS_ROOMS' ? 'Remove all rooms from this department first' : 'Failed to delete'
        ),
    });
  };

  if (isLoading) return <p className="text-muted-foreground py-4">Loading departments…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{departments?.length ?? 0} departments</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 size-4" /> Add Department
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-4 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Description</TableHead>
              <TableHead className="px-4 py-3 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments?.map((dept) => (
              <TableRow key={dept.id}>
                <TableCell className="px-4 py-3 font-medium">{dept.name}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{dept.description ?? '—'}</TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(dept)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => handleDelete(dept)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!departments || departments.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="px-4 py-6 text-center text-muted-foreground">
                  No departments yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Department' : 'New Department'}</DialogTitle>
          </DialogHeader>

          {!editing ? (
            <Form {...createForm}>
              <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="space-y-4">
                <FormField
                  control={createForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="OT Wing" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={createForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Optional description" {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createDept.isPending} className="w-full">
                  {createDept.isPending ? 'Creating…' : 'Create Department'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={updateDept.isPending} className="w-full">
                  {updateDept.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </form>
            </Form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
