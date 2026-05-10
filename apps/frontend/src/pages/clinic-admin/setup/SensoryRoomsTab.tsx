import { CreateSensoryRoomDtoSchema, UpdateSensoryRoomDtoSchema } from '@haber/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { SensoryRoomDto } from '@/api/sensoryRooms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TagInput } from '@/components/ui/tag-input';
import { useDepartments } from '@/hooks/useDepartments';
import { useCreateSensoryRoom, useDeleteSensoryRoom, useSensoryRooms, useUpdateSensoryRoom } from '@/hooks/useSensoryRooms';

type RoomForm = {
  name: string;
  code: string;
  departmentId?: string | null;
  equipmentList: string[];
  status: 'active' | 'maintenance';
};

export function SensoryRoomsTab() {
  const { data: rooms, isLoading } = useSensoryRooms();
  const { data: departments } = useDepartments();
  const createRoom = useCreateSensoryRoom();
  const updateRoom = useUpdateSensoryRoom();
  const deleteRoom = useDeleteSensoryRoom();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SensoryRoomDto | null>(null);

  const form = useForm<RoomForm>({
    resolver: zodResolver(editing ? UpdateSensoryRoomDtoSchema : CreateSensoryRoomDtoSchema),
    defaultValues: { name: '', code: '', departmentId: null, equipmentList: [], status: 'active' },
  });

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: '', code: '', departmentId: null, equipmentList: [], status: 'active' });
    setDialogOpen(true);
  };

  const openEdit = (room: SensoryRoomDto) => {
    setEditing(room);
    form.reset({
      name: room.name,
      code: room.code,
      departmentId: room.departmentId,
      equipmentList: room.equipmentList,
      status: room.status,
    });
    setDialogOpen(true);
  };

  const onSubmit = (values: RoomForm) => {
    if (editing) {
      updateRoom.mutate(
        { id: editing.id, data: values },
        {
          onSuccess: () => {
            toast.success('Room updated');
            setDialogOpen(false);
          },
          onError: (err) =>
            toast.error(err.message === 'ROOM_CODE_TAKEN' ? 'Room code already in use' : 'Failed to update room'),
        }
      );
    } else {
      createRoom.mutate(values, {
        onSuccess: () => {
          toast.success('Room created');
          setDialogOpen(false);
        },
        onError: (err) => {
          if (err.message === 'SENSORY_ROOM_LIMIT_REACHED') toast.error('Room limit reached for your plan');
          else if (err.message === 'ROOM_CODE_TAKEN') toast.error('Room code already in use');
          else toast.error('Failed to create room');
        },
      });
    }
  };

  const handleDelete = (room: SensoryRoomDto) => {
    deleteRoom.mutate(room.id, {
      onSuccess: () => toast.success('Room deleted'),
      onError: () => toast.error('Failed to delete room'),
    });
  };

  const getDeptName = (id: string | null) => (id ? (departments?.find((d) => d.id === id)?.name ?? '—') : '—');

  if (isLoading) return <p className="text-muted-foreground py-4">Loading rooms…</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{rooms?.length ?? 0} rooms</p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 size-4" /> Add Room
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-4 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Code</TableHead>
              <TableHead className="px-4 py-3">Department</TableHead>
              <TableHead className="px-4 py-3">Equipment</TableHead>
              <TableHead className="px-4 py-3">Status</TableHead>
              <TableHead className="px-4 py-3 w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms?.map((room) => (
              <TableRow key={room.id}>
                <TableCell className="px-4 py-3 font-medium">{room.name}</TableCell>
                <TableCell className="px-4 py-3 font-mono text-xs">{room.code}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{getDeptName(room.departmentId)}</TableCell>
                <TableCell className="px-4 py-3 text-muted-foreground">{room.equipmentList.length} items</TableCell>
                <TableCell className="px-4 py-3">
                  {room.status === 'active' ? (
                    <Badge className="bg-green-100 text-green-800 border-green-200">Active</Badge>
                  ) : (
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Maintenance</Badge>
                  )}
                </TableCell>
                <TableCell className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="size-8" onClick={() => openEdit(room)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive"
                      onClick={() => handleDelete(room)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!rooms || rooms.length === 0) && (
              <TableRow>
                <TableCell colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No rooms yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Room' : 'New Sensory Room'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Room A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input placeholder="RM-A" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="departmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department (optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {departments?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Equipment List</FormLabel>
                <Controller
                  control={form.control}
                  name="equipmentList"
                  render={({ field }) => (
                    <TagInput value={field.value} onChange={field.onChange} placeholder="Type equipment and press Enter" />
                  )}
                />
              </FormItem>

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <FormLabel className="text-sm font-medium">Active</FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value === 'active'}
                        onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'maintenance')}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending} className="w-full">
                {editing ? 'Save Changes' : 'Create Room'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
