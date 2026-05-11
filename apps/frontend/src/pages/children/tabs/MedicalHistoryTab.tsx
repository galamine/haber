import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface MedicalHistoryTabProps {
  medicalHistory?: {
    birthTerm: string;
    gestationalAgeWeeks?: number;
    birthComplications?: string;
    neonatalHistory?: string;
    immunizations?: string;
    allergies?: string;
    currentMedications: Array<{ name: string; dose: string; frequency: string }>;
    priorDiagnoses?: string[];
    familyHistory?: string;
    sensorySensitivities?: string;
  } | null;
}

export function MedicalHistoryTab({ medicalHistory }: MedicalHistoryTabProps) {
  if (!medicalHistory) {
    return <p className="text-muted-foreground">No medical history recorded.</p>;
  }

  const mh = medicalHistory;

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-muted-foreground">Birth Term</Label>
            <p className="capitalize">{mh.birthTerm}</p>
          </div>
          {mh.gestationalAgeWeeks && (
            <div>
              <Label className="text-muted-foreground">Gestational Age</Label>
              <p>{mh.gestationalAgeWeeks} weeks</p>
            </div>
          )}
        </div>

        {mh.birthComplications && (
          <div>
            <Label className="text-muted-foreground">Birth Complications</Label>
            <Textarea readOnly value={mh.birthComplications} className="mt-1 resize-none" />
          </div>
        )}

        {mh.neonatalHistory && (
          <div>
            <Label className="text-muted-foreground">Neonatal History</Label>
            <Textarea readOnly value={mh.neonatalHistory} className="mt-1 resize-none" />
          </div>
        )}

        {mh.immunizations && (
          <div>
            <Label className="text-muted-foreground">Immunizations</Label>
            <Textarea readOnly value={mh.immunizations} className="mt-1 resize-none" />
          </div>
        )}

        {mh.allergies && (
          <div>
            <Label className="text-muted-foreground">Allergies</Label>
            <Textarea readOnly value={mh.allergies} className="mt-1 resize-none" />
          </div>
        )}

        {mh.currentMedications.length > 0 && (
          <div>
            <Label className="text-muted-foreground">Current Medications</Label>
            <div className="mt-2 space-y-2">
              {mh.currentMedications.map((med) => (
                <div key={`${med.name}-${med.dose}-${med.frequency}`} className="rounded-md border p-3">
                  <p className="font-medium">{med.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {med.dose} — {med.frequency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {mh.priorDiagnoses && mh.priorDiagnoses.length > 0 && (
          <div>
            <Label className="text-muted-foreground">Prior Diagnoses</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {mh.priorDiagnoses.map((d) => (
                <Badge key={d} variant="secondary">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {mh.familyHistory && (
          <div>
            <Label className="text-muted-foreground">Family History</Label>
            <Textarea readOnly value={mh.familyHistory} className="mt-1 resize-none" />
          </div>
        )}

        {mh.sensorySensitivities && (
          <div>
            <Label className="text-muted-foreground">Sensory Sensitivities</Label>
            <Textarea readOnly value={mh.sensorySensitivities} className="mt-1 resize-none" />
          </div>
        )}
      </div>
    </div>
  );
}
