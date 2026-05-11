import { useParams } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useChild, useIntakeStatus } from '@/hooks/useChildren';
import { AssessmentsStub } from './tabs/AssessmentsStub';
import { GuardiansTab } from './tabs/GuardiansTab';
import { MedicalHistoryTab } from './tabs/MedicalHistoryTab';
import { ProfileTab } from './tabs/ProfileTab';

export function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const { data: child, isLoading } = useChild(childId ?? '');
  const { data: intakeStatus } = useIntakeStatus(childId ?? '');

  if (isLoading) return <p className="text-muted-foreground">Loading...</p>;
  if (!child) return <p className="text-destructive">Child not found</p>;

  return (
    <div className="space-y-6">
      {intakeStatus?.intakeComplete ? (
        <Alert variant="default">Intake Complete</Alert>
      ) : (
        <Alert variant="warning">Intake Incomplete — missing: {intakeStatus?.missingFields.join(', ')}</Alert>
      )}

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="medical-history">Medical History</TabsTrigger>
          <TabsTrigger value="guardians">Guardians</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
          <TabsTrigger value="treatment-plan">Treatment Plan</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
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
          <AssessmentsStub intakeComplete={intakeStatus?.intakeComplete} />
        </TabsContent>

        <TabsContent value="treatment-plan" className="mt-4">
          <p className="text-muted-foreground">Coming soon</p>
        </TabsContent>

        <TabsContent value="sessions" className="mt-4">
          <p className="text-muted-foreground">Coming soon</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}
