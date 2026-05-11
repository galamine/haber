import type { AssessmentDto, UpdateAssessmentDto } from '@haber/shared';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import { useAssessment, useFinaliseAssessment, useUpdateAssessment } from '@/hooks/useAssessments';
import { useChild } from '@/hooks/useChildren';
import { useTaxonomy } from '@/hooks/useTaxonomies';

const STEPS = [
  { number: 1, label: 'Referral Info' },
  { number: 2, label: 'Chief Complaint' },
  { number: 3, label: 'Medical History' },
  { number: 4, label: 'Diagnoses' },
];

interface S1 {
  assessmentDate: string;
  assessmentLocation: string;
  referringDoctor: string;
  referralSource: string;
}

interface S2 {
  chiefComplaintTags: string[];
  chiefComplaint: string;
  observations: string;
  findings: Record<string, { notes: string }>;
  notes: string;
}

interface MedRow {
  id: string;
  name: string;
  dose: string;
  frequency: string;
}

interface TherapyRow {
  id: string;
  name: string;
  durationMonths: string;
}

interface S3 {
  birthTerm: string;
  gestationalAgeWeeks: string;
  birthComplications: string;
  neonatalHistory: string;
  prenatalHistory: string;
  immunizations: string;
  allergies: string;
  currentMedications: MedRow[];
  priorDiagnoses: string[];
  familyHistory: string;
  sensorySensitivities: string;
  previousTherapies: TherapyRow[];
}

interface S4 {
  primaryDiagnosisIds: string[];
}

function buildS3FromSnapshot(snap: Record<string, unknown>): S3 {
  const meds = (snap.currentMedications as Array<{ name: string; dose: string; frequency: string }> | null) ?? [];
  const therapies = (snap.previousTherapies as Array<{ name: string; durationMonths: number | null }> | null) ?? [];
  return {
    birthTerm: (snap.birthTerm as string) ?? '',
    gestationalAgeWeeks: snap.gestationalAgeWeeks != null ? String(snap.gestationalAgeWeeks) : '',
    birthComplications: (snap.birthComplications as string) ?? '',
    neonatalHistory: (snap.neonatalHistory as string) ?? '',
    prenatalHistory: (snap.prenatalHistory as string) ?? '',
    immunizations: (snap.immunizations as string) ?? '',
    allergies: (snap.allergies as string) ?? '',
    currentMedications: meds.map((m) => ({
      id: crypto.randomUUID(),
      name: m.name ?? '',
      dose: m.dose ?? '',
      frequency: m.frequency ?? '',
    })),
    priorDiagnoses: (snap.priorDiagnoses as string[]) ?? [],
    familyHistory: (snap.familyHistory as string) ?? '',
    sensorySensitivities: (snap.sensorySensitivities as string) ?? '',
    previousTherapies: therapies.map((t) => ({
      id: crypto.randomUUID(),
      name: t.name ?? '',
      durationMonths: t.durationMonths != null ? String(t.durationMonths) : '',
    })),
  };
}

export function AssessmentWizardPage() {
  const { childId = '', assessmentId = '' } = useParams<{ childId: string; assessmentId: string }>();
  const navigate = useNavigate();
  const initialized = useRef(false);
  const [step, setStep] = useState(1);

  const { data: child } = useChild(childId);
  const { data: assessment, isLoading } = useAssessment(childId, assessmentId);
  const updateMut = useUpdateAssessment();
  const finaliseMut = useFinaliseAssessment();

  const { data: functionalConcerns = [] } = useTaxonomy('functional-concerns');
  const { data: sensorySystems = [] } = useTaxonomy('sensory-systems');
  const { data: diagnoses = [] } = useTaxonomy('diagnoses');

  const [s1, setS1] = useState<S1>({ assessmentDate: '', assessmentLocation: '', referringDoctor: '', referralSource: '' });
  const [s2, setS2] = useState<S2>({
    chiefComplaintTags: [],
    chiefComplaint: '',
    observations: '',
    findings: {},
    notes: '',
  });
  const [s3, setS3] = useState<S3>({
    birthTerm: '',
    gestationalAgeWeeks: '',
    birthComplications: '',
    neonatalHistory: '',
    prenatalHistory: '',
    immunizations: '',
    allergies: '',
    currentMedications: [],
    priorDiagnoses: [],
    familyHistory: '',
    sensorySensitivities: '',
    previousTherapies: [],
  });
  const [s4, setS4] = useState<S4>({ primaryDiagnosisIds: [] });

  useEffect(() => {
    if (!assessment || initialized.current) return;
    initialized.current = true;
    setS1({
      assessmentDate: assessment.assessmentDate,
      assessmentLocation: assessment.assessmentLocation ?? '',
      referringDoctor: assessment.referringDoctor ?? '',
      referralSource: assessment.referralSource ?? '',
    });
    setS2({
      chiefComplaintTags: assessment.chiefComplaintTags,
      chiefComplaint: assessment.chiefComplaint ?? '',
      observations: assessment.observations ?? '',
      findings: (assessment.findings as Record<string, { notes: string }>) ?? {},
      notes: assessment.notes ?? '',
    });
    setS3(buildS3FromSnapshot((assessment.medicalHistorySnapshot ?? {}) as Record<string, unknown>));
    setS4({ primaryDiagnosisIds: assessment.primaryDiagnosisIds });
  }, [assessment]);

  const isReadOnly = assessment?.status === 'finalised';

  const handleNext = async () => {
    let data: UpdateAssessmentDto;
    switch (step) {
      case 1:
        data = {
          assessmentDate: s1.assessmentDate || undefined,
          assessmentLocation: s1.assessmentLocation || null,
          referringDoctor: s1.referringDoctor || null,
          referralSource: s1.referralSource || null,
        };
        break;
      case 2:
        data = {
          chiefComplaintTags: s2.chiefComplaintTags,
          chiefComplaint: s2.chiefComplaint || null,
          observations: s2.observations || null,
          findings: s2.findings,
          notes: s2.notes || null,
        };
        break;
      case 3: {
        const snapshot: Record<string, unknown> = {
          birthTerm: s3.birthTerm || null,
          gestationalAgeWeeks: s3.gestationalAgeWeeks ? Number(s3.gestationalAgeWeeks) : null,
          birthComplications: s3.birthComplications || null,
          neonatalHistory: s3.neonatalHistory || null,
          prenatalHistory: s3.prenatalHistory || null,
          immunizations: s3.immunizations || null,
          allergies: s3.allergies || null,
          currentMedications: s3.currentMedications.map(({ id: _id, ...m }) => m),
          priorDiagnoses: s3.priorDiagnoses,
          familyHistory: s3.familyHistory || null,
          sensorySensitivities: s3.sensorySensitivities || null,
          previousTherapies: s3.previousTherapies.map(({ id: _id, name, durationMonths }) => ({
            name,
            durationMonths: durationMonths ? Number(durationMonths) : null,
          })),
        };
        data = { medicalHistorySnapshot: snapshot };
        break;
      }
      default:
        return;
    }
    try {
      await updateMut.mutateAsync({ childId, assessmentId, data });
      setStep(step + 1);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleFinalise = async () => {
    try {
      await updateMut.mutateAsync({ childId, assessmentId, data: { primaryDiagnosisIds: s4.primaryDiagnosisIds } });
      await finaliseMut.mutateAsync({ childId, assessmentId });
    } catch {
      toast.error('Failed to finalise. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!assessment) return <p className="text-destructive">Assessment not found</p>;

  const isSaving = updateMut.isPending || finaliseMut.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assessment{assessment.version > 1 ? ` v${assessment.version}` : ''}</h1>
          {child && <p className="text-sm text-muted-foreground mt-0.5">{child.fullName}</p>}
        </div>
        <Button variant="ghost" size="sm" onClick={() => navigate(`/children/${childId}`)}>
          ← Back to Profile
        </Button>
      </div>

      {/* Finalised banner */}
      {isReadOnly && (
        <Alert variant="default">
          <CheckCircle2 className="size-4" />
          <AlertDescription>This assessment is finalised and cannot be edited.</AlertDescription>
        </Alert>
      )}

      {/* Step indicator */}
      <div className="flex gap-2 flex-wrap">
        {STEPS.map((s) => (
          <div
            key={s.number}
            className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium ${
              step === s.number
                ? 'bg-primary text-primary-foreground'
                : step > s.number
                  ? 'bg-secondary text-secondary-foreground'
                  : 'bg-muted text-muted-foreground'
            }`}
          >
            {s.number}. {s.label}
          </div>
        ))}
      </div>

      {/* ─── Section 1: Referral Info ─── */}
      {step === 1 && (
        <div className="space-y-4">
          {child && (
            <div className="rounded-lg border bg-muted/30 p-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Child</p>
                <p className="text-sm font-medium">{child.fullName}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">DOB</p>
                <p className="text-sm font-medium">{child.dob ? new Date(child.dob).toLocaleDateString() : '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Sex</p>
                <p className="text-sm font-medium capitalize">{child.sex ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">OP Number</p>
                <p className="text-sm font-medium">{child.opNumber ?? '—'}</p>
              </div>
            </div>
          )}

          <div className="grid gap-4">
            <div>
              <Label htmlFor="assessmentDate">Assessment Date *</Label>
              <Input
                id="assessmentDate"
                type="date"
                value={s1.assessmentDate}
                onChange={(e) => setS1({ ...s1, assessmentDate: e.target.value })}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="assessmentLocation">Assessment Location</Label>
              <Input
                id="assessmentLocation"
                value={s1.assessmentLocation}
                onChange={(e) => setS1({ ...s1, assessmentLocation: e.target.value })}
                placeholder="e.g. Clinic Room 3"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="referringDoctor">Referring Doctor</Label>
              <Input
                id="referringDoctor"
                value={s1.referringDoctor}
                onChange={(e) => setS1({ ...s1, referringDoctor: e.target.value })}
                placeholder="Dr. Name"
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="referralSource">Referral Source</Label>
              <Input
                id="referralSource"
                value={s1.referralSource}
                onChange={(e) => setS1({ ...s1, referralSource: e.target.value })}
                placeholder="e.g. Paediatrician, school referral"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── Section 2: Chief Complaint & Observations ─── */}
      {step === 2 && (
        <div className="space-y-6">
          {/* Chief complaint tags */}
          {functionalConcerns.length > 0 && (
            <div>
              <Label>Chief Complaint Tags</Label>
              <p className="text-xs text-muted-foreground mb-2">Select all functional concerns that apply</p>
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 sm:grid-cols-3">
                {functionalConcerns.map((fc) => (
                  <div key={fc.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`fc-${fc.id}`}
                      checked={s2.chiefComplaintTags.includes(fc.id)}
                      onCheckedChange={(checked) =>
                        setS2((prev) => ({
                          ...prev,
                          chiefComplaintTags: checked
                            ? [...prev.chiefComplaintTags, fc.id]
                            : prev.chiefComplaintTags.filter((id) => id !== fc.id),
                        }))
                      }
                      disabled={isReadOnly}
                    />
                    <Label htmlFor={`fc-${fc.id}`} className="cursor-pointer font-normal text-sm">
                      {fc.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="chiefComplaint">Chief Complaint</Label>
            <Textarea
              id="chiefComplaint"
              value={s2.chiefComplaint}
              onChange={(e) => setS2({ ...s2, chiefComplaint: e.target.value })}
              placeholder="Describe the primary presenting concern..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="observations">Observations</Label>
            <Textarea
              id="observations"
              value={s2.observations}
              onChange={(e) => setS2({ ...s2, observations: e.target.value })}
              placeholder="Behavioural and clinical observations..."
              rows={4}
              disabled={isReadOnly}
            />
          </div>

          {/* Findings per sensory system */}
          <div>
            <Label>Clinical Findings by Sensory System</Label>
            <p className="text-xs text-muted-foreground mb-3">Record findings for each sensory domain</p>
            <div className="space-y-4">
              {sensorySystems.map((sys) => (
                <div key={sys.id} className="space-y-1">
                  <Label className="text-sm font-medium">{sys.name}</Label>
                  <Textarea
                    value={s2.findings[sys.id]?.notes ?? ''}
                    onChange={(e) =>
                      setS2((prev) => ({
                        ...prev,
                        findings: { ...prev.findings, [sys.id]: { notes: e.target.value } },
                      }))
                    }
                    placeholder={`Findings for ${sys.name}...`}
                    rows={2}
                    disabled={isReadOnly}
                  />
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="assessmentNotes">General Notes</Label>
            <Textarea
              id="assessmentNotes"
              value={s2.notes}
              onChange={(e) => setS2({ ...s2, notes: e.target.value })}
              placeholder="Any additional clinical notes..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ─── Section 3: Medical & Developmental History ─── */}
      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Pre-populated from the child's medical history at assessment creation time. Edits here update the assessment
            snapshot only — the source record is not changed.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Birth Term</Label>
              <Select value={s3.birthTerm} onValueChange={(v) => setS3({ ...s3, birthTerm: v })} disabled={isReadOnly}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term">Term</SelectItem>
                  <SelectItem value="preterm">Preterm</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="gestationalAge">Gestational Age (weeks)</Label>
              <Input
                id="gestationalAge"
                type="number"
                value={s3.gestationalAgeWeeks}
                onChange={(e) => setS3({ ...s3, gestationalAgeWeeks: e.target.value })}
                placeholder="e.g. 38"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="birthComplications">Birth Complications</Label>
            <Textarea
              id="birthComplications"
              value={s3.birthComplications}
              onChange={(e) => setS3({ ...s3, birthComplications: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="prenatalHistory">Prenatal History</Label>
            <Textarea
              id="prenatalHistory"
              value={s3.prenatalHistory}
              onChange={(e) => setS3({ ...s3, prenatalHistory: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="neonatalHistory">Neonatal History</Label>
            <Textarea
              id="neonatalHistory"
              value={s3.neonatalHistory}
              onChange={(e) => setS3({ ...s3, neonatalHistory: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="immunizations">Immunizations</Label>
            <Textarea
              id="immunizations"
              value={s3.immunizations}
              onChange={(e) => setS3({ ...s3, immunizations: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="allergies">Allergies</Label>
            <Textarea
              id="allergies"
              value={s3.allergies}
              onChange={(e) => setS3({ ...s3, allergies: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          {/* Current medications */}
          <div>
            <Label>Current Medications</Label>
            {s3.currentMedications.map((med) => (
              <div key={med.id} className="mb-2 flex gap-2">
                <Input
                  placeholder="Name"
                  value={med.name}
                  onChange={(e) =>
                    setS3({
                      ...s3,
                      currentMedications: s3.currentMedications.map((m) =>
                        m.id === med.id ? { ...m, name: e.target.value } : m
                      ),
                    })
                  }
                  disabled={isReadOnly}
                />
                <Input
                  placeholder="Dose"
                  value={med.dose}
                  onChange={(e) =>
                    setS3({
                      ...s3,
                      currentMedications: s3.currentMedications.map((m) =>
                        m.id === med.id ? { ...m, dose: e.target.value } : m
                      ),
                    })
                  }
                  disabled={isReadOnly}
                />
                <Input
                  placeholder="Frequency"
                  value={med.frequency}
                  onChange={(e) =>
                    setS3({
                      ...s3,
                      currentMedications: s3.currentMedications.map((m) =>
                        m.id === med.id ? { ...m, frequency: e.target.value } : m
                      ),
                    })
                  }
                  disabled={isReadOnly}
                />
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setS3({ ...s3, currentMedications: s3.currentMedications.filter((m) => m.id !== med.id) })
                    }
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setS3({
                    ...s3,
                    currentMedications: [
                      ...s3.currentMedications,
                      { id: crypto.randomUUID(), name: '', dose: '', frequency: '' },
                    ],
                  })
                }
              >
                Add Medication
              </Button>
            )}
          </div>

          <div>
            <Label>Prior Diagnoses</Label>
            <TagInput
              value={s3.priorDiagnoses}
              onChange={(v) => setS3({ ...s3, priorDiagnoses: v })}
              placeholder="Add diagnosis and press Enter..."
            />
          </div>

          <div>
            <Label htmlFor="familyHistory">Family History</Label>
            <Textarea
              id="familyHistory"
              value={s3.familyHistory}
              onChange={(e) => setS3({ ...s3, familyHistory: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="sensorySensitivities">Sensory Sensitivities</Label>
            <Textarea
              id="sensorySensitivities"
              value={s3.sensorySensitivities}
              onChange={(e) => setS3({ ...s3, sensorySensitivities: e.target.value })}
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          {/* Previous therapies */}
          <div>
            <Label>Previous Therapies</Label>
            {s3.previousTherapies.map((t) => (
              <div key={t.id} className="mb-2 flex gap-2">
                <Input
                  placeholder="Therapy name"
                  value={t.name}
                  onChange={(e) =>
                    setS3({
                      ...s3,
                      previousTherapies: s3.previousTherapies.map((pt) =>
                        pt.id === t.id ? { ...pt, name: e.target.value } : pt
                      ),
                    })
                  }
                  disabled={isReadOnly}
                />
                <Input
                  placeholder="Duration (months)"
                  type="number"
                  value={t.durationMonths}
                  onChange={(e) =>
                    setS3({
                      ...s3,
                      previousTherapies: s3.previousTherapies.map((pt) =>
                        pt.id === t.id ? { ...pt, durationMonths: e.target.value } : pt
                      ),
                    })
                  }
                  disabled={isReadOnly}
                />
                {!isReadOnly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setS3({ ...s3, previousTherapies: s3.previousTherapies.filter((pt) => pt.id !== t.id) })}
                  >
                    <X className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            {!isReadOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setS3({
                    ...s3,
                    previousTherapies: [...s3.previousTherapies, { id: crypto.randomUUID(), name: '', durationMonths: '' }],
                  })
                }
              >
                Add Previous Therapy
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── Section 4: Diagnoses & Summary ─── */}
      {step === 4 && (
        <div className="space-y-6">
          {/* Primary diagnoses multi-select */}
          <div>
            <Label>Primary Diagnoses</Label>
            <p className="text-xs text-muted-foreground mb-2">Select all diagnoses that apply</p>
            <div className="grid grid-cols-1 gap-y-2 sm:grid-cols-2">
              {diagnoses.map((dx) => (
                <div key={dx.id} className="flex items-start gap-2">
                  <Checkbox
                    id={`dx-${dx.id}`}
                    checked={s4.primaryDiagnosisIds.includes(dx.id)}
                    onCheckedChange={(checked) =>
                      setS4((prev) => ({
                        primaryDiagnosisIds: checked
                          ? [...prev.primaryDiagnosisIds, dx.id]
                          : prev.primaryDiagnosisIds.filter((id) => id !== dx.id),
                      }))
                    }
                    disabled={isReadOnly}
                  />
                  <Label htmlFor={`dx-${dx.id}`} className="cursor-pointer font-normal text-sm leading-snug">
                    {dx.name}
                    {'icdReference' in dx && dx.icdReference && (
                      <span className="ml-1.5 text-xs text-muted-foreground">{dx.icdReference}</span>
                    )}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <Separator />
          <AssessmentSummary
            assessment={assessment}
            s1={s1}
            s2={s2}
            s4={s4}
            functionalConcerns={functionalConcerns}
            diagnoses={diagnoses}
          />
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSaving}>
            Back
          </Button>
        )}
        {step < 4 && !isReadOnly && (
          <Button onClick={handleNext} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Next'}
          </Button>
        )}
        {step === 4 && !isReadOnly && (
          <Button onClick={handleFinalise} disabled={isSaving}>
            {isSaving ? 'Finalising...' : 'Finalise Assessment'}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SummaryProps {
  assessment: AssessmentDto;
  s1: S1;
  s2: S2;
  s4: S4;
  functionalConcerns: Array<{ id: string; name: string }>;
  diagnoses: Array<{ id: string; name: string }>;
}

function AssessmentSummary({ assessment, s1, s2, s4, functionalConcerns, diagnoses }: SummaryProps) {
  const fcMap = Object.fromEntries(functionalConcerns.map((fc) => [fc.id, fc.name]));
  const dxMap = Object.fromEntries(diagnoses.map((dx) => [dx.id, dx.name]));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Assessment Summary</h3>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
        <SummaryField label="Date" value={s1.assessmentDate} />
        <SummaryField label="Location" value={s1.assessmentLocation} />
        <SummaryField label="Referring Doctor" value={s1.referringDoctor} />
        <SummaryField label="Referral Source" value={s1.referralSource} />
        <SummaryField label="Version" value={String(assessment.version)} />
      </div>

      {s2.chiefComplaintTags.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Chief Complaint Tags</p>
          <div className="flex flex-wrap gap-1">
            {s2.chiefComplaintTags.map((id) => (
              <Badge key={id} variant="secondary">
                {fcMap[id] ?? id.slice(0, 8)}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {s2.chiefComplaint && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Chief Complaint</p>
          <p className="text-sm">{s2.chiefComplaint}</p>
        </div>
      )}

      {s4.primaryDiagnosisIds.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-1">Primary Diagnoses</p>
          <div className="flex flex-wrap gap-1">
            {s4.primaryDiagnosisIds.map((id) => (
              <Badge key={id} variant="outline">
                {dxMap[id] ?? id.slice(0, 8)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryField({ label, value }: { label: string; value: string | undefined | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
