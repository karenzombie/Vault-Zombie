import { useRoute } from "wouter";
import { useGetGuestPersonalReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader, StatCallout, OperatorNote } from "@/components/report/components";
import { OutcomeBadge } from "@/components/report/icons";
import { LockedReport } from "@/components/report/locked-report";

export default function GuestPersonalReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/guests/:guestId");
  const vaultId = params?.vaultId || "";
  const guestId = params?.guestId || "";
  
  const { data, isLoading, error } = useGetGuestPersonalReport(vaultId, guestId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Guest Report...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load guest report.</div>;
  }

  const total = data.score.scored || 0;
  const pct = total > 0 ? Math.round((data.score.full / total) * 100) : 0;

  return (
    <ReportLayout 
      vaultId={vaultId}
      title={`${data.displayName}'s Report`}
      subtitle="Personal scorecard and answer history."
      eyebrow="Guest View"
      backUrl={`/operator/vaults/${vaultId}/reports/summary`}
      backLabel="Back to Summary"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-person-fill" title="Score" subtitle="How they fared against the room." />
        <div className="callouts">
          <StatCallout 
            icon="ic-target" color="hit" 
            value={`${pct}%`} 
            highlight={`${data.score.full} called`} label={`of ${total} scored`} 
          />
          <StatCallout 
            icon="ic-trophy" color="brass" 
            value={data.rank ? `#${data.rank}` : "-"} 
            highlight="rank" label="on the leaderboard" 
          />
        </div>
      </section>

      <section className="report-panel">
        <SectionHeader icon="ic-lock" title="Their Guesses" subtitle="Full breakdown of their predictions." />
        <div className="space-y-4">
          {data.answers.map(a => {
            const answerValue = a.optionLabel || a.textValue || (a.numberValue !== null ? String(a.numberValue) : "-");
            return (
              <div key={a.answerId} className="arow p-4 border border-border/50 rounded-xl bg-muted/20">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-ink text-sm flex-1">{a.prompt}</div>
                  <div className="shrink-0 ml-4">
                    {a.outcomeTier ? (
                      <div className="flex items-center gap-1" title={a.outcomeTier.charAt(0).toUpperCase() + a.outcomeTier.slice(1)}>
                        <span className="text-[10px] font-bold text-gray uppercase tracking-widest">{a.outcomeTier}</span>
                        <OutcomeBadge outcome={a.outcomeTier} className="w-5 h-5" />
                        <span className="sr-only">{a.outcomeTier}</span>
                      </div>
                    ) : (
                      <div className="text-[10px] uppercase font-bold text-gray tracking-wider pt-0.5">
                        {a.freeTextMode === "keepsake" ? "Just for fun — no wrong answer" : "Awaiting outcome"}
                      </div>
                    )}
                  </div>
                </div>
                <div className="ag text-text-2 text-lg mb-2">{answerValue}</div>
                {a.operatorNote && (
                  <OperatorNote note={a.operatorNote} />
                )}
              </div>
            );
          })}
          {data.answers.length === 0 && (
            <div className="text-center text-gray py-6 italic">No answers recorded for this guest.</div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
