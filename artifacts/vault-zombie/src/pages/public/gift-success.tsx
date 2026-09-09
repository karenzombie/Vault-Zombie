import { useLocation, useSearch } from "wouter";
import { useGetGiftCardByCheckoutSession, getGetGiftCardByCheckoutSessionQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Copy, Printer, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import { getTierLabel } from "@/lib/utils";

export default function GiftSuccessPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const sessionId = params.get("session_id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading, error } = useGetGiftCardByCheckoutSession(sessionId || "", {
    query: {
      queryKey: getGetGiftCardByCheckoutSessionQueryKey(sessionId || ""),
      enabled: !!sessionId,
      retry: true,
      refetchInterval: (query) => (query.state.data ? false : 2000),
      refetchIntervalInBackground: true,
    }
  });

  if (!sessionId) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background text-ink p-6">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-display text-2xl">Missing Session</h1>
          <p className="text-text-2">No checkout session provided.</p>
          <Button onClick={() => setLocation("/")} variant="outline">Return Home</Button>
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background text-ink p-6">
        <div className="text-center max-w-md space-y-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-bronze-wash border-t-vault-accent rounded-full animate-spin mx-auto" />
          <h1 className="font-display text-2xl">Securing Your Gift</h1>
          <p className="text-text-2">Waiting for payment confirmation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[100dvh] grid place-items-center bg-background text-ink p-6">
        <div className="text-center max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
          <h1 className="font-display text-2xl">Error Loading Gift Card</h1>
          <p className="text-text-2">We could not retrieve your gift card. It might still be processing, or the session is invalid.</p>
          <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
        </div>
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(data.code);
    toast({ title: "Copied!", description: "Gift code copied to clipboard." });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(data.redemptionUrl);
    toast({ title: "Copied!", description: "Redemption link copied to clipboard." });
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-2xl print-hidden mb-8 space-y-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-ok mx-auto" />
        <h1 className="font-display text-4xl text-ink">Gift Secured</h1>
        <p className="text-lg text-text-2">Your payment is complete. You can print this card or copy the details to send to the recipient.</p>
        
        <div className="flex flex-wrap justify-center gap-4">
          <Button onClick={() => window.print()} className="bg-ink text-primary-foreground hover:bg-ink-2 gap-2">
            <Printer className="w-4 h-4" /> Print Card
          </Button>
          <Button onClick={copyCode} variant="outline" className="gap-2 border-border">
            <Copy className="w-4 h-4" /> Copy Code
          </Button>
          <Button onClick={copyUrl} variant="outline" className="gap-2 border-border">
            <Copy className="w-4 h-4" /> Copy Link
          </Button>
          <Button onClick={() => setLocation("/")} variant="ghost" className="gap-2">
            Return Home
          </Button>
        </div>
      </div>

      {/* Printable Card Area */}
      <div id="printable-gift-card" className="w-full max-w-[600px] bg-white border-2 border-hairline p-10 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-vault-accent" />
        
        <div className="flex justify-between items-start mb-12">
          {data.logo && (
            data.logo.startsWith('http') || data.logo.startsWith('/') ? (
              <img src={data.logo} alt="Vault Zombie" className="h-10 w-auto" />
            ) : (
              <div className="font-display text-2xl text-ink leading-none">{data.logo}</div>
            )
          )}
          <div className="text-right">
            <div className="font-bold text-vault-accent uppercase tracking-widest text-sm mb-1">
              {getTierLabel(data.tierName)}
            </div>
            <div className="text-text-2 text-xs font-medium">Pre-Paid Vault</div>
          </div>
        </div>

        <div className="space-y-6 mb-12">
          <h2 className="font-display text-3xl text-ink leading-tight">{data.line}</h2>
          
          {(data.toLine || data.fromLine) && (
            <div className="text-lg text-text-2 font-medium">
              {data.toLine && <div>To: <span className="text-ink font-bold">{data.toLine}</span></div>}
              {data.fromLine && <div>From: <span className="text-ink font-bold">{data.fromLine}</span></div>}
            </div>
          )}
        </div>

        <div className="bg-bronze-wash/30 border border-hairline p-6 rounded-lg mb-8 text-center space-y-4">
          <div className="text-sm font-bold text-text-2 uppercase tracking-wide">Redemption Code</div>
          <div className="font-mono text-4xl text-ink font-bold tracking-wider">{data.code}</div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-text-2 text-sm max-w-md mx-auto">{data.description}</p>
          <div className="text-sm font-bold text-ink">
            Redeem at: <span className="underline decoration-hairline underline-offset-4">{data.redemptionUrl}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
