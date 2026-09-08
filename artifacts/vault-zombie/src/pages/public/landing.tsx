import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Landing() {
  return (
    <main className="min-h-[100dvh] bg-background p-6">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between">
        <Link href="/" aria-label="Vault Zombie home">
          <img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-9 w-auto" />
        </Link>
        <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary" }))}>
          Sign in
        </Link>
      </header>
      <p className="mx-auto mt-24 max-w-xl text-center text-lg text-text-2">
        Vault Zombie is being prepared for its next reveal.
      </p>
    </main>
  );
}