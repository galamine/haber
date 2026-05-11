import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssessmentsStubProps {
  intakeComplete?: boolean;
}

export function AssessmentsStub({ intakeComplete }: AssessmentsStubProps) {
  return (
    <div>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-block">
            <Button disabled={!intakeComplete}>Start Assessment</Button>
          </div>
        </TooltipTrigger>
        {!intakeComplete && <TooltipContent>Complete intake first</TooltipContent>}
      </Tooltip>
      <p className="text-muted-foreground mt-4">Assessments coming soon</p>
    </div>
  );
}
