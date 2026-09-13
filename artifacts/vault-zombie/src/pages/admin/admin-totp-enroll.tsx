import { useEffect, useState } from "react";
import { useUser } from "@clerk/react";
import { useLocation } from "wouter";
import QRCode from "qrcode";

type Stage = "loading" | "scan" | "verifying" | "backup-codes" | "error";

/**
 * Shown to a signed-in admin whose Clerk user has no authenticator app
 * enrolled yet (requireAdmin would otherwise return 403 ADMIN_TOTP_REQUIRED
 * with no way to resolve it). Enrolls TOTP through Clerk's own frontend API,
 * then shows Clerk's backup codes once. SMS is never offered here: backup
 * codes are the only recovery factor presented.
 */
export default function AdminTotpEnrollPage() {
  const { user } = useUser();
  const [, setLocation] = useLocation();
  const [stage, setStage] = useState<Stage>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    (async () => {
      try {
        const totp = await user.createTOTP();
        if (cancelled) return;
        if (!totp.uri) throw new Error("Clerk did not return a TOTP setup link.");
        setSecret(totp.secret ?? null);
        const dataUrl = await QRCode.toDataURL(totp.uri, { width: 320, margin: 1 });
        if (cancelled) return;
        setQrDataUrl(dataUrl);
        setStage("scan");
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not start authenticator setup.");
        setStage("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function submitCode() {
    if (!user || !code.trim()) return;
    setStage("verifying");
    setError(null);
    try {
      await user.verifyTOTP({ code: code.trim() });
      const backupCodeResource = await user.createBackupCode();
      setBackupCodes(backupCodeResource.codes ?? []);
      setStage("backup-codes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That code did not verify. Try again.");
      setStage("scan");
    }
  }

  if (stage === "loading") {
    return <Shell><p className="text-text-2">Preparing authenticator setup…</p></Shell>;
  }

  if (stage === "error") {
    return (
      <Shell>
        <p className="text-destructive">{error}</p>
      </Shell>
    );
  }

  if (stage === "backup-codes") {
    return (
      <Shell>
        <h1 className="font-display text-2xl text-ink mb-2">Save your backup codes</h1>
        <p className="text-text-2 mb-4">Each code can be used once if you lose access to your authenticator app. Save them somewhere safe now. Clerk shows them only this one time.</p>
        <div className="bg-parchment border border-hairline rounded-xl p-4 grid grid-cols-2 gap-2 font-mono text-sm text-ink mb-6">
          {backupCodes.map((backupCode) => (
            <div key={backupCode}>{backupCode}</div>
          ))}
        </div>
        <button
          className="bg-ink text-brass-lt font-semibold px-5 py-3 rounded-lg hover:bg-ink-2 w-full"
          onClick={() => setLocation("/admin")}
        >
          I saved my backup codes, continue
        </button>
      </Shell>
    );
  }

  return (
    <Shell>
      <h1 className="font-display text-2xl text-ink mb-2">Set up your authenticator app</h1>
      <p className="text-text-2 mb-4">Scan this code with an authenticator app such as Google Authenticator or 1Password, then enter the six digit code it shows.</p>
      {qrDataUrl && <img src={qrDataUrl} alt="Authenticator QR code" className="mx-auto mb-4 border border-hairline rounded-lg" />}
      {secret && (
        <p className="text-xs text-gray text-center mb-4 break-all">Can't scan it? Enter this key manually: {secret}</p>
      )}
      {error && <p className="text-destructive text-sm mb-3">{error}</p>}
      <input
        type="text"
        inputMode="numeric"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        placeholder="6-digit code"
        className="w-full border border-hairline rounded-lg px-4 py-3 text-center text-lg tracking-widest mb-4 bg-white text-ink"
      />
      <button
        className="bg-ink text-brass-lt font-semibold px-5 py-3 rounded-lg hover:bg-ink-2 w-full disabled:opacity-50"
        disabled={stage === "verifying" || code.trim().length === 0}
        onClick={submitCode}
      >
        {stage === "verifying" ? "Verifying…" : "Verify and continue"}
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-ink">
      <header className="w-full flex items-center justify-center gap-2 pt-10 pb-4">
        <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-12 w-auto" />
        <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-12 w-auto" />
      </header>
      <main className="flex-1 w-full flex items-start justify-center p-4">
        <div className="w-full max-w-md bg-white border border-hairline rounded-xl p-6 text-center">
          {children}
        </div>
      </main>
    </div>
  );
}
