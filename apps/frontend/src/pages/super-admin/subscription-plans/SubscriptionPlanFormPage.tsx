import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreateSubscriptionPlan, useSubscriptionPlan, useUpdateSubscriptionPlan } from '@/hooks/useSubscriptionPlans';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  tier: z.enum(['basic', 'advanced', 'enterprise']),
  maxActiveChildren: z.coerce.number().int().nonnegative(),
  maxSensoryRooms: z.coerce.number().int().nonnegative(),
  maxUsersByRole: z.object({
    therapist: z.coerce.number().int().nonnegative().default(0),
    staff: z.coerce.number().int().nonnegative().default(0),
  }),
  featureFlags: z.object({
    smsNotifications: z.boolean().default(false),
    perTenantBranding: z.boolean().default(false),
  }),
});

type FormValues = z.infer<typeof formSchema>;

export function SubscriptionPlanFormPage() {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const isEditMode = !!planId;

  const { data: plan, isLoading: isLoadingPlan } = useSubscriptionPlan(planId ?? '');
  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      tier: 'basic',
      maxActiveChildren: 0,
      maxSensoryRooms: 0,
      maxUsersByRole: {
        therapist: 0,
        staff: 0,
      },
      featureFlags: {
        smsNotifications: false,
        perTenantBranding: false,
      },
    },
  });

  if (isEditMode && isLoadingPlan && !plan) {
    return <p className="text-muted-foreground">Loading subscription plan...</p>;
  }

  if (isEditMode && plan) {
    const maxUsersByRole = plan.maxUsersByRole as Record<string, number>;
    const featureFlags = plan.featureFlags as Record<string, boolean>;
    form.reset({
      name: plan.name,
      tier: plan.tier,
      maxActiveChildren: plan.maxActiveChildren,
      maxSensoryRooms: plan.maxSensoryRooms,
      maxUsersByRole: {
        therapist: maxUsersByRole?.therapist ?? 0,
        staff: maxUsersByRole?.staff ?? 0,
      },
      featureFlags: {
        smsNotifications: featureFlags?.smsNotifications ?? false,
        perTenantBranding: featureFlags?.perTenantBranding ?? false,
      },
    });
  }

  const onSubmit = (values: FormValues) => {
    const payload = {
      name: values.name,
      tier: values.tier,
      maxActiveChildren: values.maxActiveChildren,
      maxSensoryRooms: values.maxSensoryRooms,
      maxUsersByRole: values.maxUsersByRole,
      featureFlags: values.featureFlags,
    };

    if (isEditMode && planId) {
      updatePlan.mutate(
        { id: planId, data: payload },
        {
          onSuccess: () => {
            toast.success('Subscription plan updated successfully');
            navigate('/super-admin/subscription-plans');
          },
          onError: () => {
            toast.error('Failed to update subscription plan');
          },
        }
      );
    } else {
      createPlan.mutate(payload, {
        onSuccess: () => {
          toast.success('Subscription plan created successfully');
          navigate('/super-admin/subscription-plans');
        },
        onError: () => {
          toast.error('Failed to create subscription plan');
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
        <h1 className="text-2xl font-semibold">{isEditMode ? 'Edit Subscription Plan' : 'Add Subscription Plan'}</h1>
      </div>

      <Card className="max-w-2xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter plan name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tier</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxActiveChildren"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Active Children</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxSensoryRooms"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Sensory Rooms</FormLabel>
                  <FormControl>
                    <Input type="number" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">User Limits by Role</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="maxUsersByRole.therapist"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Therapists</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="maxUsersByRole.staff"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Staff</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Features</h3>
              <FormField
                control={form.control}
                name="featureFlags.smsNotifications"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>SMS Notifications</FormLabel>
                      <FormDescription>Enable SMS notification capabilities</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="featureFlags.perTenantBranding"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel>Per-Tenant Branding</FormLabel>
                      <FormDescription>Allow custom branding per tenant</FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={createPlan.isPending || updatePlan.isPending}>
                {isEditMode ? 'Update Plan' : 'Create Plan'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/super-admin/subscription-plans')}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
}
