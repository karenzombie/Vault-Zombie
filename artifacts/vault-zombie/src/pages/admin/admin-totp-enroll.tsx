import { useEffect, useRef, useState } from "react";
import { useReverification, useUser } from "@clerk/react";
import { isClerkAPIResponseError, isReverificationCancelledError } from "@clerk/react/errors";
import { useQueryClient } from "@tanstack/react-query";
import { getGetAdminDashboardQueryKey } from "@workspace/api-client-react";
import QRCode from "qrcode";

type Stage = "loading" | "scan" | "verifying" | "backup-codes" | "error";

/**
 * Turns any error thrown by Clerk's frontend API into a readable string.
 * Clerk's rate-limit (429) responses carry no message string, so a plain
 * `err.message` fallback renders as an empty string with nothing to read.
 * This always returns non-empty text, including the HTTP status when one
 * is available, so the error stage never renders blank.
 */
function describeSetupError(err: unknown): string {
  if (isClerkAPIResponseError(err)) {
    const detail = err.errors?.[0]?.longMessage || err.errors?.[0]?.message;
    if (detail) {
      return err.status ? `${detail} (HTTP ${err.status})` : detail;
    }
    return err.status
      ? `Authenticator setup failed with HTTP ${err.status}. Please try again.`
      : "Authenticator setup failed. Please try again.";
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return "Could not start authenticator setup. Please try again.";
}

/**
 * Shown to a signed-in admin whose Clerk user has no authenticator app
 * enrolled yet (requireAdmin would otherwise return 403 ADMIN_TOTP_REQUIRED
 * with no way to resolve it). Enrolls TOTP through Clerk's own frontend API,
 * then shows Clerk's backup codes once. SMS is never offered here: backup
 * codes are the only recovery factor presented.
 */
export default function AdminTotpEnrollPage() {
  const { user } = useUser();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<Stage>("loading");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Bumped only by the retry button. createTOTP() must run exactly once per
  // value of `attempt`; the ref below remembers which attempt already
  // started so the effect can no-op when it re-fires for reasons other than
  // a retry (e.g. Clerk's user object changing identity after createTOTP()
  // itself resolves, which would otherwise re-trigger this effect forever).
  const [attempt, setAttempt] = useState(0);
  const startedAttempt = useRef<number | null>(null);
  // Tracks real unmount only. Clerk's `user` object gets a new identity as
  // soon as createTOTP() resolves (it updates the underlying resource), which
  // re-fires this effect. That re-fire must not abandon the in-flight
  // request's result, so "was this cancelled" is tracked here instead of via
  // a variable scoped to one effect invocation.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Clerk classifies adding/removing a second factor (TOTP, backup codes) as
  // a sensitive operation requiring the session to be freshly verified at
  // its strongest available level. createTOTP() only creates an unconfirmed
  // draft secret and is not gated by this. verifyTOTP() and createBackupCode()
  // both are: useReverification wraps each so Clerk can show its own
  // verification prompt and retry the call once satisfied, instead of the
  // call failing outright with a 403 that nothing prompts for.
  const verifyTOTPReverified = useReverification((totpCode: string) => {
    if (!user) throw new Error("Not signed in.");
    return user.verifyTOTP({ code: totpCode });
  });
  const createBackupCodeReverified = useReverification(() => {
    if (!user) throw new Error("Not signed in.");
    return user.createBackupCode();
  });

  useEffect(() => {
    if (!user) return;
    if (startedAttempt.current === attempt) return;
    startedAttempt.current = attempt;
    setStage("loading");
    setError(null);
    (async () => {
      try {
        const totp = await user.createTOTP();
        if (!isMountedRef.current) return;
        if (!totp.uri) throw new Error("Clerk did not return a TOTP setup link.");
        setSecret(totp.secret ?? null);
        const dataUrl = await QRCode.toDataURL(totp.uri, { width: 320, margin: 1 });
        if (!isMountedRef.current) return;
        setQrDataUrl(dataUrl);
        setStage("scan");
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(describeSetupError(err));
        setStage("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, attempt]);

  async function submitCode() {
    if (!user || !code.trim()) return;
    setStage("verifying");
    setError(null);
    try {
      await verifyTOTPReverified(code.trim());
      const backupCodeResource = await createBackupCodeReverified();
      setBackupCodes(backupCodeResource.codes ?? []);
      setStage("backup-codes");
    } catch (err) {
      if (isReverificationCancelledError(err)) {
        setError("Verification was cancelled. Try again to finish setup.");
      } else {
        setError(describeSetupError(err));
      }
      setStage("scan");
    }
  }

  if (stage === "loading") {
    return <Shell><p className="text-text-2">Preparing authenticator setup…</p></Shell>;
  }

  if (stage === "error") {
    return (
      <Shell>
        <p className="text-destructive mb-4">
          {error ?? "Could not start authenticator setup. Please try again."}
        </p>
        <button
          className="bg-ink text-brass-lt font-semibold px-5 py-3 rounded-lg hover:bg-ink-2 w-full"
          onClick={() => setAttempt((current) => current + 1)}
        >
          Try again
        </button>
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
          onClick={() => {
            // The browser is already at /admin; AdminAccess rendered this
            // screen because its dashboard query failed with
            // ADMIN_TOTP_REQUIRED. Navigating to the current location is a
            // no-op, so instead invalidate that query on the same
            // QueryClient AdminAccess reads from. That marks it stale and
            // triggers an immediate refetch; now that TOTP is enrolled the
            // request succeeds, dashboard.isError flips to false, and
            // AdminAccess re-renders AdminPage in place of this screen.
            void queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() });
          }}
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
