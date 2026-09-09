import { FormEvent, useEffect, useState } from "react";
import { useClerk, useSignUp } from "@clerk/react";
import { getGetLegalConfigurationQueryKey, useCreateLegalSignupIntent, useGetLegalConfiguration } from "@workspace/api-client-react";

export default function SignUpPage() {
  const { signUp } = useSignUp();
  const clerk = useClerk();
  const legal = useGetLegalConfiguration({ query: { queryKey: getGetLegalConfigurationQueryKey(), retry: false } });
  const createIntent = useCreateLegalSignupIntent();
  const [accepted, setAccepted] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (window.location.pathname.endsWith("/sso-callback")) {
      void clerk.handleRedirectCallback({ signUpFallbackRedirectUrl: "/operator" }).catch(() => setError("Google sign-up could not be completed."));
    }
  }, [clerk]);

  async function signupMetadata() {
    if (!legal.data || !accepted) throw new Error("Explicit legal acceptance is required.");
    const intent = await createIntent.mutateAsync({ data: { accepted: true, termsVersion: legal.data.termsVersion, privacyVersion: legal.data.privacyVersion } });
    return { legalSignupIntent: intent.token };
  }
  async function createAccount(event: FormEvent) {
    event.preventDefault();
    if (!signUp || !accepted || !legal.data) return;
    setError(undefined); setPending(true);
    try {
      const created = await signUp.password({ emailAddress: email, password, unsafeMetadata: await signupMetadata(), legalAccepted: true });
      if (created.error) throw created.error;
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) throw sent.error;
      setNeedsVerification(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Account creation could not be started."); }
    finally { setPending(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault();
    if (!signUp) return;
    setError(undefined); setPending(true);
    try {
      const result = await signUp.verifications.verifyEmailCode({ code: verificationCode });
      if (result.error) throw result.error;
      const finalized = await signUp.finalize();
      if (finalized.error) throw finalized.error;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "The verification code is invalid."); }
    finally { setPending(false); }
  }
  async function google() {
    if (!signUp || !accepted || !legal.data) return;
    setError(undefined); setPending(true);
    try {
      const result = await signUp.sso({ strategy: "oauth_google", redirectUrl: "/operator", redirectCallbackUrl: "/sign-up/sso-callback", unsafeMetadata: await signupMetadata(), legalAccepted: true });
      if (result.error) throw result.error;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Google sign-up could not be started."); setPending(false); }
  }

  if (!signUp || legal.isLoading) return <main className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Preparing sign-up…</main>;
  if (needsVerification) return <main className="min-h-[100dvh] grid place-items-center bg-background p-4"><form className="w-full max-w-md rounded-xl border border-hairline bg-card p-6" onSubmit={verify}><h1 className="font-display text-2xl">Verify your email</h1><label className="mt-5 block text-sm">Verification code<input data-testid="input-signup-verification-code" className="mt-1 w-full rounded-md border p-2" value={verificationCode} onChange={(e) => setVerificationCode(e.target.value)} autoComplete="one-time-code" required /></label>{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}<button data-testid="button-verify-signup" className="mt-5 w-full rounded-md bg-ink p-2 text-primary-foreground hover:bg-ink-2" disabled={pending}>{pending ? "Verifying…" : "Verify and continue"}</button></form></main>;
  return <main className="min-h-[100dvh] grid place-items-center bg-background p-4"><form className="w-full max-w-md rounded-xl border border-hairline bg-card p-6 shadow-sm" onSubmit={createAccount}><h1 className="font-display text-3xl">Start your vault</h1><p className="mt-2 text-text-2">Create a host account.</p><label className="mt-5 block text-sm">Email<input data-testid="input-signup-email" className="mt-1 w-full rounded-md border p-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label><label className="mt-4 block text-sm">Password<input data-testid="input-signup-password" className="mt-1 w-full rounded-md border p-2" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" required /></label><label className="mt-5 flex gap-3 text-sm text-text-2"><input data-testid="input-signup-legal-checkbox" className="mt-1 size-4 shrink-0" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} /><span className="min-w-0">I accept the <a data-testid="link-signup-terms" className="text-bronze underline" href="/terms" target="_blank" rel="noreferrer">Terms and Conditions</a> and <a data-testid="link-signup-privacy" className="text-bronze underline" href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a>.</span></label>{legal.isError && <p role="alert" className="mt-3 text-destructive">Legal documents are unavailable; sign-up cannot continue.</p>}{error && <p role="alert" className="mt-3 text-destructive">{error}</p>}<button data-testid="button-create-account" className="mt-5 w-full rounded-md bg-ink p-2 text-primary-foreground hover:bg-ink-2 disabled:opacity-50" disabled={!accepted || !legal.data || pending || createIntent.isPending} type="submit">{pending ? "Creating…" : "Create account"}</button><button data-testid="button-google-signup" className="mt-3 w-full rounded-md border p-2 disabled:opacity-50" disabled={!accepted || !legal.data || pending || createIntent.isPending} type="button" onClick={google}>Continue with Google</button><p className="mt-5 text-center text-sm text-text-2">Already registered? <a data-testid="link-signin-from-signup" className="text-bronze underline" href="/sign-in">Sign in</a></p></form></main>;
}