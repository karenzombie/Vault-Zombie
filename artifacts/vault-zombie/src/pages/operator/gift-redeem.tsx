import { useState, useEffect } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useRedeemGift } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function GiftRedeemPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  
  const [code, setCode] = useState(params.get("code") || "");
  const [vaultId, setVaultId] = useState(params.get("vaultId") || "");
  
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const redeemGift = useRedeemGift();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !vaultId.trim()) return;

    redeemGift.mutate(
      {
        data: {
          code: code.trim(),
          vaultId: vaultId.trim(),
        }
      },
      {
        onSuccess: (res) => {
          toast({
            title: "Gift Redeemed!",
            description: `Successfully applied ${res.tier} tier to vault ${res.vaultId}.`,
          });
          setLocation(`/operator?vaultId=${res.vaultId}`);
        },
        onError: (err: any) => {
          toast({
            title: "Redemption Failed",
            description: err?.response?.data?.message || "Invalid code or vault ID.",
            variant: "destructive",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 left-4">
        <Link href="/operator">
          <Button variant="ghost" size="sm">← Back to Host</Button>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="Vault Zombie" className="h-16 w-auto mx-auto mb-6" />
          <h1 className="font-display text-4xl text-ink">Redeem a Gift</h1>
          <p className="text-text-2 mt-3 text-lg leading-relaxed">
            Apply a pre-paid gift code to one of your draft vaults.
          </p>
        </div>

        <div className="bg-bronze-wash/20 border border-border rounded-xl p-5 text-sm text-text-2 mb-6">
          <strong>Note:</strong> You must create a normal draft vault first. Once you have your Vault ID, you can apply the gift code here to upgrade it.
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-2">
            <Label htmlFor="code" className="font-bold text-ink">Gift Code</Label>
            <Input 
              id="code" 
              placeholder="e.g. VZ-ABCD-1234" 
              value={code} 
              onChange={(e) => setCode(e.target.value)}
              className="text-lg py-6 font-mono uppercase"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vaultId" className="font-bold text-ink">Vault ID</Label>
            <Input 
              id="vaultId" 
              placeholder="e.g. vlt_xyz123" 
              value={vaultId} 
              onChange={(e) => setVaultId(e.target.value)}
              className="text-lg py-6 font-mono"
              required
            />
          </div>

          <Button 
            type="submit" 
            disabled={redeemGift.isPending || !code.trim() || !vaultId.trim()} 
            className="w-full py-6 text-lg font-bold bg-ink text-parchment hover:bg-ink-2 mt-4"
          >
            {redeemGift.isPending ? "Redeeming..." : "Apply Gift to Vault"}
          </Button>
        </form>
      </div>
    </div>
  );
}
