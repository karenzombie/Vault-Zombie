import { useRoute } from "wouter";
import { useGetRevealReport, useListUnlockedRevealWork } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader } from "@/components/report/components";
import { QuestionResolver } from "../question-resolver";

export default function RevealReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/reveals/:revealSlotId");
  const vaultId = params?.vaultId || "";
  const revealSlotId = params?.revealSlotId || "";
  
  const { data, isLoading, error } = useGetRevealReport(vaultId, revealSlotId);
  const { data: revealWorkData } = useListUnlockedRevealWork(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Reveal...</div>;
  if (error || !data) return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load reveal report.</div>;

  // We need to find matching questions in `useListUnlockedRevealWork` to render `QuestionResolver`
  const revealWorkQuestions = revealWorkData?.questions.filter(q => q.revealSlotId === revealSlotId) || [];

  return (
    <ReportLayout 
      vaultId={vaultId}
      title={data.label}
      subtitle={`Revealed ${new Date(data.revealDate).toLocaleDateString()}`}
      eyebrow="Live Reveal"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-dial" title="Resolutions" subtitle="Mark outcomes for this drop." />
        
        <div className="space-y-6 mt-6">
          {revealWorkQuestions.map((q) => (
            <QuestionResolver key={q.vaultQuestionId} question={q} vaultId={vaultId} />
          ))}
          {revealWorkQuestions.length === 0 && (
            <div className="text-center text-gray py-8 italic bg-muted/20 rounded-xl">
              No questions found for this reveal drop.
            </div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
