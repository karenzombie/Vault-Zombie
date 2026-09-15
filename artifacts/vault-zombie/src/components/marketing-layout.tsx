import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Link } from "wouter";
import { Menu, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The seven public marketing pages (Marketing Site Build Stages, Stage 1)
 * share this header and footer. This is distinct from `SiteHeader`, which
 * serves the authenticated app surfaces (operator, reports, admin) and is
 * unmodified by this work.
 */
const PAGE_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/vault-types", label: "Vault types" },
  { href: "/pricing", label: "Pricing" },
  { href: "/gift", label: "Gift a vault" },
  { href: "/about", label: "About" },
];

const FOOTER_LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/vault-types", label: "Vault types" },
  { href: "/pricing", label: "Pricing" },
  { href: "/gift", label: "Gift a vault" },
  { href: "/about", label: "About" },
];

// Stage 5, corrected by Addendum 5: the footer's Terms/Privacy links and
// the Legal page's "Read full" buttons point at the server routes
// `/terms` and `/privacy`, which serve the configured documents from
// `Policy_Documents/`, rather than static copies under `public/`.

function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside the header (button + panel together).
  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [menuOpen]);

  // Close on Escape from anywhere while open.
  useEffect(() => {
    if (!menuOpen) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-hairline">
      <div className="mx-auto flex h-24 max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link href="/" aria-label="Vault Zombie home" className="flex min-w-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-16 w-auto shrink-0" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-16 w-auto shrink-0" />
        </Link>

        <div ref={containerRef} className="relative flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-haspopup="true"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            data-testid="button-marketing-menu"
            className="flex items-center justify-center h-10 w-10 rounded-md text-ink hover:bg-bronze-wash transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <Link href="/sign-in" data-testid="link-sign-in" className="text-sm font-bold text-ink hover:text-bronze transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Sign in
          </Link>
          <Link href="/sign-up" data-testid="link-sign-up" className={cn(buttonVariants({ size: "sm" }))}>
            Sign up
          </Link>

          {menuOpen && (
            <div
              id={menuId}
              role="menu"
              aria-label="Page links"
              data-testid="menu-marketing-pages"
              className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-hairline bg-white p-2 shadow-lg"
            >
              {PAGE_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-md px-3 py-2 text-sm font-bold text-ink hover:bg-bronze-wash hover:text-bronze transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-hairline bg-[#F6F4F0] px-6 py-16 text-ink">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        <Link href="/" aria-label="Vault Zombie home" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-12 w-auto shrink-0" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-12 w-auto shrink-0" />
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm font-medium text-ink">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-md transition-colors hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              {link.label}
            </Link>
          ))}
          <a href="mailto:info@zombieplatforms.com" data-testid="link-contact" className="rounded-md transition-colors hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            Contact
          </a>
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-footer-terms"
            className="rounded-md transition-colors hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Terms
          </a>
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="link-footer-privacy"
            className="rounded-md transition-colors hover:text-bronze focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            Privacy
          </a>
        </nav>
      </div>
      <div className="mx-auto mt-12 max-w-6xl pt-8 text-center text-xs text-text-2">
        Sealed predictions, unlocked over time. A Zombie Platforms product.
      </div>
    </footer>
  );
}

export function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col font-sans">
      <MarketingHeader />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
