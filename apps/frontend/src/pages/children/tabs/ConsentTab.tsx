import type { ConsentRecordDto, ConsentStatusDto } from '@haber/shared';
import { format } from 'date-fns';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { WithdrawConsentModal } from '@/components/WithdrawConsentModal';

const CONSENT_TYPE_LABEL: Record<string, string> = {
  treatment: 'Treatment',
  data_processing: 'Data Processing',
};

interface WithdrawTarget {
  consentId: string;
  guardianName: string;
  consentType: 'treatment' | 'data_processing';
}

interface Props {
  childId: string;
  records: ConsentRecordDto[] | undefined;
  status: ConsentStatusDto | undefined;
  isLoading: boolean;
}

export function ConsentTab({ childId, records, status, isLoading }: Props) {
  const [withdrawTarget, setWithdrawTarget] = useState<WithdrawTarget | null>(null);

  const guardianNameMap = Object.fromEntries((status?.guardians ?? []).map((g) => [g.guardianId, g.guardianName]));

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-3/4" />
      </div>
    );
  }

  if (!records || records.length === 0) {
    return <p className="text-sm text-muted-foreground">No consent records found.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Guardian</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Signed At</TableHead>
            <TableHead>Withdrawn At</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="font-medium">
                {guardianNameMap[record.guardianId] ?? record.guardianId.slice(0, 8)}
              </TableCell>
              <TableCell>{CONSENT_TYPE_LABEL[record.type] ?? record.type}</TableCell>
              <TableCell>
                {record.status === 'active' ? (
                  <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">Withdrawn</Badge>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(record.checkedAt), 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {record.withdrawnAt ? format(new Date(record.withdrawnAt), 'dd MMM yyyy') : '—'}
              </TableCell>
              <TableCell>
                {record.status === 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() =>
                      setWithdrawTarget({
                        consentId: record.id,
                        guardianName: guardianNameMap[record.guardianId] ?? 'Guardian',
                        consentType: record.type,
                      })
                    }
                  >
                    Withdraw
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {withdrawTarget && (
        <WithdrawConsentModal
          open={!!withdrawTarget}
          onClose={() => setWithdrawTarget(null)}
          childId={childId}
          consentId={withdrawTarget.consentId}
          guardianName={withdrawTarget.guardianName}
          consentType={withdrawTarget.consentType}
        />
      )}
    </>
  );
}
