import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, useClerk } from "@clerk/react";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || "";

/**
 * The shared site header (Flow1 Build Stages 1.1, extended by the Stage 1
 * correction of 2026-09-11). Used on every signed-in page — the landing page,
 * the auth pages, the host dashboard, the reveal surface, and the report
 * pages — so a host always has My vaults, Gift a vault, and Sign out
 * available. The guest flow keeps its own minimal header, since guests never
 * sign in.
 */
export function SiteHeader() {
  return PUBLISHABLE_KEY ? <AuthAwareSiteHeader /> : <SiteHeaderChrome isSignedIn={false} onSignOut={() => {}} />;
}

function AuthAwareSiteHeader() {
  const [, setLocation] = useLocation();
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();

  async function signOut() {
    await clerk.signOut();
    setLocation("/");
  }

  return <SiteHeaderChrome isSignedIn={isLoaded && !!isSignedIn} onSignOut={signOut} />;
}

function SiteHeaderChrome({ isSignedIn, onSignOut }: { isSignedIn: boolean; onSignOut: () => void | Promise<void> }) {
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    setMenuOpen(false);
    await onSignOut();
  }

  const links = isSignedIn
    ? [{ href: "/operator", label: "My vaults" }, { href: "/gifts/purchase", label: "Gift a vault" }]
    : [
        { href: "/gifts/redeem", label: "Redeem a gift code" },
        { href: "/gifts/purchase", label: "Gift a vault" },
        { href: "/sign-in", label: "Sign in" },
      ];

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-hairline">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Vault Zombie home" className="flex min-w-0 items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-16 w-auto shrink-0" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-16 w-auto shrink-0" />
        </Link>

        {/* sm and above: inline links */}
        <div className="hidden shrink-0 items-center gap-3 md:gap-6 sm:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="text-sm font-bold text-ink hover:text-bronze transition-colors">
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <button type="button" data-testid="button-sign-out" onClick={signOut} className="text-sm font-bold text-ink hover:text-bronze transition-colors">
              Sign out
            </button>
          ) : (
            <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
              Sign up
            </Link>
          )}
        </div>

        {/* below sm: menu button */}
        <button
          type="button"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          data-testid="button-header-menu"
          className="flex sm:hidden items-center justify-center h-10 w-10 rounded-md text-ink hover:bg-bronze-wash transition-colors"
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {menuOpen && (
        <div className="sm:hidden border-t border-hairline bg-background px-4 py-4 flex flex-col gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-base font-bold text-ink hover:text-bronze transition-colors"
            >
              {link.label}
            </Link>
          ))}
          {isSignedIn ? (
            <button type="button" data-testid="button-sign-out-mobile" onClick={signOut} className="py-3 text-left text-base font-bold text-ink hover:text-bronze transition-colors">
              Sign out
            </button>
          ) : (
            <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="py-3 text-base font-bold text-bronze">
              Sign up
            </Link>
          )}
        </div>
      )}
    </header>
  );
}
