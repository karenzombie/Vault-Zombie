import { useState } from "react";
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

  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const redeemGift = useRedeemGift();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    redeemGift.mutate(
      { data: { code: code.trim() } },
      {
        onSuccess: (res) => {
          setLocation(`/operator/vaults/new?billingRecordId=${encodeURIComponent(res.billingRecordId)}&tier=${res.tier}&banner=gift`);
        },
        onError: (err: any) => {
          toast({
            title: "Redemption Failed",
            description: err?.response?.data?.message || "Invalid, already redeemed, or refunded code.",
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
            Enter your gift code to unlock your vault.
          </p>
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

          <Button
            type="submit"
            disabled={redeemGift.isPending || !code.trim()}
            className="w-full py-6 text-lg font-bold bg-ink text-primary-foreground hover:bg-ink-2 mt-4"
          >
            {redeemGift.isPending ? "Redeeming..." : "Redeem Gift"}
          </Button>
        </form>
      </div>
    </div>
  );
}
