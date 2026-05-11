import type { TaxonomyType } from '@haber/shared/dtos';
import {
  CreateAssessmentToolDtoSchema,
  CreateDiagnosisDtoSchema,
  CreateEquipmentDtoSchema,
  CreateFunctionalConcernDtoSchema,
  CreateInterventionApproachDtoSchema,
  CreateMilestoneDtoSchema,
  CreateSensorySystemDtoSchema,
} from '@haber/shared/schemas';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import type { CreateTaxonomyDto, TaxonomyItemDto } from '@/api/taxonomies';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCreateTaxonomyEntry, useDeleteTaxonomyEntry, useTenantTaxonomy } from '@/hooks/useTaxonomies';

const TYPE_LABELS: Record<TaxonomyType, string> = {
  diagnoses: 'Diagnoses',
  milestones: 'Developmental Milestones',
  'sensory-systems': 'Sensory Systems',
  'functional-concerns': 'Functional Concerns',
  'assessment-tools': 'Assessment Tools',
  equipment: 'Equipment',
  'intervention-approaches': 'Intervention Approaches',
};

const TYPE_SCHEMA_MAP: Record<TaxonomyType, z.ZodType> = {
  diagnoses: CreateDiagnosisDtoSchema,
  milestones: CreateMilestoneDtoSchema,
  'sensory-systems': CreateSensorySystemDtoSchema,
  'functional-concerns': CreateFunctionalConcernDtoSchema,
  'assessment-tools': CreateAssessmentToolDtoSchema,
  equipment: CreateEquipmentDtoSchema,
  'intervention-approaches': CreateInterventionApproachDtoSchema,
};

type TaxonomySectionProps = {
  type: TaxonomyType;
};

function TaxonomySection({ type }: TaxonomySectionProps) {
  const [open, setOpen] = useState(false);
  const { data: entries = [], isLoading } = useTenantTaxonomy(type);
  const create = useCreateTaxonomyEntry(type);
  const remove = useDeleteTaxonomyEntry(type);

  const schema = TYPE_SCHEMA_MAP[type];
  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const handleSubmit = async (data: FormValues) => {
    try {
      await create.mutateAsync(data as CreateTaxonomyDto);
      toast.success('Entry added');
      setOpen(false);
      form.reset();
    } catch {
      toast.error('Failed to add entry');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast.success('Entry removed');
    } catch {
      toast.error('Failed to remove entry');
    }
  };

  const renderColumns = (entry: TaxonomyItemDto) => {
    switch (type) {
      case 'diagnoses':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { icdReference: string | null }).icdReference ?? '—'}
            </TableCell>
          </>
        );
      case 'milestones':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(() => {
                const e = entry as { ageBandMinMonths: number; ageBandMaxMonths: number };
                return `${e.ageBandMinMonths}–${e.ageBandMaxMonths} months`;
              })()}
            </TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { description: string }).description.slice(0, 50)}
              {(entry as { description: string }).description.length > 50 ? '…' : ''}
            </TableCell>
          </>
        );
      case 'sensory-systems':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { description: string }).description.slice(0, 50)}
              {(entry as { description: string }).description.length > 50 ? '…' : ''}
            </TableCell>
          </>
        );
      case 'functional-concerns':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { category: string | null }).category ?? '—'}
            </TableCell>
          </>
        );
      case 'assessment-tools':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { fullName: string | null }).fullName ?? '—'}
            </TableCell>
          </>
        );
      case 'equipment':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {(entry as { category: string | null }).category ?? '—'}
            </TableCell>
          </>
        );
      case 'intervention-approaches':
        return (
          <>
            <TableCell className="py-3 px-4 font-medium">{(entry as { name: string }).name}</TableCell>
            <TableCell className="py-3 px-4 text-muted-foreground">
              {((entry as { description: string | null }).description ?? '—').slice(0, 50)}
            </TableCell>
          </>
        );
      default:
        return null;
    }
  };

  const getColumnCount = () => {
    switch (type) {
      case 'diagnoses':
      case 'functional-concerns':
      case 'equipment':
      case 'assessment-tools':
        return 2;
      case 'milestones':
      case 'sensory-systems':
      case 'intervention-approaches':
        return 3;
      default:
        return 2;
    }
  };

  const renderFormFields = () => {
    switch (type) {
      case 'diagnoses':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Custom ASD variant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icdReference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ICD Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="F84.0" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'milestones':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Walks independently" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ageBandMinMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Age (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="ageBandMaxMonths"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Age (months)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="12"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value, 10))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Child walks without support..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'sensory-systems':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Visual processing" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Sensitivity to visual stimuli..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'functional-concerns':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Self-care tasks" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="ADL" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'assessment-tools':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="PDMS-2" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Peabody Developmental Motor Scales" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Assesses motor development..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'equipment':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Tactile brushes" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <FormControl>
                    <Input placeholder="Sensory" {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      case 'intervention-approaches':
        return (
          <>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Floortime" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Child-led play therapy..." {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {entries.length} custom {entries.length === 1 ? 'entry' : 'entries'}
        </span>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-4" /> Add
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              {type === 'diagnoses' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'diagnoses' && <TableHead className="px-4 py-3">ICD Reference</TableHead>}
              {type === 'milestones' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'milestones' && <TableHead className="px-4 py-3">Age Band</TableHead>}
              {type === 'milestones' && <TableHead className="px-4 py-3">Description</TableHead>}
              {type === 'sensory-systems' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'sensory-systems' && <TableHead className="px-4 py-3">Description</TableHead>}
              {type === 'functional-concerns' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'functional-concerns' && <TableHead className="px-4 py-3">Category</TableHead>}
              {type === 'assessment-tools' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'assessment-tools' && <TableHead className="px-4 py-3">Full Name</TableHead>}
              {type === 'equipment' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'equipment' && <TableHead className="px-4 py-3">Category</TableHead>}
              {type === 'intervention-approaches' && <TableHead className="px-4 py-3">Name</TableHead>}
              {type === 'intervention-approaches' && <TableHead className="px-4 py-3">Description</TableHead>}
              <TableHead className="px-4 py-3 w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                {renderColumns(entry)}
                <TableCell className="py-3 px-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && !isLoading && (
              <TableRow>
                <TableCell colSpan={getColumnCount() + 1} className="px-4 py-6 text-center text-muted-foreground">
                  No entries yet
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {TYPE_LABELS[type]}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {renderFormFields()}
              <Button type="submit" disabled={create.isPending} className="w-full">
                {create.isPending ? 'Adding…' : 'Add Entry'}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function ClinicExtensionsTab() {
  return (
    <Accordion type="multiple" className="w-full space-y-4">
      <AccordionItem value="diagnoses">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Diagnoses</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="diagnoses" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="milestones">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Developmental Milestones</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="milestones" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="sensory-systems">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Sensory Systems</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="sensory-systems" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="functional-concerns">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Functional Concerns</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="functional-concerns" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="assessment-tools">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Assessment Tools</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="assessment-tools" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="equipment">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Equipment</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="equipment" />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="intervention-approaches">
        <AccordionTrigger>
          <div className="flex items-center gap-2">
            <span>Intervention Approaches</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <TaxonomySection type="intervention-approaches" />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
