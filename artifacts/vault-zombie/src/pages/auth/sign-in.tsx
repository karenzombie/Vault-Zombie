import { useEffect } from "react";
import { useAuth, SignIn } from "@clerk/react";
import { useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  // A pending gift code redemption (2.5) sends the visitor here with redirect_url
  // so they land back on the redeem page, not the default operator dashboard.
  const redirectUrl = new URLSearchParams(window.location.search).get("redirect_url") || "/operator";

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation(redirectUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, setLocation]);

  if (isLoaded && isSignedIn) {
    return <main className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Redirecting…</main>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 w-full flex items-center justify-center p-4">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl={redirectUrl} />
      </main>
    </div>
  );
}
