import { useEffect } from "react";
import { useAuth, SignIn } from "@clerk/react";
import { useLocation } from "wouter";
import { SiteHeader } from "@/components/site-header";

export default function SignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/operator");
  }, [isLoaded, isSignedIn, setLocation]);

  if (isLoaded && isSignedIn) {
    return <main className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Redirecting…</main>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 w-full flex items-center justify-center p-4">
        <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/operator" />
      </main>
    </div>
  );
}
