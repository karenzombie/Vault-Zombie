import { Link } from "wouter";
import { SiteHeader } from "@/components/site-header";

export function LockedReport({ vaultId }: { vaultId: string }) {
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-card border border-border p-8 rounded-2xl  text-center space-y-4">
        <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2 text-ink">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </div>
        <h2 className="font-display text-2xl text-ink">Locked Report</h2>
        <p className="text-muted-foreground">This section requires a higher tier plan. Upgrade your vault to unlock deep-dive reports.</p>
        <div className="pt-4">
          <Link href={`/operator/vaults/${vaultId}`} className="text-vault-accent font-bold hover:underline">Return to Host Dashboard</Link>
        </div>
      </div>
      </div>
    </div>
  );
}
