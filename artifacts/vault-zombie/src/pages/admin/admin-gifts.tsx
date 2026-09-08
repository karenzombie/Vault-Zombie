import { useState } from "react";
import { useListAdminGifts, useRefundGift, useResendAdminGift, getListAdminGiftsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Copy } from "lucide-react";
import { getTierLabel } from "@/lib/utils";

export function AdminGiftsTab() {
  const { data, isLoading } = useListAdminGifts();
  const [refundTarget, setRefundTarget] = useState<string | null>(null);
  const [resendTarget, setResendTarget] = useState<string | null>(null);
  const [resendReason, setResendReason] = useState("");
  const [resendRequestId, setResendRequestId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const resend = useResendAdminGift();

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading gifts...</div>;

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Gift code copied to clipboard." });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b">Code / ID</th>
                <th className="px-6 py-4 border-b">Tier</th>
                <th className="px-6 py-4 border-b">To / From</th>
                <th className="px-6 py-4 border-b">Status</th>
                <th className="px-6 py-4 border-b">Delivery</th>
                <th className="px-6 py-4 border-b text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data?.gifts?.map((gift) => (
                <tr key={gift.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-ink font-bold flex items-center gap-2">
                      {gift.code}
                      <button onClick={() => handleCopy(gift.code)} className="text-text-2 hover:text-ink"><Copy className="w-3 h-3" /></button>
                    </div>
                    <div className="text-text-2 text-xs font-mono mt-1">{gift.id.slice(0, 12)}...</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-ink uppercase text-xs tracking-wider">{getTierLabel(gift.targetTier)}</td>
                  <td className="px-6 py-4 text-ink text-xs">
                    <div>{gift.toLine ? `To: ${gift.toLine}` : 'No To'}</div>
                    <div className="text-text-2">{gift.fromLine ? `From: ${gift.fromLine}` : 'No From'}</div>
                   <div className="text-text-2">{gift.gifterEmail ?? "No gifter email"}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      gift.status === 'purchased' ? 'bg-pop-tint text-pop-dk' :
                      gift.status === 'redeemed' ? 'bg-ok-tint text-ok' :
                      gift.status === 'refunded' ? 'bg-muted text-text-2' :
                      'bg-bronze-wash text-bronze'
                    }`}>
                      {gift.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs">{gift.latestDeliveryStatus ?? "Not queued"}{gift.latestDeliveryError ? <div className="text-destructive max-w-48 truncate">{gift.latestDeliveryError}</div> : null}</td>
                  <td className="px-6 py-4 text-right">
                    {gift.gifterEmail && ["purchased", "redeemed"].includes(gift.status) && <Button data-testid={`gift-resend-${gift.id}`} variant="outline" size="sm" disabled={resend.isPending} onClick={() => {
                      setResendTarget(gift.id); setResendReason(""); setResendRequestId(crypto.randomUUID());
                    }}>Resend</Button>}
                    {gift.refundableNow && (
                      <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setRefundTarget(gift.id)}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {data?.gifts?.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-text-2">No gifts found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RefundGiftDialog giftId={refundTarget} onClose={() => setRefundTarget(null)} />
      <Dialog open={!!resendTarget} onOpenChange={(open) => { if (!open) { setResendTarget(null); setResendRequestId(null); setResendReason(""); } }}>
        <DialogContent><DialogHeader><DialogTitle>Resend Gift Delivery</DialogTitle><DialogDescription>Fresh MFA and a reason are required. The gift will be sent only to the original gifter email.</DialogDescription></DialogHeader>
          <form onSubmit={(event) => {
            event.preventDefault(); if (!resendTarget || !resendRequestId || !resendReason.trim()) return;
            resend.mutate({ giftId: resendTarget, data: { reason: resendReason.trim(), requestId: resendRequestId } }, {
              onSuccess: () => { toast({ title: "Gift delivery queued" }); queryClient.invalidateQueries({ queryKey: getListAdminGiftsQueryKey() }); setResendTarget(null); setResendRequestId(null); setResendReason(""); },
              onError: (err: any) => { toast({ title: err?.response?.status === 401 || err?.response?.status === 403 ? "Fresh MFA Required" : "Gift resend failed", description: err?.response?.status === 401 || err?.response?.status === 403 ? "Please re-authenticate your session to perform this sensitive action." : err?.response?.data?.error || "The delivery could not be queued.", variant: "destructive" }); },
            });
          }} className="space-y-4 pt-4"><Input value={resendReason} onChange={(event) => setResendReason(event.target.value)} placeholder="Reason for resend" required minLength={1} />
            <DialogFooter><Button type="button" variant="outline" onClick={() => { setResendTarget(null); setResendRequestId(null); }}>Cancel</Button><Button type="submit" disabled={!resendReason.trim() || resend.isPending}>{resend.isPending ? "Queuing..." : "Resend delivery"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RefundGiftDialog({ giftId, onClose }: { giftId: string | null, onClose: () => void }) {
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const refund = useRefundGift();

  const handleRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftId || !reason.trim()) return;

    refund.mutate(
      { giftId, data: { reason: reason.trim() } },
      {
        onSuccess: () => {
          toast({
            title: "Gift Refunded",
            description: "The gift code has been deactivated and refunded.",
          });
          queryClient.invalidateQueries({ queryKey: getListAdminGiftsQueryKey() });
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
    <Dialog open={!!giftId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2">
            <AlertCircle className="w-5 h-5" /> Refund Unredeemed Gift
          </DialogTitle>
          <DialogDescription>
            This action will immediately refund the entire payment amount. The gift code will become invalid and cannot be redeemed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleRefund} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-bold text-ink">Reason for refund (required)</label>
            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g. Buyer requested cancellation..."
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
