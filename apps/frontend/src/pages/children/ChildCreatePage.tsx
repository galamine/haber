import type { CreateGuardianDto, GuardianDto, UpsertMedicalHistoryDto } from '@haber/shared';
import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TagInput } from '@/components/ui/tag-input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useCreateChild, useCreateGuardian, useUpdateChild, useUpsertMedicalHistory } from '@/hooks/useChildren';

const STEPS = [
  { number: 1, label: 'Demographics' },
  { number: 2, label: 'Guardians' },
  { number: 3, label: 'Medical History' },
  { number: 4, label: 'Anthropometrics' },
];

interface MedicationRow {
  name: string;
  dose: string;
  frequency: string;
}

export function ChildCreatePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [childId, setChildId] = useState<string | null>(null);

  const createChild = useCreateChild();
  const upsertMedicalHistory = useUpsertMedicalHistory();
  const updateChild = useUpdateChild();
  const createGuardian = useCreateGuardian();

  const [demographics, setDemographics] = useState({
    fullName: '',
    dob: '',
    sex: '' as 'male' | 'female' | 'other' | '',
    spokenLanguages: [] as string[],
    school: '',
    opNumber: '',
  });

  const [guardianForm, setGuardianForm] = useState({
    fullName: '',
    relationship: '',
    phone: '',
    email: '',
  });

  const [guardians, setGuardians] = useState<GuardianDto[]>([]);

  const [medicalHistory, setMedicalHistory] = useState<UpsertMedicalHistoryDto>({
    birthTerm: 'term',
    gestationalAgeWeeks: undefined,
    birthComplications: '',
    neonatalHistory: '',
    immunizations: '',
    allergies: '',
    currentMedications: [],
    priorDiagnoses: [],
    familyHistory: '',
    sensorySensitivities: '',
  });

  const [medications, setMedications] = useState<MedicationRow[]>([]);

  const [anthropometrics, setAnthropometrics] = useState({
    heightCm: '' as string | number,
    weightKg: '' as string | number,
    measurementDate: '',
  });

  const handleStep1Next = async () => {
    const child = await createChild.mutateAsync({
      fullName: demographics.fullName,
      dob: new Date(demographics.dob).toISOString(),
      sex: demographics.sex as 'male' | 'female' | 'other',
      spokenLanguages: demographics.spokenLanguages,
      school: demographics.school || undefined,
      opNumber: demographics.opNumber || undefined,
    });
    setChildId(child.id);
    setStep(2);
  };

  const handleAddGuardian = async () => {
    if (!childId) return;
    const data: CreateGuardianDto = {
      fullName: guardianForm.fullName,
      relationship: guardianForm.relationship,
      phone: guardianForm.phone,
      email: guardianForm.email || undefined,
      loginEnabled: false,
    };
    const guardian = await createGuardian.mutateAsync({ childId, data });
    setGuardians([...guardians, guardian]);
    setGuardianForm({ fullName: '', relationship: '', phone: '', email: '' });
  };

  const handleStep3Next = async () => {
    if (!childId) return;
    await upsertMedicalHistory.mutateAsync({
      childId,
      data: {
        ...medicalHistory,
        currentMedications: medications.map((m) => ({
          name: m.name,
          dose: m.dose,
          frequency: m.frequency,
        })),
      },
    });
    setStep(4);
  };

  const handleFinish = async () => {
    if (!childId) return;
    await updateChild.mutateAsync({
      childId,
      data: {
        heightCm: Number(anthropometrics.heightCm),
        weightKg: Number(anthropometrics.weightKg),
        measurementDate: new Date(anthropometrics.measurementDate).toISOString(),
      },
    });
    navigate(`/children/${childId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New Child</h1>
        <Button variant="ghost" onClick={() => navigate('/children')}>
          Cancel
        </Button>
      </div>

      <div className="flex gap-2">
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

      {step === 1 && (
        <div className="space-y-6">
          <div className="flex justify-center">
            <Avatar className="size-24">
              <AvatarFallback className="text-lg">?</AvatarFallback>
            </Avatar>
          </div>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={demographics.fullName}
                onChange={(e) => setDemographics({ ...demographics, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="dob">Date of Birth *</Label>
              <Input
                id="dob"
                type="date"
                value={demographics.dob}
                onChange={(e) => setDemographics({ ...demographics, dob: e.target.value })}
              />
            </div>

            <div>
              <Label>Sex *</Label>
              <RadioGroup
                value={demographics.sex}
                onValueChange={(v) => setDemographics({ ...demographics, sex: v as typeof demographics.sex })}
                className="flex gap-4"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="male" id="male" />
                  <Label htmlFor="male">Male</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="female" id="female" />
                  <Label htmlFor="female">Female</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label>Spoken Languages</Label>
              <TagInput
                value={demographics.spokenLanguages}
                onChange={(v) => setDemographics({ ...demographics, spokenLanguages: v })}
                placeholder="Add language and press Enter..."
              />
            </div>

            <div>
              <Label htmlFor="school">School (optional)</Label>
              <Input
                id="school"
                value={demographics.school}
                onChange={(e) => setDemographics({ ...demographics, school: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="opNumber">OP Number (optional)</Label>
              <Input
                id="opNumber"
                value={demographics.opNumber}
                onChange={(e) => setDemographics({ ...demographics, opNumber: e.target.value })}
              />
            </div>
          </div>

          <Button
            onClick={handleStep1Next}
            disabled={!demographics.fullName || !demographics.dob || !demographics.sex || createChild.isPending}
          >
            {createChild.isPending ? 'Creating...' : 'Next'}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="guardianFullName">Full Name *</Label>
              <Input
                id="guardianFullName"
                value={guardianForm.fullName}
                onChange={(e) => setGuardianForm({ ...guardianForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="relationship">Relationship *</Label>
              <Input
                id="relationship"
                value={guardianForm.relationship}
                onChange={(e) => setGuardianForm({ ...guardianForm, relationship: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guardianPhone">Phone *</Label>
              <Input
                id="guardianPhone"
                value={guardianForm.phone}
                onChange={(e) => setGuardianForm({ ...guardianForm, phone: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="guardianEmail">Email (optional)</Label>
              <Input
                id="guardianEmail"
                type="email"
                value={guardianForm.email}
                onChange={(e) => setGuardianForm({ ...guardianForm, email: e.target.value })}
              />
            </div>
            <Button
              onClick={handleAddGuardian}
              disabled={
                !guardianForm.fullName || !guardianForm.relationship || !guardianForm.phone || createGuardian.isPending
              }
            >
              {createGuardian.isPending ? 'Adding...' : 'Add Guardian'}
            </Button>
          </div>

          {guardians.length > 0 && (
            <div className="space-y-2">
              <Label>Added Guardians</Label>
              {guardians.map((g: GuardianDto) => (
                <div key={g.id} className="rounded-md border p-3">
                  <p className="font-medium">{g.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {g.relationship} — {g.phone}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(1)}>
              Back
            </Button>
            {guardians.length === 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled>Next</Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>Add at least one guardian to continue</TooltipContent>
              </Tooltip>
            ) : (
              <Button onClick={() => setStep(3)}>Next</Button>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label>Birth Term *</Label>
              <Select
                value={medicalHistory.birthTerm}
                onValueChange={(v) => setMedicalHistory({ ...medicalHistory, birthTerm: v as 'term' | 'preterm' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="term">Term</SelectItem>
                  <SelectItem value="preterm">Preterm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="gestationalAge">Gestational Age (weeks, optional)</Label>
              <Input
                id="gestationalAge"
                type="number"
                value={medicalHistory.gestationalAgeWeeks ?? ''}
                onChange={(e) =>
                  setMedicalHistory({
                    ...medicalHistory,
                    gestationalAgeWeeks: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
              />
            </div>

            <div>
              <Label htmlFor="birthComplications">Birth Complications (optional)</Label>
              <Textarea
                id="birthComplications"
                value={medicalHistory.birthComplications ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, birthComplications: e.target.value || undefined })}
              />
            </div>

            <div>
              <Label htmlFor="neonatalHistory">Neonatal History (optional)</Label>
              <Textarea
                id="neonatalHistory"
                value={medicalHistory.neonatalHistory ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, neonatalHistory: e.target.value || undefined })}
              />
            </div>

            <div>
              <Label htmlFor="immunizations">Immunizations (optional)</Label>
              <Textarea
                id="immunizations"
                value={medicalHistory.immunizations ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, immunizations: e.target.value || undefined })}
              />
            </div>

            <div>
              <Label htmlFor="allergies">Allergies (optional)</Label>
              <Textarea
                id="allergies"
                value={medicalHistory.allergies ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, allergies: e.target.value || undefined })}
              />
            </div>

            <div>
              <Label>Current Medications</Label>
              {medications.map((med) => (
                <div key={med.id} className="mb-2 flex gap-2">
                  <Input
                    placeholder="Name"
                    value={med.name}
                    onChange={(e) => {
                      const updated = medications.map((m) => (m.id === med.id ? { ...m, name: e.target.value } : m));
                      setMedications(updated);
                    }}
                  />
                  <Input
                    placeholder="Dose"
                    value={med.dose}
                    onChange={(e) => {
                      const updated = medications.map((m) => (m.id === med.id ? { ...m, dose: e.target.value } : m));
                      setMedications(updated);
                    }}
                  />
                  <Input
                    placeholder="Frequency"
                    value={med.frequency}
                    onChange={(e) => {
                      const updated = medications.map((m) => (m.id === med.id ? { ...m, frequency: e.target.value } : m));
                      setMedications(updated);
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setMedications(medications.filter((m) => m.id !== med.id))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMedications([...medications, { name: '', dose: '', frequency: '' }])}
              >
                Add Medication
              </Button>
            </div>

            <div>
              <Label>Prior Diagnoses (optional)</Label>
              <TagInput
                value={medicalHistory.priorDiagnoses ?? []}
                onChange={(v) => setMedicalHistory({ ...medicalHistory, priorDiagnoses: v })}
                placeholder="Add diagnosis and press Enter..."
              />
            </div>

            <div>
              <Label htmlFor="familyHistory">Family History (optional)</Label>
              <Textarea
                id="familyHistory"
                value={medicalHistory.familyHistory ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, familyHistory: e.target.value || undefined })}
              />
            </div>

            <div>
              <Label htmlFor="sensorySensitivities">Sensory Sensitivities (optional)</Label>
              <Textarea
                id="sensorySensitivities"
                value={medicalHistory.sensorySensitivities ?? ''}
                onChange={(e) => setMedicalHistory({ ...medicalHistory, sensorySensitivities: e.target.value || undefined })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button onClick={handleStep3Next} disabled={upsertMedicalHistory.isPending}>
              {upsertMedicalHistory.isPending ? 'Saving...' : 'Next'}
            </Button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="heightCm">Height (cm)</Label>
              <Input
                id="heightCm"
                type="number"
                value={anthropometrics.heightCm}
                onChange={(e) => setAnthropometrics({ ...anthropometrics, heightCm: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="weightKg">Weight (kg)</Label>
              <Input
                id="weightKg"
                type="number"
                value={anthropometrics.weightKg}
                onChange={(e) => setAnthropometrics({ ...anthropometrics, weightKg: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="measurementDate">Measurement Date</Label>
              <Input
                id="measurementDate"
                type="date"
                value={anthropometrics.measurementDate}
                onChange={(e) => setAnthropometrics({ ...anthropometrics, measurementDate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={handleFinish} disabled={updateChild.isPending}>
              {updateChild.isPending ? 'Saving...' : 'Finish'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
