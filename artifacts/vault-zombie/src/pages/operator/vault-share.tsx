import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SiteHeader } from "@/components/site-header";
import { useGetVaultSetupDetail } from "@workspace/api-client-react";

/**
 * Builds the guest-facing link for a vault from its raw guest token. Built
 * client-side rather than via the server's guestLinkUrl() helper, since that
 * helper depends on a server-only env var the Vite frontend cannot read; the
 * app's own base path and origin are enough (Flow1 Build Stage 5, 5.1).
 */
export function buildGuestLink(guestToken: string) {
  return `${window.location.origin}${import.meta.env.BASE_URL}g/${guestToken}`;
}

/**
 * The guest link, its QR code, and the two printable card designs (5.1, 5.2).
 * Shared between the dedicated /share screen and the post-seal confirmation
 * shown at the end of setup, so the QR generation and print wiring live in
 * one place.
 */
export function ShareLinkPanel({ vaultName, guestToken }: { vaultName: string; guestToken: string }) {
  const { toast } = useToast();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [printTarget, setPrintTarget] = useState<"table" | "sign" | null>(null);
  const link = buildGuestLink(guestToken);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(link, { width: 512, margin: 1 }).then((url) => {
      if (!cancelled) setQrDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [link]);

  useEffect(() => {
    if (!printTarget) return;
    const timer = setTimeout(() => window.print(), 50);
    const reset = () => setPrintTarget(null);
    window.addEventListener("afterprint", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("afterprint", reset);
    };
  }, [printTarget]);

  function copyLink() {
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Guest link copied to clipboard." });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-hairline bg-white p-6 space-y-4">
        <div>
          <div className="text-xs font-bold text-text-2 uppercase tracking-wide mb-2">Guest link</div>
          <div className="flex items-center gap-2 flex-wrap">
            <code className="text-sm text-ink bg-parchment border border-hairline rounded px-3 py-2 break-all flex-1 min-w-0" data-testid="text-guest-link">
              {link}
            </code>
            <Button type="button" variant="outline" className="gap-2 border-border shrink-0" onClick={copyLink} data-testid="button-copy-guest-link">
              <Copy className="w-4 h-4" /> Copy
            </Button>
          </div>
        </div>
        {qrDataUrl && (
          <div className="flex justify-center py-2">
            <img src={qrDataUrl} alt="QR code for the guest link" className="w-40 h-40" data-testid="img-guest-qr" />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-border"
          onClick={() => setPrintTarget("table")}
          disabled={!qrDataUrl}
          data-testid="button-print-table-cards"
        >
          <Printer className="w-4 h-4" /> Print table cards
        </Button>
        <Button
          type="button"
          variant="outline"
          className="gap-2 border-border"
          onClick={() => setPrintTarget("sign")}
          disabled={!qrDataUrl}
          data-testid="button-print-sign"
        >
          <Printer className="w-4 h-4" /> Print sign
        </Button>
      </div>

      {printTarget === "table" && qrDataUrl && <TableCards vaultName={vaultName} qrDataUrl={qrDataUrl} />}
      {printTarget === "sign" && qrDataUrl && <SignCard vaultName={vaultName} qrDataUrl={qrDataUrl} />}
    </div>
  );
}

function CardCopy({ vaultName }: { vaultName: string }) {
  return (
    <>
      <div className="font-display text-lg text-ink leading-snug">{vaultName}</div>
      <div className="text-sm font-bold text-ink">Scan to seal your prediction</div>
      <div className="text-xs text-text-2">Your answers stay sealed until they unlock, years from now.</div>
    </>
  );
}

function LogoPair() {
  return (
    <div className="flex items-center justify-center gap-1.5">
      <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-6 w-auto" />
      <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="Vault Zombie" className="h-6 w-auto" />
    </div>
  );
}

/** 5.2 design 1: small, several per page, for scattering across tables. */
function TableCards({ vaultName, qrDataUrl }: { vaultName: string; qrDataUrl: string }) {
  return (
    <div id="printable-table-cards" className="hidden print:grid">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="table-card flex flex-col items-center gap-2 p-4 text-center">
          <LogoPair />
          <img src={qrDataUrl} alt="QR code for the guest link" className="w-24 h-24" />
          <CardCopy vaultName={vaultName} />
        </div>
      ))}
    </div>
  );
}

/** 5.2 design 2: one per page, QR large enough to scan from a step or two back. */
function SignCard({ vaultName, qrDataUrl }: { vaultName: string; qrDataUrl: string }) {
  return (
    <div id="printable-sign" className="hidden print:flex flex-col items-center gap-6 text-center p-12">
      <LogoPair />
      <img src={qrDataUrl} alt="QR code for the guest link" className="w-[80mm] h-[80mm]" />
      <div className="space-y-2 max-w-sm">
        <CardCopy vaultName={vaultName} />
      </div>
    </div>
  );
}

export default function VaultSharePage({ vaultId }: { vaultId: string }) {
  const { data: detail, isLoading, error } = useGetVaultSetupDetail(vaultId);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-lg mx-auto p-3 sm:p-4">
        <h1 className="font-display text-2xl text-ink mb-6">Share with your guests</h1>

        {isLoading && <p className="text-sm text-text-2">Loading…</p>}
        {error && <p className="text-sm text-destructive">We could not load this vault.</p>}

        {detail && (
          <div className="space-y-6">
            {detail.status === "draft" && (
              <div className="rounded-xl border border-hairline bg-bronze-wash p-4 text-sm text-ink" data-testid="notice-not-sealed">
                Your vault isn't sealed yet, so this link won't accept answers. Seal it when you're ready.
              </div>
            )}
            <ShareLinkPanel vaultName={detail.name} guestToken={detail.guestToken} />
          </div>
        )}
      </main>
    </div>
  );
}
