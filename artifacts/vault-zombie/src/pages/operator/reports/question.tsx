import { useRoute } from "wouter";
import { useGetQuestionReport } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader, OperatorNote } from "@/components/report/components";
import { OutcomeBadge } from "@/components/report/icons";
import { NumberSpread, OptionSplit } from "@/components/report/charts";
import { LockedReport } from "@/components/report/locked-report";

export default function QuestionReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/questions/:questionId");
  const vaultId = params?.vaultId || "";
  const vaultQuestionId = params?.questionId || "";
  
  const { data, isLoading, error } = useGetQuestionReport(vaultId, vaultQuestionId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Question Detail...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load question detail.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Question Detail"
      subtitle={data.prompt}
      eyebrow="In-depth"
      backUrl={`/operator/vaults/${vaultId}/reports/summary`}
      backLabel="Back to Summary"
    >
      <section className="report-panel">
        <SectionHeader icon="ic-target" title="Outcomes" subtitle="How the room guessed versus reality." />
        
        <div className="space-y-6">
          {data.answerType === "number" && data.outcomes[0]?.trueNumberValue !== undefined && (
            <NumberSpread 
              guesses={data.answers.map(a => a.numberValue!).filter(v => v !== null)}
              actualValue={data.outcomes[0].trueNumberValue!} 
            />
          )}

          {(data.answerType === "multiple_choice" || data.answerType === "name_pick") && (
            <div className="space-y-3">
              {data.optionCounts?.map(oc => {
                return (
                  <OptionSplit 
                    key={oc.optionId} 
                    label={oc.label}
                    isWinner={data.outcomes.some(o => o.trueOptionId === oc.optionId || o.trueTextValue === oc.optionId)} 
                    count={oc.count} 
                    maxCount={Math.max(...(data.optionCounts?.map(o => o.count) || [0]))} 
                  />
                );
              })}
            </div>
          )}

          {data.outcomes.map(o => o.operatorNote && (
            <OperatorNote key={o.revealSlotId} note={o.operatorNote} />
          ))}
        </div>
      </section>

      <section className="report-panel">
        <SectionHeader icon="ic-people" title="Guest Answers" subtitle={`All ${data.answers.length} logged predictions.`} />
        <div className="space-y-0 divide-y divide-hairline">
          {data.answers.map(a => {
            const answerValue = a.optionLabel || a.textValue || (a.numberValue !== null ? String(a.numberValue) : "-");
            return (
              <div key={a.answerId} className="arow py-3 flex gap-3 items-start">
                <div className="shrink-0 flex items-center">
                  {a.outcomeTier ? (
                    <div className="flex items-center gap-1" title={a.outcomeTier.charAt(0).toUpperCase() + a.outcomeTier.slice(1)}>
                      <OutcomeBadge outcome={a.outcomeTier} className="w-5 h-5" />
                      <span className="sr-only">{a.outcomeTier}</span>
                    </div>
                  ) : (
                    <div className="text-[10px] uppercase font-bold text-gray tracking-wider pt-1">
                      {data.freeTextMode === 'keepsake' ? 'Just for fun — no wrong answer' : 'Awaiting outcome'}
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <span className="ap text-ink text-base font-bold">{a.guestDisplayName}</span>
                  <span className="ag text-text-2">{answerValue}</span>
                </div>
              </div>
            );
          })}
          {data.answers.length === 0 && (
            <div className="text-center text-gray py-6 italic">No answers recorded.</div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
