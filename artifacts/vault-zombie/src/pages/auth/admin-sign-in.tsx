import { useEffect } from "react";
import { useAuth, SignIn } from "@clerk/react";
import { useLocation } from "wouter";

// Administrator sign in, kept fully separate from the operator sign in page
// at /sign-in: no sign up option, no link into the operator experience, and
// it always lands on /admin. Forgot password is left enabled because that is
// how the first admin sets a password (the account is created without one).
export default function AdminSignInPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isLoaded && isSignedIn) setLocation("/admin");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, setLocation]);

  if (isLoaded && isSignedIn) {
    return <main className="min-h-[100dvh] grid place-items-center bg-background text-text-2">Redirecting…</main>;
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col bg-ink">
      <header className="w-full flex items-center justify-center gap-2 pt-10 pb-4">
        <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-12 w-auto" />
        <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-12 w-auto" />
      </header>
      <main className="flex-1 w-full flex items-start justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center text-[11px] tracking-[0.1em] uppercase text-brass mb-4">Administrator sign in</div>
          <SignIn
            routing="path"
            path="/admin/sign-in"
            fallbackRedirectUrl="/admin"
            appearance={{
              elements: {
                footerAction: { display: "none" },
                footer: { display: "none" },
                socialButtonsRoot: { display: "none" },
                dividerRow: { display: "none" },
              },
            }}
          />
        </div>
      </main>
    </div>
  );
}
