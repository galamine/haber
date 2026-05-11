import type { GuardianDto } from '@haber/shared';

interface GuardiansTabProps {
  guardians: GuardianDto[];
}

export function GuardiansTab({ guardians }: GuardiansTabProps) {
  if (guardians.length === 0) {
    return <p className="text-muted-foreground">No guardians on record.</p>;
  }

  return (
    <div className="grid gap-4">
      {guardians.map((guardian) => (
        <div key={guardian.id} className="rounded-md border p-4">
          <div className="space-y-2">
            <p className="font-medium">{guardian.fullName}</p>
            <p className="text-sm text-muted-foreground">{guardian.relationship}</p>
            <p className="text-sm">{guardian.phone}</p>
            {guardian.email && <p className="text-sm text-muted-foreground">{guardian.email}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
