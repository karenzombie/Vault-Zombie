import { type ReactNode, useState } from "react";
import { getGetLegalStatusQueryKey, useAcceptLegalConsent, useGetLegalStatus } from "@workspace/api-client-react";

export function ConsentGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const status = useGetLegalStatus({ query: { queryKey: getGetLegalStatusQueryKey(), retry: false } });
  const mutation = useAcceptLegalConsent();

  if (status.isLoading) return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Checking legal acceptance…</div>;
  if (status.isError) return <div className="min-h-[100dvh] grid place-items-center bg-background p-6 text-center text-destructive">We could not verify legal acceptance. Please sign in again.</div>;
  const data = status.data;
  if (!data) return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Legal acceptance is unavailable.</div>;
  if (data.accepted) return <>{children}</>;
  return (
    <main className="min-h-[100dvh] grid place-items-center bg-background p-4">
      <section className="w-full max-w-md rounded-xl border border-hairline bg-card p-6 shadow-sm" aria-labelledby="consent-title">
        <h1 id="consent-title" className="font-display text-2xl text-ink">Updated legal acceptance required</h1>
        <p className="mt-3 text-text-2">Review and explicitly accept the current Terms and Privacy Policy before accessing your vault.</p>
        <label className="mt-5 flex items-start gap-3 text-sm text-text-2">
          <input data-testid="input-reconsent-checkbox" className="mt-1 size-4 accent-[hsl(var(--pop))]" type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
          <span>I have read and accept the <a data-testid="link-terms-reconsent" className="text-bronze underline underline-offset-2" href="/terms" target="_blank" rel="noreferrer">Terms and Conditions</a> and <a data-testid="link-privacy-reconsent" className="text-bronze underline underline-offset-2" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span>
        </label>
        {mutation.isError && <p role="alert" data-testid="status-reconsent-error" className="mt-3 text-sm text-destructive">Your acceptance could not be saved. Refresh and try again.</p>}
        <button data-testid="button-submit-reconsent" className="mt-5 w-full rounded-md bg-pop px-4 py-2 font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={!accepted || mutation.isPending} onClick={() => mutation.mutate({ data: { accepted: true, termsVersion: data.termsVersion, privacyVersion: data.privacyVersion } }, { onSuccess: () => status.refetch() })}>
          {mutation.isPending ? "Saving…" : "Continue"}
        </button>
      </section>
    </main>
  );
}