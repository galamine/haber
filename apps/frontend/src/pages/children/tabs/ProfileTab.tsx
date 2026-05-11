import type { ChildDto } from '@haber/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

function computeAge(dob: string): string {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} yrs`;
}

interface ProfileTabProps {
  child: ChildDto;
}

export function ProfileTab({ child }: ProfileTabProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-6">
        <Avatar className="size-24">
          <AvatarFallback className="text-lg">{child.fullName.charAt(0)}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">{child.fullName}</h2>
          <p className="text-muted-foreground">
            {computeAge(child.dob)} · {child.sex.charAt(0).toUpperCase() + child.sex.slice(1)}
          </p>
          {child.opNumber && <p className="text-sm text-muted-foreground">OP: {child.opNumber}</p>}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Date of Birth</Label>
            <p>{new Date(child.dob).toLocaleDateString()}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">School</Label>
            <p>{child.school ?? '—'}</p>
          </div>
        </div>

        <div>
          <Label className="text-muted-foreground">Spoken Languages</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {child.spokenLanguages.length > 0 ? (
              child.spokenLanguages.map((lang) => (
                <Badge key={lang} variant="secondary">
                  {lang}
                </Badge>
              ))
            ) : (
              <p>—</p>
            )}
          </div>
        </div>

        {child.heightCm && child.weightKg && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Height</Label>
              <p>{child.heightCm} cm</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Weight</Label>
              <p>{child.weightKg} kg</p>
            </div>
          </div>
        )}

        {child.measurementDate && (
          <div>
            <Label className="text-muted-foreground">Anthropometric Measurement Date</Label>
            <p>{new Date(child.measurementDate).toLocaleDateString()}</p>
          </div>
        )}

        <div>
          <Label className="text-muted-foreground">Assigned Therapists</Label>
          <p>{child.assignedTherapistIds.length} therapist(s)</p>
        </div>
      </div>
    </div>
  );
}
