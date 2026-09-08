import { useState } from "react";
import { useGrantVaultComp, CompGrantInputTargetTier } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { getTierLabel } from "@/lib/utils";
import { useSensitiveAdminAction } from "@/hooks/use-sensitive-admin-action";

export function AdminCompTab() {
  const [vaultId, setVaultId] = useState("");
  const [tier, setTier] = useState<CompGrantInputTargetTier>(CompGrantInputTargetTier.vault);
  const [reason, setReason] = useState("");
  
  const { toast } = useToast();
  const grantComp = useGrantVaultComp();
  const runSensitive = useSensitiveAdminAction();

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vaultId.trim() || !reason.trim()) return;

    if (!confirm(`Are you sure you want to comp ${vaultId} to ${tier}?`)) return;

    try {
      await runSensitive(() => grantComp.mutateAsync(
        { vaultId: vaultId.trim(), data: { targetTier: tier, reason: reason.trim() } },
      ));
          toast({
            title: "Comp Granted",
            description: `Vault ${vaultId} upgraded to ${tier}.`,
          });
          setVaultId("");
          setReason("");
    } catch (err: any) {
          const msg = err?.response?.data?.message || "Failed to grant comp.";
          toast({
            title: "Error",
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
  };

  return (
    <div className="space-y-6">
      <div className="max-w-xl bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="font-display text-2xl text-ink mb-2">Grant Comp Access</h2>
        <p className="text-text-2 mb-6 text-sm">Directly upgrade a draft vault to a paid tier. Requires fresh MFA.</p>
        
        <form onSubmit={handleGrant} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="vaultId" className="font-bold text-ink">Vault ID</Label>
            <Input 
              id="vaultId" 
              placeholder="e.g. vlt_12345" 
              value={vaultId} 
              onChange={(e) => setVaultId(e.target.value)}
              className="font-mono"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="font-bold text-ink">Target Tier</Label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: CompGrantInputTargetTier.safe, name: getTierLabel(CompGrantInputTargetTier.safe) },
                { id: CompGrantInputTargetTier.vault, name: getTierLabel(CompGrantInputTargetTier.vault) },
                { id: CompGrantInputTargetTier.deep_vault, name: getTierLabel(CompGrantInputTargetTier.deep_vault) }
              ].map((t) => (
                <label key={t.id} className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors ${tier === t.id ? 'border-vault-accent bg-bronze-wash/30 font-bold text-ink' : 'border-border hover:bg-muted/50 text-text-2'}`}>
                  <input 
                    type="radio" 
                    name="tier" 
                    value={t.id} 
                    checked={tier === t.id} 
                    onChange={() => setTier(t.id as CompGrantInputTargetTier)} 
                    className="sr-only"
                  />
                  {t.name}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason" className="font-bold text-ink">Reason (Internal Only)</Label>
            <Input 
              id="reason" 
              placeholder="e.g. Host for local community event..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
            />
          </div>

          <Button 
            type="submit" 
            disabled={grantComp.isPending || vaultId.trim().length < 5 || reason.trim().length < 5} 
            className="w-full bg-ink text-parchment hover:bg-ink-2 mt-2"
          >
            {grantComp.isPending ? "Processing..." : "Grant Upgrade"}
          </Button>
        </form>
      </div>
    </div>
  );
}
