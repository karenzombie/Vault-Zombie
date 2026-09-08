import { useRoute } from "wouter";
import { useGetFinaleReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { LockedReport } from "@/components/report/locked-report";
import { FinaleContent } from "@/components/report/finale-content";

export default function FinaleReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/finale");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetFinaleReport(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Finale...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl font-medium">Failed to load finale.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title={data.completionReady ? "Grand Summary" : "Results to Date"}
      subtitle={data.completionReady ? "The milestone vault wrap-up." : "The ongoing vault record."}
      eyebrow="Vault Finale"
    >
      <FinaleContent data={data} vaultId={vaultId} />
    </ReportLayout>
  );
}
