import { MoreHorizontal, Pencil } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';

export function SubscriptionPlanListPage() {
  const { data, isLoading, isError } = useSubscriptionPlans();

  if (isLoading) {
    return <p className="text-muted-foreground">Loading subscription plans...</p>;
  }

  if (isError) {
    return <p className="text-destructive">Failed to load subscription plans</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Subscription Plans</h1>
        <Button asChild>
          <Link to="/super-admin/subscription-plans/new">Add Subscription Plan</Link>
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Max Children</TableHead>
            <TableHead>Max Sensory Rooms</TableHead>
            <TableHead className="w-12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data?.results.map((plan) => (
            <TableRow key={plan.id}>
              <TableCell className="font-medium">{plan.name}</TableCell>
              <TableCell>
                <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium capitalize">
                  {plan.tier}
                </span>
              </TableCell>
              <TableCell>{plan.maxActiveChildren}</TableCell>
              <TableCell>{plan.maxSensoryRooms}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="size-8 p-0">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/super-admin/subscription-plans/${plan.id}/edit`}>
                        <Pencil className="mr-2 size-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data?.results.length === 0 && <p className="text-muted-foreground text-center py-8">No subscription plans found</p>}
    </div>
  );
}
