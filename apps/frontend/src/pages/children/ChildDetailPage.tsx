import { AlertTriangle, LockKeyhole } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useChild, useIntakeStatus } from '@/hooks/useChildren';
import { useConsentHistory, useConsentStatus } from '@/hooks/useConsent';
import { useAuthStore } from '@/store/authStore';
import { AssessmentsTab } from './tabs/AssessmentsTab';
import { ConsentTab } from './tabs/ConsentTab';
import { GuardiansTab } from './tabs/GuardiansTab';
import { MedicalHistoryTab } from './tabs/MedicalHistoryTab';
import { ProfileTab } from './tabs/ProfileTab';

const STATUS_LABELS: Record<string, string> = {
  all_consented: 'All consents given',
  partial: 'Partial consent — some guardians pending',
  none: 'No consent on record',
  withdrawn: 'Consent withdrawn',
};

export function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const { data: child, isLoading } = useChild(childId ?? '');
  const { data: intakeStatus } = useIntakeStatus(childId ?? '');
  const { data: consentStatus } = useConsentStatus(childId ?? '');
  const { data: consentHistory, isLoading: historyLoading } = useConsentHistory(childId ?? '');
  const role = useAuthStore((s) => s.role);

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!child) return <p className="text-destructive">Child not found</p>;

  const consentStatusValue = consentStatus?.consentStatus;

  const statusIcon =
    consentStatusValue === 'all_consented' ? (
      <LockKeyhole className="text-green-600" size={18} />
    ) : consentStatusValue === 'withdrawn' ? (
      <AlertTriangle className="text-red-600" size={18} />
    ) : consentStatusValue ? (
      <AlertTriangle className="text-amber-500" size={18} />
    ) : null;

  return (
    <div className="space-y-4">
      {/* Child name + consent status icon */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">{child.fullName}</h1>
        {statusIcon && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="cursor-default">{statusIcon}</span>
              </TooltipTrigger>
              <TooltipContent>{STATUS_LABELS[consentStatusValue ?? ''] ?? 'Consent unknown'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Intake status banner */}
      {intakeStatus?.intakeComplete ? (
        <Alert variant="default">Intake Complete</Alert>
      ) : (
        <Alert variant="warning">Intake Incomplete — missing: {intakeStatus?.missingFields.join(', ')}</Alert>
      )}

      {/* Consent withdrawn banner */}
      {consentStatusValue === 'withdrawn' && (
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription>
            Clinical activities paused — guardian consent withdrawn. Contact clinic admin to resolve.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="medical-history">Medical History</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="treatment-plan">Treatment Plan</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          {role === 'clinic_admin' && <TabsTrigger value="consent">Consent</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <ProfileTab child={child} />
        </TabsContent>

        <TabsContent value="medical-history" className="mt-4">
          <MedicalHistoryTab medicalHistory={undefined} />
        </TabsContent>

        <TabsContent value="guardians" className="mt-4">
          <GuardiansTab guardians={[]} />
        </TabsContent>

        <TabsContent value="assessments" className="mt-4">
          <AssessmentsTab
            childId={childId ?? ''}
            intakeComplete={intakeStatus?.intakeComplete}
            consentStatus={consentStatusValue}
          />
        </TabsContent>

        <TabsContent value="treatment-plan" className="mt-4">
          <p className="text-muted-foreground">Coming soon</p>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <p className="text-muted-foreground">Coming soon</p>
        </TabsContent>

        {role === 'clinic_admin' && (
          <TabsContent value="consent" className="mt-4">
            <ConsentTab childId={childId ?? ''} records={consentHistory} status={consentStatus} isLoading={historyLoading} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
