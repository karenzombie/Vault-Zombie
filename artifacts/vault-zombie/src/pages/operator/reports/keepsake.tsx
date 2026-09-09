import { useRoute } from "wouter";
import { useGetPrintArchive } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { LockedReport } from "@/components/report/locked-report";
import { FinaleContent } from "@/components/report/finale-content";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function KeepsakeReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/keepsake");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetPrintArchive(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Keepsake...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl font-medium">Failed to load keepsake.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Printable Keepsake"
      subtitle="A permanent record of your vault."
      eyebrow="The Archive"
      printMode={true}
    >
      <div className="print:hidden mb-6 flex justify-end">
        <Button onClick={() => window.print()} className="bg-ink text-primary-foreground hover:bg-ink-2 gap-2">
          <Printer className="w-4 h-4" /> Print Keepsake
        </Button>
      </div>

      <FinaleContent data={data} vaultId={vaultId} />
    </ReportLayout>
  );
}
