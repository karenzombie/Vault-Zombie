import { useRoute, Link } from "wouter";
import { useGetVaultResultsSummary } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader, StatCallout, OperatorNote } from "@/components/report/components";
import { RingGauge, Pictograph, DivergingBar } from "@/components/report/charts";
import { TimelineNode } from "@/components/report/timeline-node";
import { ScoreboardLollipop } from "@/components/report/scoreboard-lollipop";
import { OutcomeBadge } from "@/components/report/icons";
import { LockedReport } from "@/components/report/locked-report";

export default function SummaryReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/summary");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetVaultResultsSummary(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Vault Summary...</div>;
  if (error || !data) {
    const is403 = (error as any)?.status === 403;
    if (is403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load results summary.</div>;
  }

  const totalScored = data.outcomes.scored || 0;
  const pct = totalScored > 0 ? Math.round((data.outcomes.full / totalScored) * 100) : 0;
  
  const isTrimmed = data.depth === 'trimmed';
  
  const sealedDateStr = data.vault.sealedAt ? new Date(data.vault.sealedAt).toLocaleDateString() : 'Unknown date';

  return (
    <ReportLayout 
      vaultId={vaultId}
      title={data.vault.name}
      subtitle={`Sealed ${sealedDateStr} · ${data.planTier.replace('_', ' ').toUpperCase()} TIER`}
      eyebrow="Results Summary"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-target" title="The Headline" subtitle={`${totalScored} predictions scored across the vault.`} />
        <div className="callouts">
          <StatCallout 
            icon="ic-check" color="hit" 
            value={`${pct}%`} 
            highlight="called it" label={`overall accuracy`} 
          />
          {data.scoreboard && data.scoreboard.length > 0 && (
            <StatCallout 
              icon="ic-trophy" color="brass" 
              value={data.scoreboard[0].displayName} 
              highlight="leads the board" label={`${data.scoreboard[0].full} of ${data.scoreboard[0].total} called`} 
            />
          )}
        </div>
      </section>

      <section className="report-panel">
        <SectionHeader icon="ic-dial" title="How the room did" subtitle="Every scored answer combined." />
        <RingGauge outcomes={data.outcomes} />
      </section>

      {/* Standouts */}
      {data.standouts && data.standouts.length > 0 && (
        <section className="report-panel">
          <SectionHeader icon="ic-star" title="Standouts" subtitle="Highlights from the vault." />
          <div className="standouts">
            {data.standouts.map((so) => (
              <div key={so.vaultQuestionId} className="so-card">
                <div className={`so-tag ${so.outcomeTier === 'full' ? 'hit' : 'miss'}`}>
                  <OutcomeBadge outcome={so.outcomeTier} className="w-4 h-4" /> 
                  {so.outcomeTier === 'full' ? 'Nailed it' : 'Missed it'}
                </div>
                <div className="so-pr text-ink font-medium leading-tight">{so.prompt}</div>
                {so.operatorNote && (
                  <div className="mt-3">
                    <OperatorNote note={so.operatorNote} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Question drill-ins */}
      {data.questions && data.questions.length > 0 && (
        <section className="report-panel">
          <SectionHeader icon="ic-lock" title="Questions" subtitle="Drill into specific questions." />
          <div className="space-y-4 mt-4">
            {data.questions.map(q => (
              <div key={q.vaultQuestionId} className="flex justify-between items-center p-4 border border-border/50 bg-muted/20 rounded-xl hover:border-vault-accent transition-colors">
                <div className="font-medium text-ink line-clamp-1 mr-4">{q.prompt}</div>
                <Link href={`/operator/vaults/${vaultId}/reports/questions/${q.vaultQuestionId}`} className="shrink-0 bg-white border border-border text-xs font-bold text-vault-accent px-3 py-1.5 rounded-lg hover:bg-bronze-wash transition-colors">
                  View Detail
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isTrimmed && data.scoreboard && (
        <section className="report-panel">
          <SectionHeader icon="ic-people" title="The room" subtitle={`${data.scoreboard.length} guests. One figure each.`} />
          <Pictograph scoreboard={data.scoreboard} maxScore={Math.max(...data.scoreboard.map(s => s.total), 0)} />
        </section>
      )}

      {!isTrimmed && data.areas && data.areas.length > 0 && (
        <section className="report-panel">
          <SectionHeader icon="ic-home" title="By area of life" subtitle="Called it leans right, missed leans left." />
          <div className="space-y-0">
            {data.areas.map((area: any) => (
              <DivergingBar 
                key={area.id}
                icon={area.iconKey}
                title={area.name}
                meta={`${area.outcomes.full} called · ${area.outcomes.half} sort of · ${area.outcomes.zero} missed`}
                hitCount={area.outcomes.full}
                missCount={area.outcomes.zero}
                maxCount={Math.max(...data.areas!.map((a: any) => Math.max(a.outcomes.full, a.outcomes.zero)), 0)}
              />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-hairline text-center">
            <Link href={`/operator/vaults/${vaultId}/reports/area`} className="text-vault-accent text-sm font-bold hover:underline">
              View Area Drill-in &rarr;
            </Link>
          </div>
        </section>
      )}
      
      {!isTrimmed && data.timeline && data.timeline.length > 1 && (
        <section className="report-panel">
          <SectionHeader icon="ic-dial" title="Reveal Timeline" subtitle="Accuracy reveal by reveal." />
          <div className="timeline">
            {data.timeline.map((reveal: any, idx: number) => (
              <TimelineNode 
                key={reveal.revealSlotId}
                reveal={reveal}
                isLast={idx === data.timeline!.length - 1}
              />
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-hairline text-center">
            <Link href={`/operator/vaults/${vaultId}/reports/timeline`} className="text-vault-accent text-sm font-bold hover:underline">
              View Full Timeline &rarr;
            </Link>
          </div>
        </section>
      )}

      {!isTrimmed && data.scoreboard && (
        <section className="report-panel">
          <SectionHeader icon="ic-star" title="Scoreboard" subtitle="Who knew you best." />
          <div className="space-y-0">
            {data.scoreboard.slice(0, 5).map((entry, idx) => (
              <ScoreboardLollipop 
                key={entry.guestId}
                rank={idx + 1}
                entry={entry}
                maxScore={Math.max(...data.scoreboard!.map(s => s.total), 0)}
                vaultId={vaultId}
              />
            ))}
          </div>
          {data.scoreboard.length > 5 && (
            <div className="mt-4 pt-4 border-t border-hairline text-center">
              <Link href={`/operator/vaults/${vaultId}/reports/scoreboard`} className="text-vault-accent text-sm font-bold hover:underline">
                View Full Scoreboard ({data.scoreboard.length} guests) &rarr;
              </Link>
            </div>
          )}
        </section>
      )}
    </ReportLayout>
  );
}
