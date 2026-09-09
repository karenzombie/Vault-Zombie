import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListUnlockedRevealWork, useGetVaultHealthReport } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Inbox, FileText, Activity, BarChart, Clock, Database, Award, Printer, CreditCard } from "lucide-react";

import { QuestionResolver } from "./question-resolver";
import { OperatorScoreboard } from "./operator-scoreboard";
import { OperatorBillingPanel, OperatorOverageWarning } from "./operator-billing";

export default function OperatorPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const vaultId = searchParams.get("vaultId");

  if (!vaultId) {
    return <VaultIdPrompt />;
  }

  return <OperatorReveal vaultId={vaultId} />;
}

function VaultIdPrompt() {
  const [, setLocation] = useLocation();
  const [val, setVal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) {
      setLocation(`/operator?vaultId=${encodeURIComponent(val.trim())}`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="Vault Zombie" className="h-20 w-auto mx-auto mb-6" />
          <h1 className="font-display text-4xl text-ink">Host Login</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">Enter the Vault ID to access the live reveal surface.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Vault ID..."
            value={val}
            onChange={(e) => setVal(e.target.value)}
            className="text-center text-xl py-7 font-mono bg-white border-hairline focus-visible:ring-pop focus-visible:border-pop"
            autoFocus
          />
          <Button type="submit" className="w-full py-7 text-lg font-bold bg-ink text-[hsl(var(--brass-lt))] hover:bg-ink-2 transition-all active:scale-[0.98]">
            Open Control Surface
          </Button>
        </form>
      </div>
    </div>
  );
}

function OperatorReveal({ vaultId }: { vaultId: string }) {
  const { data: revealData, isLoading: isRevealLoading, error: revealError } = useListUnlockedRevealWork(vaultId);
  const { data: healthData } = useGetVaultHealthReport(vaultId);

  const hasPaidAccess = !!(healthData && healthData.planTier !== 'lockbox');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between gap-3 px-3 py-4 sm:px-5 bg-ink text-primary-foreground sticky top-0 z-20">
        <Link href="/" className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-14 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-14 w-auto object-contain" />
        </Link>
        <div className="shrink-0 text-[10px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest text-brass uppercase bg-white/10 px-2 sm:px-3 py-1.5 rounded-full">
          Live Host
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-3 sm:p-4 flex flex-col pt-6">
        <OperatorOverageWarning vaultId={vaultId} />

        <Tabs defaultValue="reveal" className="w-full">
          <TabsList className={`w-full grid mb-8 bg-muted p-1 border border-border/50 ${!hasPaidAccess ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <TabsTrigger value="reveal" className="text-sm sm:text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink">Live</TabsTrigger>
            {hasPaidAccess && (
              <TabsTrigger value="scoreboard" className="text-sm sm:text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink">Score</TabsTrigger>
            )}
            <TabsTrigger value="reports" className="text-sm sm:text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink">Reports</TabsTrigger>
            <TabsTrigger value="billing" className="text-sm sm:text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="reveal" className="space-y-6 pb-24 focus-visible:outline-none">
            {isRevealLoading && (
              <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
                Loading reveal work...
              </div>
            )}

            {revealError && (
              <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl font-medium">
                Failed to load reveal data. Check the Vault ID.
              </div>
            )}

            {revealData?.questions?.length === 0 && (
              <div className="p-10 text-center bg-card border border-border rounded-xl">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <div className="font-bold text-ink text-lg">No unlocked questions</div>
                <div className="text-muted-foreground text-sm mt-1">Wait for the next drop to resolve predictions.</div>
              </div>
            )}

            <div className="space-y-5">
              {revealData?.questions?.map((q) => (
                <div key={q.vaultQuestionId} className="relative">
                  <div className="absolute right-3 top-3 z-10">
                    <Link
                      href={`/operator/vaults/${vaultId}/reports/reveals/${q.revealSlotId}`}
                      className="text-[10px] uppercase tracking-wider font-bold text-vault-accent hover:text-brass transition-colors bg-bronze-wash/50 px-2 py-1 rounded"
                    >
                      View Report
                    </Link>
                  </div>
                  <QuestionResolver question={q} vaultId={vaultId} />
                </div>
              ))}
            </div>
          </TabsContent>

          {hasPaidAccess && (
            <TabsContent value="scoreboard" className="pb-24 focus-visible:outline-none">
              <OperatorScoreboard vaultId={vaultId} />
            </TabsContent>
          )}

          <TabsContent value="reports" className="pb-24 focus-visible:outline-none">
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-display text-2xl text-ink">Vault Reports</h3>
              <p className="text-muted-foreground text-sm">Access deep dives, aggregations, and the vault archive.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <ReportLink href={`/operator/vaults/${vaultId}/reports/health`} icon={<Activity />} title="Health Dashboard" desc="Metadata & completion" />
                <ReportLink href={`/operator/vaults/${vaultId}/reports/summary`} icon={<FileText />} title="Results Summary" desc="Flagship rich report" />

                {hasPaidAccess && (
                  <>
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/scoreboard`} icon={<BarChart />} title="Full Scoreboard" desc="Rankings & awards" />
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/area`} icon={<BarChart />} title="By Area" desc="Strengths & weaknesses" />
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/timeline`} icon={<Clock />} title="Timeline" desc="Reveal-by-reveal accuracy" />
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/archive`} icon={<Database />} title="Answers Archive" desc="All scored outcomes" />
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/finale`} icon={<Award />} title="Grand Summary" desc="Milestone finale" />
                    <ReportLink href={`/operator/vaults/${vaultId}/reports/keepsake`} icon={<Printer />} title="Printable Keepsake" desc="PDF-friendly archive" />
                  </>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="billing" className="pb-24 focus-visible:outline-none">
            <OperatorBillingPanel vaultId={vaultId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

function ReportLink({ href, icon, title, desc }: { href: string, icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/50 hover:border-vault-accent transition-colors group">
      <div className="w-10 h-10 rounded-full bg-bronze-wash text-vault-accent flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <div>
        <div className="font-bold text-ink text-sm leading-tight">{title}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
    </Link>
  );
}
