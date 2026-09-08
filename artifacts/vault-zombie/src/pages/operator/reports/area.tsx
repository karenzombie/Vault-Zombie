import { useRoute } from "wouter";
import { useGetAreaReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader } from "@/components/report/components";
import { DivergingBar } from "@/components/report/charts";
import { LockedReport } from "@/components/report/locked-report";

export default function AreaReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/area");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetAreaReport(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading By Area...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load area report.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="By Area of Life"
      subtitle="Strengths, weaknesses, and where the room guessed wrong."
      eyebrow="Category Breakdown"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-home" title="All Categories" subtitle="Called it leans right, missed leans left." />
        <div className="space-y-0">
          {data.areas?.map((area: any) => (
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
          {(!data.areas || data.areas.length === 0) && (
            <div className="text-center text-gray py-8 italic bg-muted/20 rounded-xl">
              No categories scored yet.
            </div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
