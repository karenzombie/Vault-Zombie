import { useState } from "react";
import { Link } from "wouter";
import { useCreateGiftCheckout, useGetBillingPrices, GiftCheckoutInputTargetTier } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

import { getTierLabel } from "@/lib/utils";

export default function GiftPurchasePage() {
  const [tier, setTier] = useState<GiftCheckoutInputTargetTier>(GiftCheckoutInputTargetTier.vault);
  const [fromLine, setFromLine] = useState("");
  const [toLine, setToLine] = useState("");
  const [gifterEmail, setGifterEmail] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientEmailError, setRecipientEmailError] = useState<string | null>(null);

  const { toast } = useToast();
  const createCheckout = useCreateGiftCheckout();
  const { data: billingPrices, isLoading: pricesLoading, isError: pricesError } = useGetBillingPrices();
  const giftTiers = billingPrices
    ?.filter((price) => price.fromTier === "lockbox")
    .map((price) => ({
      id: price.targetTier as GiftCheckoutInputTargetTier,
      name: getTierLabel(price.targetTier),
      price: new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: price.currency,
        maximumFractionDigits: 0,
      }).format(price.amountCents / 100),
    }));

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedRecipientEmail = recipientEmail.trim();
    if (trimmedRecipientEmail && !EMAIL_PATTERN.test(trimmedRecipientEmail)) {
      setRecipientEmailError("Enter a valid email address.");
      return;
    }
    setRecipientEmailError(null);
    createCheckout.mutate(
      {
        data: {
          targetTier: tier,
          fromLine: fromLine || undefined,
          toLine: toLine || undefined,
          gifterEmail: gifterEmail || undefined,
          recipientEmail: trimmedRecipientEmail || undefined,
        },
      },
      {
        onSuccess: (res) => {
          if (res.checkoutUrl) {
            window.location.href = res.checkoutUrl;
          }
        },
        onError: () => {
          toast({
            title: "Checkout Error",
            description: "Unable to create gift checkout.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 bg-ink text-primary-foreground border-b border-border sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-14 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-14 w-auto object-contain" />
        </Link>
        <div className="text-[11px] font-bold tracking-widest text-brass uppercase">
          Gift a Vault
        </div>
      </header>
      <main className="flex-1 w-full max-w-lg mx-auto p-6 flex flex-col pt-12">
        <h1 className="font-display text-4xl text-ink mb-2">Give the Gift of Vault Zombie</h1>
        <p className="text-text-2 mb-8">Purchase a pre-paid Vault creation code for a friend or event host.</p>
        
        <form onSubmit={handleSubmit} className="space-y-8 bg-card border border-border p-6 rounded-xl shadow-sm">
          <div className="space-y-4">
            <Label className="text-lg font-bold text-ink">Select Tier</Label>
            <div className="grid grid-cols-1 gap-3">
              {pricesLoading && <p className="text-sm text-text-2">Loading current prices...</p>}
              {pricesError && <p className="text-sm text-destructive">Current prices are unavailable. Checkout cannot be started.</p>}
              {giftTiers?.map((t) => (
                <label key={t.id} className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors ${tier === t.id ? 'border-vault-accent bg-bronze-wash/30' : 'border-border hover:bg-muted/50'}`}>
                  <div className="flex items-center gap-3">
                    <input 
                      type="radio" 
                      name="tier" 
                      value={t.id} 
                      checked={tier === t.id} 
                      onChange={() => setTier(t.id as GiftCheckoutInputTargetTier)} 
                      className="w-5 h-5 accent-vault-accent"
                    />
                    <span className="font-bold text-ink">{t.name}</span>
                  </div>
                  <span className="text-text-2 font-medium">{t.price}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-bold text-ink">Personalize (Optional)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="toLine">To</Label>
                <Input id="toLine" placeholder="Their name" value={toLine} onChange={(e) => setToLine(e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromLine">From</Label>
                <Input id="fromLine" placeholder="Your name" value={fromLine} onChange={(e) => setFromLine(e.target.value)} maxLength={80} />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="gifterEmail" className="text-lg font-bold text-ink">Your Receipt Email</Label>
            <Input id="gifterEmail" type="email" placeholder="email@example.com" value={gifterEmail} onChange={(e) => setGifterEmail(e.target.value)} />
            <p className="text-xs text-text-2">You'll get a receipt with the gift code, plus a printable gift card right after purchase.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipientEmail" className="text-lg font-bold text-ink">Their email (optional)</Label>
            <Input
              id="recipientEmail"
              type="email"
              placeholder="their@email.com"
              value={recipientEmail}
              onChange={(e) => { setRecipientEmail(e.target.value); if (recipientEmailError) setRecipientEmailError(null); }}
              aria-invalid={recipientEmailError ? true : undefined}
            />
            {recipientEmailError ? (
              <p className="text-xs text-destructive">{recipientEmailError}</p>
            ) : (
              <p className="text-xs text-text-2">Want us to send the code straight to them? We'll email it the moment your payment goes through.</p>
            )}
          </div>

          <Button type="submit" disabled={createCheckout.isPending || pricesLoading || pricesError || !giftTiers?.length} className="w-full py-6 text-lg font-bold bg-ink text-[hsl(var(--brass-lt))] hover:bg-ink-2">
            {createCheckout.isPending ? "Preparing Checkout..." : "Continue to Payment"}
          </Button>
        </form>
      </main>
    </div>
  );
}
