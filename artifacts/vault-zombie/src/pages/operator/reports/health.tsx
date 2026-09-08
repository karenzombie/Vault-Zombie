import { useRoute } from "wouter";
import { useGetVaultHealthReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader, StatCallout } from "@/components/report/components";

export default function HealthReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/health");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetVaultHealthReport(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Health Dashboard...</div>;
  if (error || !data) return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load health report.</div>;

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Health Dashboard"
      subtitle={`${data.planTier.replace('_', ' ').toUpperCase()} TIER · Status: ${data.status}`}
      eyebrow="Vault Metadata"
      sealOpen={false}
    >
      <section className="report-panel">
        <SectionHeader icon="ic-target" title="Vault Status" subtitle="Overview of participation and completion." />
        <div className="callouts">
          <StatCallout 
            icon="ic-lock" color="ink" 
            value={data.predictionCount} 
            highlight="predictions" label="sealed total" 
          />
          <StatCallout 
            icon="ic-people" color="bronze" 
            value={data.guestCount} 
            highlight="guests" label="participated" 
          />
        </div>
      </section>

      <section className="report-panel">
        <SectionHeader icon="ic-dial" title="Schedule Progress" subtitle="The timeline of drops." />
        <div className="callouts">
          <StatCallout 
            icon="ic-check" color="hit" 
            value={data.completedRevealCount} 
            highlight="reveals" label="completed" 
          />
          <StatCallout 
            icon="ic-dial" color="bronze" 
            value={data.revealSlots.length - data.completedRevealCount} 
            highlight="reveals" label={`remaining ${data.nextRevealDate ? `(Next: ${new Date(data.nextRevealDate).toLocaleDateString()})` : ''}`} 
          />
        </div>
      </section>

      {data.guestCount > 0 && (
        <section className="report-panel">
          <SectionHeader icon="ic-people" title="The room" subtitle={`${data.guestCount} guests joined the vault.`} />
          <div className="picto" aria-label={`${data.guestCount} guests`}>
            {Array.from({ length: data.guestCount }).map((_, i) => (
              <span key={i} className="person-icon" style={{ color: "var(--hairline)" }}>
                <svg viewBox="0 0 20 26"><use href="#ic-person-fill"/></svg>
              </span>
            ))}
          </div>
        </section>
      )}
      
      <div className="text-sm text-center text-gray mt-4 bg-muted/30 p-4 rounded-xl border border-border/50">
        This is an operator-only dashboard. It shows metadata and counts only; no answer content is ever exposed here.
      </div>
    </ReportLayout>
  );
}
