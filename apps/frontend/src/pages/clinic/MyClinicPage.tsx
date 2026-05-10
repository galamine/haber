import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useMyClinic } from '@/hooks/useClinics';
import { useSubscriptionPlan } from '@/hooks/useSubscriptionPlans';

export function MyClinicPage() {
  const { data: clinic, isLoading, isError } = useMyClinic();
  const { data: plan } = useSubscriptionPlan(clinic?.subscriptionPlanId ?? '');

  if (isLoading) {
    return <p className="text-muted-foreground">Loading clinic...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Failed to load clinic</p>;
  }

  if (!clinic) {
    return <p className="text-muted-foreground">No clinic found</p>;
  }

  const featureFlags = plan?.featureFlags as Record<string, boolean> | undefined;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My Clinic</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clinic Information</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Clinic Name</dt>
                <dd className="text-sm font-medium">{clinic.name}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Address</dt>
                <dd className="text-sm font-medium">{clinic.address}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Phone</dt>
                <dd className="text-sm font-medium">{clinic.contactPhone}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Email</dt>
                <dd className="text-sm font-medium">{clinic.contactEmail}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Timezone</dt>
                <dd className="text-sm font-medium">{clinic.timezone}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {plan ? (
              <>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                      {plan.tier}
                    </span>
                    <span className="text-sm font-medium">{plan.name}</span>
                  </div>
                  {!clinic.subscriptionPlanId && <p className="text-sm text-muted-foreground">No plan assigned</p>}
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Limits</h4>
                  <dl className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Max Active Children</dt>
                      <dd className="font-medium">{plan.maxActiveChildren}</dd>
                    </div>
                    <div className="flex justify-between text-sm">
                      <dt className="text-muted-foreground">Max Sensory Rooms</dt>
                      <dd className="font-medium">{plan.maxSensoryRooms}</dd>
                    </div>
                  </dl>
                </div>

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Features</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">SMS Notifications</span>
                      <Switch checked={featureFlags?.smsNotifications ?? false} disabled />
                    </div>
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <span className="text-sm">Per-Tenant Branding</span>
                      <Switch checked={featureFlags?.perTenantBranding ?? false} disabled />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No subscription plan assigned</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
