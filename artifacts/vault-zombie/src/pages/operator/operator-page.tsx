import { useState } from "react";
import { Link, Redirect, useLocation, useSearch } from "wouter";
import { useListUnlockedRevealWork, useGetVaultHealthReport, useListOperatorVaults, useDeleteOperatorVault } from "@workspace/api-client-react";
import type { OperatorVaultListVaultsItem } from "@workspace/api-client-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Inbox, FileText, Activity, BarChart, Clock, Database, Award, Printer, Trash2 } from "lucide-react";

import { QuestionResolver } from "./question-resolver";
import { OperatorScoreboard } from "./operator-scoreboard";
import { OperatorBillingPanel, OperatorOverageWarning } from "./operator-billing";
import { SiteHeader } from "@/components/site-header";
import { TierChooser } from "@/components/tier-chooser";

export default function OperatorPage() {
  const search = useSearch();
  const legacyVaultId = new URLSearchParams(search).get("vaultId");

  // Bookmark safety net: /operator?vaultId=... now lives at /operator/vaults/:vaultId.
  if (legacyVaultId) {
    return <Redirect to={`/operator/vaults/${encodeURIComponent(legacyVaultId)}`} />;
  }

  return <HostDashboard />;
}

/** Maps a vault type's slug to its art silhouette in public/vault-art. The
 * "baby" question-bank slug maps to the new-baby.svg asset filename; every
 * other slug matches its filename directly. */
export const VAULT_ART: Record<string, string> = {
  marriage: "marriage.svg",
  couple: "couple.svg",
  baby: "new-baby.svg",
  "child-growth": "child-growth.svg",
  college: "college.svg",
  job: "job.svg",
  travel: "travel.svg",
  retirement: "retirement.svg",
  "new-business": "new-business.svg",
  "new-year": "new-year.svg",
};

const CARD_STATUS_LABEL: Record<OperatorVaultListVaultsItem["cardStatus"], string> = {
  draft: "Draft",
  sealed: "Sealed",
  partially_unlocked: "Partially unlocked",
  fully_unlocked: "Fully unlocked",
  completed: "Completed",
};

function VaultCard({ vault }: { vault: OperatorVaultListVaultsItem }) {
  const art = VAULT_ART[vault.vaultTypeSlug];
  const href = vault.status === "draft"
    ? `/operator/vaults/${vault.id}/setup`
    : `/operator/vaults/${vault.id}`;

  return (
    <Link
      href={href}
      data-testid={`card-vault-${vault.id}`}
      className="relative block overflow-hidden rounded-2xl border border-hairline bg-bronze-wash p-6 hover-elevate transition-transform"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-brass" />
      {art && (
        <img
          src={`${import.meta.env.BASE_URL}vault-art/${art}`}
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 object-contain opacity-15"
        />
      )}
      <div className="relative">
        <div className="text-xs font-bold uppercase tracking-wide text-bronze mb-3">{CARD_STATUS_LABEL[vault.cardStatus]}</div>
        <h3 className="font-display text-2xl text-ink leading-tight">{vault.name}</h3>
        <p className="mt-1 text-sm text-text-2">{vault.vaultTypeName}</p>
      </div>
    </Link>
  );
}

function HostDashboard() {
  const { data, isLoading, isError } = useListOperatorVaults();
  const vaults = data?.vaults ?? [];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <SiteHeader />
      <main className="flex-1 w-full max-w-6xl mx-auto p-4 sm:p-8">
        {isLoading && <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading your vaults…</div>}

        {isError && (
          <div className="p-8 text-center bg-bronze-wash border border-hairline rounded-xl">
            <p className="text-destructive font-bold">Unable to load your vaults. Please try again.</p>
          </div>
        )}

        {!isLoading && !isError && vaults.length > 0 && (
          <>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-6">Your vaults</h1>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {vaults.map((vault) => <VaultCard key={vault.id} vault={vault} />)}
            </div>
            <div className="mt-8">
              <Link href="/operator/vaults/new" data-testid="button-new-vault" className={buttonVariants()}>
                New vault
              </Link>
            </div>
          </>
        )}

        {!isLoading && !isError && vaults.length === 0 && (
          <>
            <h1 className="font-display text-3xl sm:text-4xl text-ink mb-2">Let's build your first vault</h1>
            <p className="text-text-2 mb-8">Pick a plan to get started. You can upgrade later, and upgrading only raises your guest limit.</p>
            <TierChooser />
          </>
        )}
      </main>
    </div>
  );
}

export function OperatorReveal({ vaultId }: { vaultId: string }) {
  const { data: revealData, isLoading: isRevealLoading, error: revealError } = useListUnlockedRevealWork(vaultId);
  const { data: healthData } = useGetVaultHealthReport(vaultId);

  const hasPaidAccess = !!(healthData && healthData.planTier !== 'lockbox');

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <SiteHeader />
      <div className="flex justify-center px-3 sm:px-4 pt-4">
        <div className="w-full max-w-lg flex justify-end">
          <div className="shrink-0 text-[10px] sm:text-[11px] font-bold tracking-wider sm:tracking-widest text-bronze uppercase bg-bronze-wash px-2 sm:px-3 py-1.5 rounded-full">
            Live Host
          </div>
        </div>
      </div>

      <main className="flex-1 w-full max-w-lg mx-auto p-3 sm:p-4 flex flex-col pt-2">
        <OperatorOverageWarning vaultId={vaultId} />
        {hasPaidAccess && healthData?.referralCount != null && (
          <div className="mb-4 rounded-lg border border-border bg-white px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-text-2">Referrals from your vault link</span>
            <span className="font-display text-xl text-ink">{healthData.referralCount}</span>
          </div>
        )}

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

        <div className="mt-10 pt-6 border-t-2 border-destructive/30">
          <DeleteVaultSection vaultId={vaultId} />
        </div>
      </main>
    </div>
  );
}

function DeleteVaultSection({ vaultId }: { vaultId: string }) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const deleteMutation = useDeleteOperatorVault();

  const handleDelete = () => {
    deleteMutation.mutate(
      { vaultId },
      {
        onSuccess: () => {
          setOpen(false);
          setLocation("/operator");
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-3">
      <h3 className="font-display text-xl text-ink">Delete this vault</h3>
      <p className="text-muted-foreground text-sm">Remove this vault from your dashboard. It stays on file but is no longer accessible to you or your guests.</p>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" data-testid="button-delete-vault">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete vault
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this vault?</AlertDialogTitle>
            <AlertDialogDescription>
              Your guests' predictions will no longer be readable, and your guest link will stop working. This cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-vault">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete-vault"
              className={buttonVariants({ variant: "destructive" })}
              disabled={deleteMutation.isPending}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete vault"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
