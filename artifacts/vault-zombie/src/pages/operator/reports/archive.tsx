import { useRoute, Link } from "wouter";
import { useGetAnswersArchive } from "@workspace/api-client-react";
import { ReportLayout } from "@/components/report/report-layout";
import { SectionHeader } from "@/components/report/components";
import { OutcomeBadge } from "@/components/report/icons";
import { NumberSpread, OptionSplit } from "@/components/report/charts";
import { OperatorNote } from "@/components/report/components";
import { LockedReport } from "@/components/report/locked-report";

export default function ArchiveReportPage() {
  const [, params] = useRoute("/operator/vaults/:vaultId/reports/archive");
  const vaultId = params?.vaultId || "";
  
  const { data, isLoading, error } = useGetAnswersArchive(vaultId);

  if (isLoading) return <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">Loading Archive...</div>;
  if (error || !data) {
    if ((error as any)?.status === 403) return <LockedReport vaultId={vaultId} />;
    return <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl  font-medium">Failed to load archive.</div>;
  }

  return (
    <ReportLayout 
      vaultId={vaultId}
      title="Answers Archive"
      subtitle="Every scored outcome across the entire vault."
      eyebrow="The Full Record"
      printMode={true}
    >
      <section className="report-panel">
        <SectionHeader icon="ic-lock" title="All Questions" subtitle="Aggregated guesses and outcomes." />
        
        <div className="space-y-8 mt-4">
          {data.questions.map((q) => (
            <div key={q.vaultQuestionId} className="q">
              <Link href={`/operator/vaults/${vaultId}/reports/questions/${q.vaultQuestionId}`} className="q-title hover:text-vault-accent hover:underline transition-colors block">
                {q.prompt}
              </Link>
              <div className="q-meta">{q.answerType.replace('_', ' ').toUpperCase()}</div>
              
              {/* If it's a number question, render spread */}
              {q.answerType === "number" && q.outcomes[0]?.trueNumberValue !== undefined && (
                <NumberSpread 
                  guesses={q.answers.map(a => a.numberValue!).filter(v => v !== null)}
                  actualValue={q.outcomes[0].trueNumberValue!} 
                />
              )}

              {/* If it's multiple choice or name pick, render option split */}
              {(q.answerType === "multiple_choice" || q.answerType === "name_pick") && (
                <div className="mt-4">
                  {q.optionCounts?.map(oc => {
                    return (
                      <OptionSplit 
                        key={oc.optionId} 
                        label={oc.label}
                        isWinner={q.outcomes.some(o => o.trueOptionId === oc.optionId || o.trueTextValue === oc.optionId)} 
                        count={oc.count} 
                        maxCount={Math.max(...(q.optionCounts?.map(o => o.count) || [0]))} 
                      />
                    );
                  })}
                </div>
              )}

              {/* Operator Notes */}
              {q.outcomes.map(o => o.operatorNote && (
                <div key={o.revealSlotId} className="mt-3">
                  <OperatorNote note={o.operatorNote} />
                </div>
              ))}
              
              {/* Every Answer Row */}
              <div className="mt-4 space-y-0 divide-y divide-hairline">
                {q.answers.map(a => {
                  const answerValue = a.optionLabel || a.textValue || (a.numberValue !== null ? String(a.numberValue) : "-");
                  return (
                    <div key={a.answerId} className="arow py-3 flex gap-3 items-start">
                      <div className="shrink-0 flex items-center">
                        {a.outcomeTier ? (
                          <div className="flex items-center gap-1" title={a.outcomeTier.charAt(0).toUpperCase() + a.outcomeTier.slice(1)}>
                            <span className="text-[10px] font-bold text-gray uppercase tracking-widest">{a.outcomeTier}</span>
                            <OutcomeBadge outcome={a.outcomeTier} className="w-5 h-5" />
                            <span className="sr-only">{a.outcomeTier}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] uppercase font-bold text-gray tracking-wider pt-0.5">
                            {q.freeTextMode === "keepsake" ? "Just for fun — no wrong answer" : "Awaiting outcome"}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col pt-0.5">
                        <span className="ap text-ink leading-tight font-bold">{a.guestDisplayName}</span>
                        <span className="ag text-text-2 text-sm">{answerValue}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {data.questions.length === 0 && (
            <div className="text-center text-gray py-8 italic bg-muted/20 rounded-xl">
              No questions resolved yet.
            </div>
          )}
        </div>
      </section>
    </ReportLayout>
  );
}
