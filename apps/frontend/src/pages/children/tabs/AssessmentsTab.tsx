import type { AssessmentDto } from '@haber/shared';
import { format } from 'date-fns';
import { ClipboardList, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAssessments, useCreateAssessment } from '@/hooks/useAssessments';

interface Props {
  childId: string;
  intakeComplete?: boolean;
  consentStatus?: string;
}

export function AssessmentsTab({ childId, intakeComplete, consentStatus }: Props) {
  const { data: assessments, isLoading } = useAssessments(childId);
  const createAssessment = useCreateAssessment();

  const canStart = !!intakeComplete && consentStatus === 'all_consented';
  const disabledReason = !intakeComplete
    ? 'Complete intake first'
    : consentStatus !== 'all_consented'
      ? 'All guardian consents required'
      : undefined;

  const handleStart = () => {
    createAssessment.mutate(
      { childId, data: { assessmentDate: new Date().toISOString().split('T')[0] } },
      {
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Failed to create assessment';
          toast.error(msg === 'DRAFT_EXISTS' ? 'A draft assessment already exists' : msg);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-3/4" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {assessments?.length ?? 0} assessment{(assessments?.length ?? 0) !== 1 ? 's' : ''}
        </p>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button size="sm" disabled={!canStart || createAssessment.isPending} onClick={handleStart}>
                  <Plus className="size-4 mr-1.5" />
                  {createAssessment.isPending ? 'Creating...' : 'Start Assessment'}
                </Button>
              </span>
            </TooltipTrigger>
            {disabledReason && <TooltipContent>{disabledReason}</TooltipContent>}
          </Tooltip>
        </TooltipProvider>
      </div>

      {!assessments || assessments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <ClipboardList className="size-10 mb-3 opacity-40" />
          <p className="text-sm">No assessments yet</p>
          {canStart && <p className="text-xs mt-1">Click "Start Assessment" to begin</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {assessments.map((a) => (
            <AssessmentCard key={a.id} assessment={a} childId={childId} />
          ))}
        </div>
      )}
    </div>
  );
}

function AssessmentCard({ assessment, childId }: { assessment: AssessmentDto; childId: string }) {
  const navigate = useNavigate();
  return (
    <Card
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${
        assessment.status === 'draft' ? 'border-amber-200 bg-amber-50/30' : ''
      }`}
      onClick={() => navigate(`/children/${childId}/assessments/${assessment.id}`)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Version {assessment.version}</CardTitle>
          {assessment.status === 'draft' ? (
            <Badge className="shrink-0 bg-amber-100 text-amber-800 border-amber-200">In Progress</Badge>
          ) : (
            <Badge className="shrink-0 bg-green-100 text-green-800 border-green-200">Finalised</Badge>
          )}
        </div>
        <CardDescription>
          {format(new Date(assessment.assessmentDate), 'dd MMM yyyy')}
          {assessment.assessmentLocation && ` · ${assessment.assessmentLocation}`}
        </CardDescription>
      </CardHeader>
      {assessment.chiefComplaint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground line-clamp-2">{assessment.chiefComplaint}</p>
        </CardContent>
      )}
    </Card>
  );
}
