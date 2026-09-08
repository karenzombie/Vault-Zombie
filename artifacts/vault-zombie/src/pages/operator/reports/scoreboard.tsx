import { useRoute } from "wouter";
import { useGetOperatorScoreboard } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader } from "@/components/report/components";
import { ScoreboardLollipop } from "@/components/report/scoreboard-lollipop";
import { Medallion } from "@/components/report/icons";
import { LockedReport } from "@/components/report/locked-report";

export default function ScoreboardReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/scoreboard");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetOperatorScoreboard(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Scoreboard...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load scoreboard.</div>;
  }

  const maxScore = data.entries.length > 0 ? Math.max(...data.entries.map(s => s.total)) : 0;
  
  const sortedByTotal = [...data.entries].sort((a, b) => b.total - a.total);
  const sortedByHalf = [...data.entries].sort((a, b) => b.half - a.half);
  
  const sharpest = sortedByTotal[0];
  const boldest = sortedByHalf.find(e => e.half > 0);

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Who Knew You Best"
      subtitle="The full leaderboard."
      eyebrow="Scoreboard"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-trophy" title="The Board" subtitle={`${data.entries.length} guests ranked by accurate predictions.`} />
        
        <div className="space-y-0 mt-4">
          {data.entries.map((entry, idx) => (
            <ScoreboardLollipop 
              key={entry.guestId}
              rank={idx + 1}
              entry={entry}
              maxScore={maxScore}
              vaultId={vaultId}
            />
          ))}
          {data.entries.length === 0 && (
            <div className="text-center text-gray py-8 italic bg-muted/20 rounded-xl">
              No scores yet. Resolve predictions to update the board.
            </div>
          )}
        </div>

        {data.entries.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mt-8">
            {sharpest && (
              <div className="slice">
                <Medallion icon="ic-target" color="brass" />
                <div className="t">Sharpest</div>
                <div className="w">{sharpest.displayName}</div>
                <div className="d">Top of the board</div>
              </div>
            )}
            {boldest && (
              <div className="slice">
                <Medallion icon="ic-star" color="bronze" />
                <div className="t">Boldest</div>
                <div className="w">{boldest.displayName}</div>
                <div className="d">Most half-credits</div>
              </div>
            )}
          </div>
        )}
      </section>
    </ReportLayout>
  );
}
