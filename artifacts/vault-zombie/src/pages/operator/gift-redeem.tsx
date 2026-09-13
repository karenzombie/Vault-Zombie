import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@clerk/react";
import { getGetGiftCardQueryKey, useGetGiftCard, useRedeemGift } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

// A pending code, entered before the visitor has an account, is kept here so it
// survives navigation to sign-in/sign-up, email verification, and Google SSO.
const PENDING_CODE_KEY = "vaultzombie:pendingGiftCode";

export function getPendingGiftCode(): string | null {
  try { return window.localStorage.getItem(PENDING_CODE_KEY); } catch { return null; }
}
function setPendingGiftCode(code: string) {
  try { window.localStorage.setItem(PENDING_CODE_KEY, code); } catch { /* ignore */ }
}
export function clearPendingGiftCode() {
  try { window.localStorage.removeItem(PENDING_CODE_KEY); } catch { /* ignore */ }
}

/**
 * Gift redemption (Flow1 Build Stage 2.5, reordered). Correct order: enter the
 * code with no account required, then sign in or sign up, then land directly on
 * the vault details form for the gifted tier. The code is validated against the
 * public gift-card lookup before asking for authentication, then persisted in
 * localStorage so it survives the round trip through sign-up/sign-in
 * (including email verification and Google SSO), which redirect back here via
 * redirect_url once complete.
 */
export default function GiftRedeemPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);

  const [code, setCode] = useState(params.get("code") || "");
  const [validatedCode, setValidatedCode] = useState<string | null>(null);

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isLoaded: authLoaded, isSignedIn } = useAuth();

  const giftCard = useGetGiftCard(validatedCode ?? "", { query: { enabled: !!validatedCode, retry: false, queryKey: getGetGiftCardQueryKey(validatedCode ?? "") } });
  const redeemGift = useRedeemGift();

  function runRedemption(giftCode: string) {
    redeemGift.mutate(
      { data: { code: giftCode } },
      {
        onSuccess: (res) => {
          clearPendingGiftCode();
          setLocation(`/operator/vaults/new?billingRecordId=${encodeURIComponent(res.billingRecordId)}&tier=${res.tier}&banner=gift`);
        },
        onError: (err: any) => {
          toast({
            title: "Redemption Failed",
            description: err?.message || "Invalid, already redeemed, or refunded code.",
            variant: "destructive",
          });
        },
      },
    );
  }

  // Once signed in, a pending code (just validated in this tab, or carried over
  // from localStorage through sign-up/sign-in) is redeemed automatically.
  useEffect(() => {
    if (!authLoaded || !isSignedIn || redeemGift.isPending || redeemGift.isSuccess) return;
    const pending = validatedCode || getPendingGiftCode();
    if (pending) runRedemption(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoaded, isSignedIn, validatedCode]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setPendingGiftCode(trimmed);
    setValidatedCode(trimmed);
  }

  const pendingCode = validatedCode || getPendingGiftCode();
  const showAuthStep = authLoaded && !isSignedIn && pendingCode && giftCard.isSuccess;

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
            {showAuthStep ? "Sign in or sign up to finish setting up your vault." : "Enter your gift code to unlock your vault."}
          </p>
        </div>

        {!showAuthStep && (
          <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="space-y-2">
              <Label htmlFor="code" className="font-bold text-ink">Gift Code</Label>
              <Input
                id="code"
                placeholder="e.g. VZ-ABCD-1234"
                value={code}
                onChange={(e) => { setCode(e.target.value); setValidatedCode(null); }}
                className="text-lg py-6 font-mono uppercase"
                required
              />
              {giftCard.isError && (
                <p role="alert" className="text-sm text-destructive">Invalid, already redeemed, or refunded code.</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={giftCard.isLoading || redeemGift.isPending || !code.trim()}
              className="w-full py-6 text-lg font-bold bg-ink text-primary-foreground hover:bg-ink-2 mt-4"
            >
              {giftCard.isLoading || redeemGift.isPending ? "Checking…" : "Redeem Gift"}
            </Button>
          </form>
        )}

        {showAuthStep && (
          <div className="space-y-3 bg-card border border-border p-6 rounded-xl shadow-sm">
            <p className="text-center text-ink font-medium">Your {giftCard.data?.tierName} vault is waiting. Sign in or create a free account to claim it.</p>
            <Link href={`/sign-up?redirect_url=${encodeURIComponent("/gifts/redeem")}`}>
              <Button className="w-full py-6 text-lg font-bold bg-ink text-primary-foreground hover:bg-ink-2">Sign up</Button>
            </Link>
            <Link href={`/sign-in?redirect_url=${encodeURIComponent("/gifts/redeem")}`}>
              <Button variant="outline" className="w-full py-6 text-lg font-bold">Sign in</Button>
            </Link>
          </div>
        )}

        {authLoaded && isSignedIn && (redeemGift.isPending || pendingCode) && !redeemGift.isError && (
          <p className="text-center text-text-2">Finishing your redemption…</p>
        )}
      </div>
    </div>
  );
}
