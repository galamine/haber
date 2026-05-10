'use client';

import type { InviteStaffDto } from '@haber/shared';
import { PlusIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInviteStaff } from '@/hooks/useStaff';

export function InviteStaffModal() {
  const [open, setOpen] = useState(false);
  const inviteStaff = useInviteStaff();

  const form = useForm<InviteStaffDto>({
    defaultValues: {
      email: '',
      role: 'staff',
      permissions: [],
      departmentIds: [],
    },
  });

  const { reset } = form;

  useEffect(() => {
    if (!open) {
      reset();
    }
  }, [open, reset]);

  const onSubmit = async (data: InviteStaffDto) => {
    try {
      await inviteStaff.mutateAsync(data);
      toast.success('Invitation sent successfully');
      setOpen(false);
    } catch {
      toast.error('Failed to send invitation');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusIcon className="mr-2 size-4" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Invite Staff Member</DialogTitle>
              <DialogDescription>Send an invitation to join your clinic.</DialogDescription>
            </DialogHeader>

            <FormField
              control={form.control}
              name="email"
              rules={{ required: 'Email is required' }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="staff@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="therapist">Therapist</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteStaff.isPending}>
                {inviteStaff.isPending ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
