import { useState } from "react";
import { useListAdminBilling, useRefundBillingRecord, getListAdminBillingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { getTierLabel } from "@/lib/utils";

export function AdminBillingTab() {
  const { data, isLoading } = useListAdminBilling();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading billing records...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b">ID / Vault</th>
                <th className="px-6 py-4 border-b">Tier</th>
                <th className="px-6 py-4 border-b">Amount</th>
                <th className="px-6 py-4 border-b">Source</th>
                <th className="px-6 py-4 border-b">Status</th>
                <th className="px-6 py-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data?.records?.map((record) => (
                <tr key={record.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-ink">{record.id.slice(0, 12)}...</div>
                    <div className="text-text-2 text-xs font-mono">{record.vaultId ? record.vaultId.slice(0,12) + "..." : "No Vault"}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-ink uppercase text-xs tracking-wider">{getTierLabel(record.targetTier)}</td>
                  <td className="px-6 py-4 text-ink">${(record.amountCents / 100).toFixed(2)}</td>
                  <td className="px-6 py-4 text-text-2 uppercase text-[10px] tracking-wider font-bold">{record.source}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      record.status === 'paid' ? 'bg-ok-tint text-ok' :
                      record.status === 'refunded' ? 'bg-muted text-text-2' :
                      record.status === 'disputed' ? 'bg-[#A24B3A]/20 text-[#A24B3A]' :
                      'bg-bronze-wash text-bronze'
                    }`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.status === 'paid' && record.source === 'stripe' && record.amountCents > 0 && (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRefundTarget(record.id)}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.records?.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-2">No billing records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefundDialog recordId={refundTarget} onClose={() => setRefundTarget(null)} />
    </div>
  );
}

function RefundDialog({ recordId, onClose }: { recordId: string | null, onClose: () => void }) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refund = useRefundBillingRecord();

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordId || !reason.trim()) return;

    refund.mutate(
      { billingRecordId: recordId, data: { reason: reason.trim() } },
      {
        onSuccess: (res) => {
          toast({
            title: "Refund Processed",
            description: `Vault downgraded to ${getTierLabel(res.currentTier)}.`,
          });
          queryClient.invalidateQueries({ queryKey: getListAdminBillingQueryKey() });
          setReason("");
          onClose();
        },
        onError: (err: any) => {
          const msg = err?.response?.data?.message || "Refund failed.";
          toast({
            title: "Refund Error",
            description: msg,
            variant: "destructive",
          });
          if (err?.response?.status === 401 || err?.response?.status === 403) {
             toast({
              title: "Fresh MFA Required",
              description: "Please re-authenticate your session to perform this sensitive action.",
              variant: "destructive"
             });
          }
        }
      }
    );
  };

  return (
    <Dialog open={!!recordId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Full Refund Confirmation
          </DialogTitle>
          <DialogDescription>
            This action will immediately refund the entire payment amount. If applied to a vault, it will be downgraded to Lockbox tier and newer submissions exceeding the cap will be archived.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRefund} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Reason for refund (required)</label>
            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g. Customer request via support..."
              required
              minLength={10}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={refund.isPending || reason.trim().length < 5}>
              {refund.isPending ? "Processing..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
