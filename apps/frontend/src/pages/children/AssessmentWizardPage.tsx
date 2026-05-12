import type { AssessmentDto, InterventionSetting } from '@haber/shared';
import type { MilestoneDto, SensorySystemDto } from '@haber/shared/dtos';
import { CheckCircle2, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ApiError } from '@/api/client';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import {
  useAssessment,
  useFinaliseAssessment,
  useFunctionalConcerns,
  useInterventionPlan,
  useMilestones,
  useSensoryProfile,
  useSignAssessment,
  useSignatures,
  useToolResults,
  useUpdateAssessment,
  useUpsertFunctionalConcerns,
  useUpsertInterventionPlan,
  useUpsertMilestones,
  useUpsertSensoryProfile,
  useUpsertToolResults,
} from '@/hooks/useAssessments';
import { useChild } from '@/hooks/useChildren';
import { useTaxonomy } from '@/hooks/useTaxonomies';
import { cn } from '@/lib/utils';

const STEPS = [
  { number: 1, label: 'Referral Info' },
  { number: 2, label: 'Chief Complaint' },
  { number: 3, label: 'Medical History' },
  { number: 4, label: 'Diagnoses' },
  { number: 5, label: 'Milestones' },
  { number: 6, label: 'Sensory Profile' },
  { number: 7, label: 'Functional Concerns' },
  { number: 8, label: 'Assessment Tools' },
  { number: 9, label: 'Goals & Plan' },
  { number: 10, label: 'Signatures' },
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

// Keyed by milestoneId for O(1) updates
type S5Record = Record<string, { achievedAtAgeMonths: string; delayed: boolean; notes: string }>;
// Keyed by sensorySystemId; null means unrated (will be excluded from PUT)
type S6Record = Record<string, { rating: number | null; notes: string }>;

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
  const s5InitRef = useRef(false);
  const s6InitRef = useRef(false);
  const s7InitRef = useRef(false);
  const s8InitRef = useRef(false);
  const s9InitRef = useRef(false);
  const s10InitRef = useRef(false);
  const [step, setStep] = useState(1);

  const { data: child } = useChild(childId);
  const { data: assessment, isLoading } = useAssessment(childId, assessmentId);
  const updateMut = useUpdateAssessment();
  const finaliseMut = useFinaliseAssessment();
  const upsertMilestonesMut = useUpsertMilestones();
  const upsertSensoryProfileMut = useUpsertSensoryProfile();
  const upsertFunctionalConcernsMut = useUpsertFunctionalConcerns();
  const upsertToolResultsMut = useUpsertToolResults();
  const upsertInterventionPlanMut = useUpsertInterventionPlan();
  const signMut = useSignAssessment();

  // Taxonomy lists
  const { data: milestones = [] } = useTaxonomy('milestones');
  const { data: functionalConcerns = [] } = useTaxonomy('functional-concerns');
  const { data: sensorySystems = [] } = useTaxonomy('sensory-systems');
  const { data: diagnoses = [] } = useTaxonomy('diagnoses');
  const { data: assessmentTools = [] } = useTaxonomy('assessment-tools');

  // Saved section data from backend
  const { data: milestonesData } = useMilestones(childId, assessmentId);
  const { data: sensoryProfileData } = useSensoryProfile(childId, assessmentId);
  const { data: functionalConcernsData } = useFunctionalConcerns(childId, assessmentId);
  const { data: toolResultsData } = useToolResults(childId, assessmentId);
  const { data: interventionPlanData } = useInterventionPlan(childId, assessmentId);
  const { data: signaturesData } = useSignatures(childId, assessmentId);

  // Core assessment state (steps 1–4)
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

  // Section state (steps 5–7)
  const [s5, setS5] = useState<S5Record>({});
  const [s6, setS6] = useState<S6Record>({});
  const [sensoryObservations, setSensoryObservations] = useState('');
  const [s7FunctionalConcernIds, setS7FunctionalConcernIds] = useState<string[]>([]);
  const [clinicalObservations, setClinicalObservations] = useState('');

  // Section state (step 8 - Assessment Tools)
  const [s8SelectedTools, setS8SelectedTools] = useState<Record<string, string>>({});
  const [s8OverallSummary, setS8OverallSummary] = useState('');

  // Section state (step 9 - Goals & Intervention Plan)
  const [s9Frequency, setS9Frequency] = useState('');
  const [s9Duration, setS9Duration] = useState('');
  const [s9Setting, setS9Setting] = useState<InterventionSetting | ''>('');
  const [s9ReviewPeriod, setS9ReviewPeriod] = useState('');
  const [s9HomeProgram, setS9HomeProgram] = useState('');
  const [s9Referrals, setS9Referrals] = useState('');
  const [s9ShortTermGoals, setS9ShortTermGoals] = useState<string[]>(['', '', '', '']);
  const [s9LongTermGoals, setS9LongTermGoals] = useState<string[]>(['', '', '', '']);

  // Section state (step 10 - Signatures)
  const [s10TherapistName, setS10TherapistName] = useState('');
  const [s10TherapistCredentials, setS10TherapistCredentials] = useState('');
  const [s10GuardianName, setS10GuardianName] = useState('');
  const [s10GuardianConsent, setS10GuardianConsent] = useState(false);

  const shortTermGoalIds = useMemo(() => Array.from({ length: 4 }, () => crypto.randomUUID()), []);
  const longTermGoalIds = useMemo(() => Array.from({ length: 4 }, () => crypto.randomUUID()), []);

  // Hydrate core assessment state once
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

  // Hydrate milestone section state once
  useEffect(() => {
    if (!milestonesData || s5InitRef.current) return;
    s5InitRef.current = true;
    const record: S5Record = {};
    for (const row of milestonesData) {
      record[row.milestoneId] = {
        achievedAtAgeMonths: row.achievedAtAgeMonths != null ? String(row.achievedAtAgeMonths) : '',
        delayed: row.delayed,
        notes: row.notes ?? '',
      };
    }
    setS5(record);
  }, [milestonesData]);

  // Hydrate sensory section state once
  useEffect(() => {
    if (!sensoryProfileData || s6InitRef.current) return;
    s6InitRef.current = true;
    const record: S6Record = {};
    for (const row of sensoryProfileData.ratings) {
      record[row.sensorySystemId] = { rating: row.rating, notes: row.notes ?? '' };
    }
    setS6(record);
    setSensoryObservations(sensoryProfileData.sensoryObservations ?? '');
  }, [sensoryProfileData]);

  // Hydrate functional concerns section state once
  useEffect(() => {
    if (!functionalConcernsData || s7InitRef.current) return;
    s7InitRef.current = true;
    setS7FunctionalConcernIds(functionalConcernsData.concerns.map((c) => c.functionalConcernId));
    setClinicalObservations(functionalConcernsData.functionalConcernObservations ?? '');
  }, [functionalConcernsData]);

  // Hydrate assessment tools section state once
  useEffect(() => {
    if (!toolResultsData || s8InitRef.current) return;
    s8InitRef.current = true;
    const record: Record<string, string> = {};
    for (const tr of toolResultsData) {
      record[tr.assessmentToolId] = tr.scoresSummary ?? '';
    }
    setS8SelectedTools(record);
  }, [toolResultsData]);

  // Hydrate goals & intervention plan section state once
  useEffect(() => {
    if (!interventionPlanData || s9InitRef.current) return;
    s9InitRef.current = true;
    setS9Frequency(String(interventionPlanData.frequencyPerWeek));
    setS9Duration(String(interventionPlanData.sessionDurationMinutes));
    setS9Setting(interventionPlanData.interventionSetting);
    setS9ReviewPeriod(String(interventionPlanData.reviewPeriodWeeks));
    setS9HomeProgram(interventionPlanData.homeProgramRecommendations ?? '');
    setS9Referrals(interventionPlanData.referralsToSpecialists ?? '');
    const shortGoals = (interventionPlanData.shortTermGoals as { description: string }[]) ?? [];
    const longGoals = (interventionPlanData.longTermGoals as { description: string }[]) ?? [];
    setS9ShortTermGoals([
      shortGoals[0]?.description ?? '',
      shortGoals[1]?.description ?? '',
      shortGoals[2]?.description ?? '',
      shortGoals[3]?.description ?? '',
    ]);
    setS9LongTermGoals([
      longGoals[0]?.description ?? '',
      longGoals[1]?.description ?? '',
      longGoals[2]?.description ?? '',
      longGoals[3]?.description ?? '',
    ]);
  }, [interventionPlanData]);

  // Hydrate signatures section state once
  useEffect(() => {
    if (!signaturesData || s10InitRef.current) return;
    s10InitRef.current = true;
    const therapistSig = signaturesData.find((s) => s.signatoryType === 'therapist');
    const guardianSig = signaturesData.find((s) => s.signatoryType === 'guardian');
    if (therapistSig) {
      setS10TherapistName(therapistSig.typedName);
      setS10TherapistCredentials(therapistSig.credentials ?? '');
    }
    if (guardianSig) {
      setS10GuardianName(guardianSig.typedName);
      setS10GuardianConsent(guardianSig.consentCheckbox ?? false);
    }
  }, [signaturesData]);

  const isReadOnly = assessment?.status === 'finalised';

  const handleNext = async () => {
    try {
      switch (step) {
        case 1:
          await updateMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              assessmentDate: s1.assessmentDate || undefined,
              assessmentLocation: s1.assessmentLocation || null,
              referringDoctor: s1.referringDoctor || null,
              referralSource: s1.referralSource || null,
            },
          });
          break;
        case 2:
          await updateMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              chiefComplaintTags: s2.chiefComplaintTags,
              chiefComplaint: s2.chiefComplaint || null,
              observations: s2.observations || null,
              findings: s2.findings,
              notes: s2.notes || null,
            },
          });
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
          await updateMut.mutateAsync({ childId, assessmentId, data: { medicalHistorySnapshot: snapshot } });
          break;
        }
        case 4:
          await updateMut.mutateAsync({ childId, assessmentId, data: { primaryDiagnosisIds: s4.primaryDiagnosisIds } });
          break;
        case 5:
          await upsertMilestonesMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              milestones: (milestones as unknown as MilestoneDto[]).map((m) => {
                const row = s5[m.id] ?? { achievedAtAgeMonths: '', delayed: false, notes: '' };
                return {
                  milestoneId: m.id,
                  achievedAtAgeMonths: row.achievedAtAgeMonths ? parseInt(row.achievedAtAgeMonths, 10) : null,
                  delayed: row.delayed,
                  notes: row.notes || null,
                };
              }),
            },
          });
          break;
        case 6:
          await upsertSensoryProfileMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              ratings: Object.entries(s6)
                .filter(([, row]) => row.rating != null)
                .map(([sensorySystemId, row]) => ({
                  sensorySystemId,
                  rating: row.rating as number,
                  notes: row.notes || null,
                })),
              sensoryObservations: sensoryObservations || null,
            },
          });
          break;
        case 7:
          await upsertFunctionalConcernsMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              functionalConcernIds: s7FunctionalConcernIds,
              clinicalObservations: clinicalObservations || null,
            },
          });
          break;
        case 8:
          await upsertToolResultsMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              toolResults: Object.entries(s8SelectedTools)
                .filter(([, scoresSummary]) => scoresSummary.trim() !== '')
                .map(([assessmentToolId, scoresSummary]) => ({ assessmentToolId, scoresSummary: scoresSummary.trim() })),
              overallScoresSummary: s8OverallSummary.trim() || null,
            },
          });
          break;
        case 9:
          await upsertInterventionPlanMut.mutateAsync({
            childId,
            assessmentId,
            data: {
              frequencyPerWeek: parseInt(s9Frequency, 10) || 0,
              sessionDurationMinutes: parseInt(s9Duration, 10) || 0,
              interventionSetting: s9Setting || 'clinic',
              reviewPeriodWeeks: parseInt(s9ReviewPeriod, 10) || 0,
              homeProgramRecommendations: s9HomeProgram.trim() || null,
              referralsToSpecialists: s9Referrals.trim() || null,
              shortTermGoals: s9ShortTermGoals
                .map((g) => g.trim())
                .filter((g) => g !== '')
                .map((description) => ({ description })),
              longTermGoals: s9LongTermGoals
                .map((g) => g.trim())
                .filter((g) => g !== '')
                .map((description) => ({ description })),
            },
          });
          break;
        default:
          return;
      }
      setStep(step + 1);
    } catch {
      toast.error('Failed to save. Please try again.');
    }
  };

  const handleFinalise = async () => {
    try {
      await upsertInterventionPlanMut.mutateAsync({
        childId,
        assessmentId,
        data: {
          frequencyPerWeek: parseInt(s9Frequency, 10) || 0,
          sessionDurationMinutes: parseInt(s9Duration, 10) || 0,
          interventionSetting: s9Setting || 'clinic',
          reviewPeriodWeeks: parseInt(s9ReviewPeriod, 10) || 0,
          homeProgramRecommendations: s9HomeProgram.trim() || null,
          referralsToSpecialists: s9Referrals.trim() || null,
          shortTermGoals: s9ShortTermGoals
            .map((g) => g.trim())
            .filter((g) => g !== '')
            .map((description) => ({ description })),
          longTermGoals: s9LongTermGoals
            .map((g) => g.trim())
            .filter((g) => g !== '')
            .map((description) => ({ description })),
        },
      });
      await finaliseMut.mutateAsync({ childId, assessmentId });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.message === 'MILESTONE_REQUIRED') {
          toast.error('Please rate at least one milestone before finalising.');
        } else if (err.message === 'SENSORY_PROFILE_INCOMPLETE') {
          toast.error('Please rate all 7 sensory systems before finalising.');
        } else if (err.message === 'SIGNATURES_REQUIRED') {
          const missing = (err as { missing?: string[] }).missing ?? [];
          const parts: string[] = [];
          if (missing.includes('therapist')) parts.push('therapist');
          if (missing.includes('guardian')) parts.push('guardian');
          toast.error(`Missing signature${parts.length > 1 ? 's' : ''}: ${parts.join(', ')}`);
        } else if (err.message === 'GOALS_INCOMPLETE') {
          toast.error('Please add at least one short-term and one long-term goal.');
        } else {
          toast.error('Failed to finalise. Please try again.');
        }
      } else {
        toast.error('Failed to finalise. Please try again.');
      }
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

  const isSaving =
    updateMut.isPending ||
    finaliseMut.isPending ||
    upsertMilestonesMut.isPending ||
    upsertSensoryProfileMut.isPending ||
    upsertFunctionalConcernsMut.isPending ||
    upsertToolResultsMut.isPending ||
    upsertInterventionPlanMut.isPending ||
    signMut.isPending;

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

      {/* ─── Section 5: Developmental Milestones ─── */}
      {step === 5 && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              For each milestone, note whether it was delayed and the age at which it was achieved (if known).
            </p>
          </div>

          {milestones.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Milestone</TableHead>
                    <TableHead className="whitespace-nowrap">Age Band</TableHead>
                    <TableHead className="whitespace-nowrap">Achieved At (months)</TableHead>
                    <TableHead className="text-center">Delayed</TableHead>
                    <TableHead className="min-w-[160px]">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(milestones as unknown as MilestoneDto[]).map((m) => {
                    const row = s5[m.id] ?? { achievedAtAgeMonths: '', delayed: false, notes: '' };
                    return (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium text-sm">{m.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {m.ageBandMinMonths}–{m.ageBandMaxMonths}m
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={240}
                            value={row.achievedAtAgeMonths}
                            onChange={(e) =>
                              setS5((prev) => ({ ...prev, [m.id]: { ...row, achievedAtAgeMonths: e.target.value } }))
                            }
                            className="w-24"
                            placeholder="—"
                            disabled={isReadOnly}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={row.delayed}
                            onCheckedChange={(checked) =>
                              setS5((prev) => ({ ...prev, [m.id]: { ...row, delayed: !!checked } }))
                            }
                            disabled={isReadOnly}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.notes}
                            onChange={(e) => setS5((prev) => ({ ...prev, [m.id]: { ...row, notes: e.target.value } }))}
                            placeholder="Optional notes..."
                            disabled={isReadOnly}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 6: Sensory Processing Profile ─── */}
      {step === 6 && (
        <div className="space-y-6">
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">1</span> = Hypo-responsive
            </span>
            <span>
              <span className="font-medium text-foreground">3</span> = Typical
            </span>
            <span>
              <span className="font-medium text-foreground">5</span> = Hyper-responsive
            </span>
          </div>

          {sensorySystems.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="space-y-3">
              {(sensorySystems as unknown as SensorySystemDto[]).map((sys) => {
                const row = s6[sys.id] ?? { rating: null, notes: '' };
                return (
                  <div key={sys.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium">{sys.name}</p>
                        {sys.description && <p className="text-xs text-muted-foreground mt-0.5">{sys.description}</p>}
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {([1, 2, 3, 4, 5] as const).map((n) => (
                          <button
                            key={n}
                            type="button"
                            disabled={isReadOnly}
                            onClick={() => setS6((prev) => ({ ...prev, [sys.id]: { ...row, rating: n } }))}
                            className={cn(
                              'w-9 h-9 rounded-full border text-sm font-semibold transition-colors',
                              row.rating === n
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'border-border hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Input
                      value={row.notes}
                      onChange={(e) => setS6((prev) => ({ ...prev, [sys.id]: { ...row, notes: e.target.value } }))}
                      placeholder="Notes for this system..."
                      disabled={isReadOnly}
                    />
                  </div>
                );
              })}
            </div>
          )}

          <div>
            <Label htmlFor="sensoryObservations">Overall Sensory Observations</Label>
            <Textarea
              id="sensoryObservations"
              value={sensoryObservations}
              onChange={(e) => setSensoryObservations(e.target.value)}
              placeholder="Overall behavioural observations across sensory systems..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ─── Section 7: Functional & Fine-Motor Concerns ─── */}
      {step === 7 && (
        <div className="space-y-6">
          <div>
            <Label>Functional & Fine-Motor Concerns</Label>
            <p className="text-xs text-muted-foreground mb-3">Select all concerns that apply to this child</p>
            {functionalConcerns.length === 0 ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="grid grid-cols-1 gap-y-2.5 sm:grid-cols-2">
                {functionalConcerns.map((fc) => (
                  <div key={fc.id} className="flex items-start gap-2">
                    <Checkbox
                      id={`s7-fc-${fc.id}`}
                      checked={s7FunctionalConcernIds.includes(fc.id)}
                      onCheckedChange={(checked) =>
                        setS7FunctionalConcernIds((prev) => (checked ? [...prev, fc.id] : prev.filter((id) => id !== fc.id)))
                      }
                      disabled={isReadOnly}
                    />
                    <Label htmlFor={`s7-fc-${fc.id}`} className="cursor-pointer font-normal text-sm leading-snug">
                      {fc.name}
                      {'category' in fc && fc.category && (
                        <span className="ml-1.5 text-xs text-muted-foreground">({fc.category})</span>
                      )}
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="clinicalObservations">Clinical Observations</Label>
            <Textarea
              id="clinicalObservations"
              value={clinicalObservations}
              onChange={(e) => setClinicalObservations(e.target.value)}
              placeholder="Clinical observations related to functional and fine-motor concerns..."
              rows={4}
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ─── Section 8: Standardised Assessment Tools ─── */}
      {step === 8 && (
        <div className="space-y-6">
          <div>
            <Label>Standardised Assessment Tools</Label>
            <p className="text-xs text-muted-foreground mb-3">Select tools administered and enter scores for each</p>
            {assessmentTools.length === 0 ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div className="space-y-4">
                {assessmentTools.map((tool) => {
                  const isSelected = s8SelectedTools[tool.id] !== undefined;
                  return (
                    <div key={tool.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id={`s8-tool-${tool.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            setS8SelectedTools((prev) => {
                              const next = { ...prev };
                              if (checked) {
                                next[tool.id] = '';
                              } else {
                                delete next[tool.id];
                              }
                              return next;
                            });
                          }}
                          disabled={isReadOnly}
                        />
                        <Label htmlFor={`s8-tool-${tool.id}`} className="cursor-pointer font-normal text-sm leading-snug">
                          {tool.name}
                          {'fullName' in tool && tool.fullName && (
                            <span className="ml-1.5 text-xs text-muted-foreground">({tool.fullName})</span>
                          )}
                        </Label>
                      </div>
                      {isSelected && (
                        <Textarea
                          value={s8SelectedTools[tool.id] ?? ''}
                          onChange={(e) => setS8SelectedTools((prev) => ({ ...prev, [tool.id]: e.target.value }))}
                          placeholder="Enter scores summary (e.g., Raw score 45, Percentile 72)..."
                          rows={2}
                          disabled={isReadOnly}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="s8OverallSummary">Overall Scores Summary</Label>
            <Textarea
              id="s8OverallSummary"
              value={s8OverallSummary}
              onChange={(e) => setS8OverallSummary(e.target.value)}
              placeholder="Overall interpretation of scores and percentile rankings..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>
        </div>
      )}

      {/* ─── Section 9: Initial Goals & Intervention Plan ─── */}
      {step === 9 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="s9Frequency">Frequency (sessions per week)</Label>
              <Input
                id="s9Frequency"
                type="number"
                min={1}
                value={s9Frequency}
                onChange={(e) => setS9Frequency(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="s9Duration">Session Duration (minutes)</Label>
              <Input
                id="s9Duration"
                type="number"
                min={1}
                value={s9Duration}
                onChange={(e) => setS9Duration(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
            <div>
              <Label htmlFor="s9Setting">Intervention Setting</Label>
              <Select value={s9Setting} onValueChange={(v) => setS9Setting(v as InterventionSetting)} disabled={isReadOnly}>
                <SelectTrigger id="s9Setting">
                  <SelectValue placeholder="Select setting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clinic">Clinic</SelectItem>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="school">School</SelectItem>
                  <SelectItem value="early_intervention">Early Intervention</SelectItem>
                  <SelectItem value="rehab">Rehab</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="s9ReviewPeriod">Review Period (weeks)</Label>
              <Input
                id="s9ReviewPeriod"
                type="number"
                min={1}
                value={s9ReviewPeriod}
                onChange={(e) => setS9ReviewPeriod(e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="s9HomeProgram">Home Program Recommendations</Label>
            <Textarea
              id="s9HomeProgram"
              value={s9HomeProgram}
              onChange={(e) => setS9HomeProgram(e.target.value)}
              placeholder="Recommended home activities and exercises..."
              rows={3}
              disabled={isReadOnly}
            />
          </div>

          <div>
            <Label htmlFor="s9Referrals">Referrals to Other Specialists</Label>
            <Textarea
              id="s9Referrals"
              value={s9Referrals}
              onChange={(e) => setS9Referrals(e.target.value)}
              placeholder="Any referrals to other professionals or specialists..."
              rows={2}
              disabled={isReadOnly}
            />
          </div>

          <Separator />

          <div>
            <Label>Short-Term Goals (4–6 weeks)</Label>
            <p className="text-xs text-muted-foreground mb-3">Enter up to 4 short-term goals</p>
            <div className="space-y-2">
              {s9ShortTermGoals.map((goal, i) => (
                <Input
                  key={shortTermGoalIds[i]}
                  value={goal}
                  onChange={(e) =>
                    setS9ShortTermGoals((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  placeholder={`Short-term goal ${i + 1}`}
                  disabled={isReadOnly}
                />
              ))}
            </div>
          </div>

          <div>
            <Label>Long-Term Goals (3–6 months)</Label>
            <p className="text-xs text-muted-foreground mb-3">Enter up to 4 long-term goals</p>
            <div className="space-y-2">
              {s9LongTermGoals.map((goal, i) => (
                <Input
                  key={longTermGoalIds[i]}
                  value={goal}
                  onChange={(e) =>
                    setS9LongTermGoals((prev) => {
                      const next = [...prev];
                      next[i] = e.target.value;
                      return next;
                    })
                  }
                  placeholder={`Long-term goal ${i + 1}`}
                  disabled={isReadOnly}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── Section 10: Signatures ─── */}
      {step === 10 && (
        <div className="space-y-6">
          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">Therapist Signature</h3>
            {assessment?.signaturesStatus?.therapist ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Therapist signature captured</span>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="s10TherapistName">Typed Name</Label>
                  <Input
                    id="s10TherapistName"
                    value={s10TherapistName}
                    onChange={(e) => setS10TherapistName(e.target.value)}
                    placeholder="Enter your full name"
                    disabled={isReadOnly}
                  />
                </div>
                <div>
                  <Label htmlFor="s10TherapistCreds">Credentials</Label>
                  <Input
                    id="s10TherapistCreds"
                    value={s10TherapistCredentials}
                    onChange={(e) => setS10TherapistCredentials(e.target.value)}
                    placeholder="BOT, MOT (Pediatrics)"
                    disabled={isReadOnly}
                  />
                </div>
                <Button
                  onClick={async () => {
                    if (!s10TherapistName.trim()) {
                      toast.error('Please enter your typed name');
                      return;
                    }
                    try {
                      await signMut.mutateAsync({
                        childId,
                        assessmentId,
                        data: {
                          signatoryType: 'therapist',
                          typedName: s10TherapistName,
                          credentials: s10TherapistCredentials || null,
                        },
                      });
                      toast.success('Therapist signature captured');
                    } catch {
                      toast.error('Failed to capture signature');
                    }
                  }}
                  disabled={isReadOnly || signMut.isPending}
                >
                  Sign as Therapist
                </Button>
              </>
            )}
          </div>

          <div className="rounded-lg border p-4 space-y-4">
            <h3 className="text-sm font-semibold">Guardian Acknowledgment</h3>
            {assessment?.signaturesStatus?.guardian ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="size-5" />
                <span className="text-sm font-medium">Guardian acknowledgment captured</span>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="s10GuardianName">Typed Name</Label>
                  <Input
                    id="s10GuardianName"
                    value={s10GuardianName}
                    onChange={(e) => setS10GuardianName(e.target.value)}
                    placeholder="Enter guardian's full name"
                    disabled={isReadOnly}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox
                    id="s10GuardianConsent"
                    checked={s10GuardianConsent}
                    onCheckedChange={(checked) => setS10GuardianConsent(!!checked)}
                    disabled={isReadOnly}
                  />
                  <Label htmlFor="s10GuardianConsent" className="cursor-pointer font-normal text-sm leading-snug">
                    Consent obtained for assessment and treatment
                  </Label>
                </div>
                <Button
                  onClick={async () => {
                    if (!s10GuardianName.trim()) {
                      toast.error('Please enter the guardian typed name');
                      return;
                    }
                    if (!s10GuardianConsent) {
                      toast.error('Please check the consent checkbox');
                      return;
                    }
                    try {
                      await signMut.mutateAsync({
                        childId,
                        assessmentId,
                        data: { signatoryType: 'guardian', typedName: s10GuardianName, consentCheckbox: true },
                      });
                      toast.success('Guardian acknowledgment captured');
                    } catch {
                      toast.error('Failed to capture acknowledgment');
                    }
                  }}
                  disabled={isReadOnly || signMut.isPending}
                >
                  Record Guardian Acknowledgment
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-2 pt-2">
        {step > 1 && (
          <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isSaving}>
            Back
          </Button>
        )}
        {step < STEPS.length && !isReadOnly && (
          <Button onClick={handleNext} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Next'}
          </Button>
        )}
        {step === STEPS.length && !isReadOnly && (
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
