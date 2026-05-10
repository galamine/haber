import type { CreateClinicDto } from '@haber/shared';
import { CreateClinicDtoSchema } from '@haber/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinic, useCreateClinic, useUpdateClinic } from '@/hooks/useClinics';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

const timezones = Intl.supportedValuesOf('timeZone');

export function ClinicFormPage() {
  const { clinicId } = useParams<{ clinicId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!clinicId;

  const { data: clinic, isLoading: isLoadingClinic } = useClinic(clinicId ?? '');
  const { data: plansData } = useSubscriptionPlans();
  const createClinic = useCreateClinic();
  const updateClinic = useUpdateClinic();

  const form = useForm<CreateClinicDto>({
    resolver: zodResolver(CreateClinicDtoSchema),
    defaultValues: {
      name: '',
      address: '',
      contactPhone: '',
      contactEmail: '',
      timezone: '',
      subscriptionPlanId: undefined,
    },
  });

  if (isEditMode && isLoadingClinic && !clinic) {
    return <p className="text-muted-foreground">Loading clinic...</p>;
  }

  if (isEditMode && clinic) {
    form.reset({
      name: clinic.name,
      address: clinic.address,
      contactPhone: clinic.contactPhone,
      contactEmail: clinic.contactEmail,
      timezone: clinic.timezone,
      subscriptionPlanId: clinic.subscriptionPlanId ?? undefined,
    });
  }

  const onSubmit = (values: CreateClinicDto) => {
    if (isEditMode && clinicId) {
      updateClinic.mutate(
        { id: clinicId, data: values },
        {
          onSuccess: () => {
            toast.success('Clinic updated successfully');
            navigate('/super-admin/clinics');
          },
          onError: () => {
            toast.error('Failed to update clinic');
          },
        }
      );
    } else {
      createClinic.mutate(values, {
        onSuccess: () => {
          toast.success('Clinic created successfully');
          navigate('/super-admin/clinics');
        },
        onError: () => {
          toast.error('Failed to create clinic');
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
        <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Clinic' : 'Add Clinic'}</h1>
      </div>

      <Card className="max-w-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Clinic Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter clinic name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="Enter phone number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="Enter email address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timezones.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscriptionPlanId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscription Plan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subscription plan (optional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No plan</SelectItem>
                      {plansData?.results.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} ({plan.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>Optionally assign a subscription plan</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={createClinic.isPending || updateClinic.isPending}>
                {isEditMode ? 'Update Clinic' : 'Create Clinic'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/super-admin/clinics')}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
