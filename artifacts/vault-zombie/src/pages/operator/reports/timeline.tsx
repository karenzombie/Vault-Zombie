import { useRoute } from "wouter";
import { useGetTimelineReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader } from "@/components/report/components";
import { TimelineNode } from "@/components/report/timeline-node";
import { LockedReport } from "@/components/report/locked-report";

export default function TimelineReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/timeline");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetTimelineReport(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Timeline...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load timeline.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Reveal Timeline"
      subtitle="Accuracy tracked drop by drop."
      eyebrow="Timeline"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-dial" title="The Journey" subtitle="Every reveal from the vault's lifespan." />
        <div className="timeline mt-4">
          {data.reveals?.map((reveal: any, idx: number) => (
            <TimelineNode 
              key={reveal.revealSlotId}
              reveal={reveal}
              isLast={idx === data.reveals.length - 1}
            />
          ))}
          {(!data.reveals || data.reveals.length === 0) && (
            <div className="text-center text-gray py-8 italic bg-muted/20 rounded-xl border border-border/50">
              No reveals scheduled or completed yet.
            </div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
