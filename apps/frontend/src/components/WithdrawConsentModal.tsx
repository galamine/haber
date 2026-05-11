import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWithdrawConsent } from '@/hooks/useConsent';

interface Props {
  open: boolean;
  onClose: () => void;
  childId: string;
  consentId: string;
  guardianName: string;
  consentType: 'treatment' | 'data_processing';
}

const CONSENT_TYPE_LABEL: Record<Props['consentType'], string> = {
  treatment: 'Treatment Consent',
  data_processing: 'Data Processing Consent',
};

export function WithdrawConsentModal({ open, onClose, childId, consentId, guardianName, consentType }: Props) {
  const [reason, setReason] = useState('');
  const withdraw = useWithdrawConsent(childId);

  const handleConfirm = async () => {
    try {
      await withdraw.mutateAsync({ consentId, body: { reason } });
      toast.success('Consent withdrawn');
      setReason('');
      onClose();
    } catch {
      toast.error('Failed to withdraw consent');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setReason('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Withdraw consent for {guardianName}?</DialogTitle>
          <DialogDescription>
            This will withdraw <span className="font-medium text-foreground">{CONSENT_TYPE_LABEL[consentType]}</span>. This
            action cannot be undone without re-capturing consent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="withdraw-reason">
            Reason <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="withdraw-reason"
            placeholder="Provide a reason for withdrawing consent..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={withdraw.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={withdraw.isPending || !reason.trim()}>
            {withdraw.isPending ? 'Withdrawing...' : 'Confirm Withdrawal'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
