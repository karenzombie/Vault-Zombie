import { type ReactNode, useState } from "react";
import { Link } from "wouter";
import { ApiError, getGetLegalStatusQueryKey, useAcceptLegalConsent, useGetLegalStatus } from "@workspace/api-client-react";
import { SiteHeader } from "@/components/site-header";

function isAuthFailure(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function ExpiredSignInState() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <div className="grid place-items-center p-6 text-center">
        <div>
          <p className="text-destructive">Your sign-in has expired. Sign in again to continue.</p>
          <Link href="/sign-in" data-testid="button-consent-sign-in" className="mt-5 inline-block rounded-md bg-pop px-4 py-2 font-medium text-primary-foreground">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

function ServerFailureState() {
  return (
    <div className="min-h-[100dvh] bg-background">
      <SiteHeader />
      <div className="grid place-items-center p-6 text-center">
        <div>
          <p className="text-destructive">Something went wrong on our end. Reload the page to try again.</p>
          <button type="button" data-testid="button-consent-reload" className="mt-5 rounded-md bg-pop px-4 py-2 font-medium text-primary-foreground" onClick={() => window.location.reload()}>
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConsentGate({ children }: { children: ReactNode }) {
  const [accepted, setAccepted] = useState(false);
  const status = useGetLegalStatus({
    query: {
      queryKey: getGetLegalStatusQueryKey(),
      // An expired/missing sign-in is never transient, so it never retries.
      // Any other failure retries twice before the failure state appears.
      retry: (failureCount, error) => !isAuthFailure(error) && failureCount < 2,
    },
  });
  const mutation = useAcceptLegalConsent();

  if (status.isLoading) return <div className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Checking legal acceptance…</div>;
  if (status.isError) return isAuthFailure(status.error) ? <ExpiredSignInState /> : <ServerFailureState />;
  const data = status.data;
  if (!data) return <ServerFailureState />;
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