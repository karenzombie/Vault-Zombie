import { useState } from "react";
import { Link } from "wouter";
import { useGetOperatorVaultBillingStatus, useCreateVaultCheckout, useDeclineOperatorOverage, useGetOperatorOverageStatus, useGetBillingPrices, VaultCheckoutInputTargetTier } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetOperatorVaultBillingStatusQueryKey, getGetOperatorOverageStatusQueryKey } from "@workspace/api-client-react";
import { getTierLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard, Gift, ShieldAlert, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function OperatorOverageWarning({ vaultId }: { vaultId: string }) {
  const { data } = useGetOperatorOverageStatus(vaultId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const declineOverage = useDeclineOperatorOverage();
  const [isConfirming, setIsConfirming] = useState(false);

  if (!data?.unresolved || data.heldSubmissionCount === 0) return null;

  const isClose = data.nearestRevealDate && new Date(data.nearestRevealDate).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000;

  const handleDecline = () => {
    declineOverage.mutate(
      { vaultId },
      {
        onSuccess: (res) => {
          toast({
            title: "Overage Declined",
            description: `Archived ${res.archivedSubmissionCount} submissions.`,
          });
          queryClient.invalidateQueries({ queryKey: getGetOperatorOverageStatusQueryKey(vaultId) });
          setIsConfirming(false);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to decline overage.", variant: "destructive" });
          setIsConfirming(false);
        }
      }
    );
  };

  return (
    <div className={`mb-6 p-4 border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${isClose ? 'bg-[#A24B3A]/10 border-[#A24B3A]/30 text-[#A24B3A]' : 'bg-warn-tint border-warn/30 text-warn'}`}>
      <div className="flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Capacity Exceeded</h4>
          <p className="text-sm opacity-90 mt-1">
            {data.heldSubmissionCount} whole submissions are held. You must upgrade your vault to include them, or decline them.
            {isClose && " Action required immediately before the next reveal."}
          </p>
        </div>
      </div>
      
      {isConfirming ? (
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" size="sm" onClick={() => setIsConfirming(false)} className="flex-1 md:flex-none">Cancel</Button>
          <Button variant="destructive" size="sm" onClick={handleDecline} disabled={declineOverage.isPending} className="flex-1 md:flex-none">
            {declineOverage.isPending ? "Archiving..." : "Archive Excluded"}
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setIsConfirming(true)} className="w-full md:w-auto shrink-0 bg-white/50 border-current hover:bg-white hover:text-current">
          Decline & Archive
        </Button>
      )}
    </div>
  );
}

export function OperatorBillingPanel({ vaultId }: { vaultId: string }) {
  const { data: billing, isLoading } = useGetOperatorVaultBillingStatus(vaultId);
  const { data: billingPrices, isLoading: pricesLoading, isError: pricesError } = useGetBillingPrices();
  const createCheckout = useCreateVaultCheckout();
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<VaultCheckoutInputTargetTier | null>(null);

  if (isLoading) return <div className="animate-pulse p-6 text-center text-text-2">Loading billing status...</div>;
  if (!billing) return null;

  const currentTier = billing.currentTier;
  const availableUpgrades = billingPrices?.filter((price) => price.fromTier === currentTier);

  const handleUpgrade = (tier: VaultCheckoutInputTargetTier) => {
    createCheckout.mutate(
      { vaultId, data: { targetTier: tier } },
      {
        onSuccess: (res) => {
          if (res.checkoutUrl) window.location.href = res.checkoutUrl;
        },
        onError: () => {
          toast({ title: "Checkout Error", description: "Could not start upgrade.", variant: "destructive" });
        }
      }
    );
  };

  const getTierName = (t: string) => {
    if (t === 'lockbox') return "Lockbox (Free)";
    return getTierLabel(t);
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-display text-2xl text-ink mb-1">Billing & Access</h3>
        <p className="text-text-2 text-sm mb-6">Manage your vault capacity and features.</p>
        
        <div className="flex items-center justify-between p-4 bg-bronze-wash/30 border border-hairline rounded-lg mb-6">
          <div>
            <div className="text-xs font-bold text-text-2 uppercase tracking-widest mb-1">Current Tier</div>
            <div className="font-bold text-lg text-ink">{getTierName(currentTier)}</div>
          </div>
          <div className="text-right">
            {currentTier === 'lockbox' && <div className="text-xs font-bold text-warn uppercase">Limited Capacity</div>}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-bold text-ink">Upgrade Paths</h4>
          
          <div className="grid grid-cols-1 gap-3">
            {pricesLoading && <p className="text-sm text-text-2">Loading current prices...</p>}
            {pricesError && <p className="text-sm text-destructive">Current upgrade prices are unavailable.</p>}
            {availableUpgrades?.map((price) => (
              <UpgradeCard
                key={`${price.fromTier}-${price.targetTier}`}
                tier={price.targetTier as VaultCheckoutInputTargetTier}
                name={getTierLabel(price.targetTier)}
                amountCents={price.amountCents}
                currency={price.currency}
                onSelect={handleUpgrade}
                isPending={createCheckout.isPending && selectedTier === price.targetTier}
                setSelect={setSelectedTier}
              />
            ))}
            {currentTier === 'deep_vault' && (
              <div className="p-4 text-center text-text-2 text-sm italic">You are on the highest tier.</div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-3 mb-2">
          <Gift className="w-5 h-5 text-vault-accent" />
          <h3 className="font-display text-xl text-ink">Have a Gift Code?</h3>
        </div>
        <p className="text-text-2 text-sm mb-4">Apply a pre-paid gift card to upgrade this vault instantly.</p>
        <Link href={`/gifts/redeem?vaultId=${vaultId}`}>
          <Button variant="outline" className="w-full gap-2">Redeem a Gift <ArrowRight className="w-4 h-4" /></Button>
        </Link>
      </div>

      {billing.attempts.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h4 className="font-bold text-ink mb-4">Billing History</h4>
          <div className="space-y-3">
            {billing.attempts.map((att) => (
              <div key={att.id} className="flex items-center justify-between p-3 border-b border-hairline last:border-0 text-sm">
                <div>
                  <div className="font-medium text-ink">Upgrade to {getTierName(att.targetTier)}</div>
                  <div className="text-xs text-text-2">{new Date(att.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-ink">${(att.amountCents / 100).toFixed(2)}</div>
                  <div className={`text-xs font-bold uppercase ${att.status === 'paid' ? 'text-ok' : att.status === 'pending' ? 'text-vault-accent' : 'text-text-2'}`}>
                    {att.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UpgradeCard({ tier, name, amountCents, currency, onSelect, isPending, setSelect }: { tier: VaultCheckoutInputTargetTier, name: string, amountCents: number, currency: string, onSelect: (t: VaultCheckoutInputTargetTier) => void, isPending: boolean, setSelect: (t: VaultCheckoutInputTargetTier) => void }) {
  const displayPrice = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amountCents / 100);
  return (
    <div className="flex items-center justify-between p-4 border border-border rounded-lg hover:border-vault-accent transition-colors bg-white">
      <div>
        <div className="font-bold text-ink text-lg">{name}</div>
        <div className="text-text-2 text-sm">{displayPrice} one-time</div>
      </div>
      <Button 
        size="sm" 
        onClick={() => { setSelect(tier); onSelect(tier); }} 
        disabled={isPending}
        className="bg-ink text-primary-foreground hover:bg-ink-2"
      >
        {isPending ? "..." : "Upgrade"}
      </Button>
    </div>
  );
}
