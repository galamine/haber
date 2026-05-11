import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useChildren } from '@/hooks/useChildren';

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

function DebouncedInput({
  value,
  onChange,
  ...props
}: { value: string; onChange: (value: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => onChange(localValue), 300);
    return () => clearTimeout(timer);
  }, [localValue, onChange]);

  return <Input {...props} value={localValue} onChange={(e) => setLocalValue(e.target.value)} />;
}

export function ChildListPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useChildren({ name: search || undefined, limit: 20 });

  if (isLoading) return <p className="text-muted-foreground">Loading children...</p>;
  if (error) return <p className="text-destructive">Failed to load children: {error.message}</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Children</h1>
        <Button asChild>
          <Link to="/children/new">New Child</Link>
        </Button>
      </div>

      <DebouncedInput placeholder="Search by name..." value={search} onChange={setSearch} />

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="px-4 py-3">Name</TableHead>
              <TableHead className="px-4 py-3">Age</TableHead>
              <TableHead className="px-4 py-3">OP Number</TableHead>
              <TableHead className="px-4 py-3">Assigned Therapists</TableHead>
              <TableHead className="px-4 py-3">Intake Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.results.map((child) => (
              <TableRow key={child.id}>
                <TableCell className="px-4 py-3">
                  <Link to={`/children/${child.id}`} className="font-medium hover:underline">
                    {child.fullName}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3">{computeAge(child.dob)}</TableCell>
                <TableCell className="px-4 py-3">{child.opNumber ?? '—'}</TableCell>
                <TableCell className="px-4 py-3">{child.assignedTherapistIds.length} therapist(s)</TableCell>
                <TableCell className="px-4 py-3">
                  {child.intakeComplete ? (
                    <Badge variant="default">Complete</Badge>
                  ) : (
                    <Badge variant="secondary">Incomplete</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {data && data.results.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No children found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {data && (
        <p className="text-sm text-muted-foreground">
          Page {data.page} of {data.totalPages} — {data.totalResults} total
        </p>
      )}
    </div>
  );
}
