import { useStaffCapacity } from '@/hooks/useStaff';

export function CapacityWidget() {
  const { data: capacity, isLoading, error } = useStaffCapacity();

  if (isLoading) return <div className="text-muted-foreground">Loading capacity...</div>;
  if (error) return <div className="text-destructive">Failed to load capacity</div>;
  if (!capacity) return null;

  return (
    <div className="flex flex-wrap gap-4">
      {capacity.map((entry) => {
        const used = entry.active;
        const limit = entry.limit;
        const total = entry.total;
        const label = entry.role === 'therapist' ? 'Therapists' : 'Staff';
        const displayLimit = limit !== null ? `/${limit}` : '';

        return (
          <div key={entry.role} className="rounded-lg border bg-card px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{label}:</span>
              <span className="font-bold">
                {used}
                <span className="text-muted-foreground font-normal">{displayLimit}</span>
              </span>
              <span className="text-xs text-muted-foreground">({total} total)</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
