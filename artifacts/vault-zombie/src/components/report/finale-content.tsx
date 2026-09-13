import { FinaleReport } from "@workspace/api-client-react";
import { SectionHeader, CertificateFrame, OperatorNote, StatCallout } from "@/components/report/components";
import { OutcomeBadge } from "@/components/report/icons";
import { NumberSpread, OptionSplit, RingGauge, Pictograph, DivergingBar } from "@/components/report/charts";
import { ScoreboardLollipop } from "@/components/report/scoreboard-lollipop";
import { TimelineNode } from "@/components/report/timeline-node";
import { substituteTokens } from "@workspace/shared";

export function FinaleContent({ data, vaultId }: { data: FinaleReport, vaultId: string }) {
  const showCertFrame = data.certificate && data.completionReady;

  return (
    <CertificateFrame showFrame={showCertFrame}>
      {showCertFrame && (
        <>
          <div className="cert-eye mb-2">Vault Finale</div>
          <div className="cert-name">Vault #{vaultId.substring(0, 8)}</div>
          <div className="cert-date">{data.planTier.replace('_', ' ').toUpperCase()} PLAN</div>
        </>
      )}

      <section className={`report-panel ${showCertFrame ? 'border-none bg-transparent mb-0 p-0' : ''}`}>
        <SectionHeader 
          icon="ic-trophy" 
          title={data.completionReady ? "Vault Complete" : "Results to date"} 
          subtitle={data.completionReady ? "All reveals complete." : "Finale opens when all reveals and outcomes are complete."} 
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 mt-6">
          <div className="flex flex-col items-center justify-center p-4 bg-muted/20 border border-border/50 rounded-xl">
            <div className="scale-125 my-4">
              <RingGauge outcomes={data.outcomeCounts} />
            </div>
            <div className="mt-4 font-bold text-ink uppercase tracking-wider text-xs">Total Accuracy</div>
          </div>
          
          <div className="flex flex-col justify-center p-4 bg-muted/20 border border-border/50 rounded-xl gap-4">
             <Pictograph scoreboard={data.scoreboard} />
            <StatCallout 
              icon="ic-people" color="ink" 
              value={data.guestCount} 
              highlight="guests" label="joined the vault" 
            />
            <StatCallout 
              icon="ic-lock" color="bronze" 
              value={data.predictionCount} 
              highlight="predictions" label="locked in" 
            />
          </div>
        </div>

        {data.winner && (
          <div className="mb-8 p-6 bg-muted/20 border border-border/50 rounded-xl">
            <div className="font-bold text-vault-accent uppercase tracking-wider text-sm mb-4 text-center">Grand Winner</div>
            <ScoreboardLollipop 
              rank={1}
              entry={data.winner}
              maxScore={Math.max(...data.scoreboard.map(s => s.total), 0)}
              vaultId={vaultId}
            />
            
            <div className="mt-6 space-y-0 border-t border-border/50 pt-4">
              <div className="font-bold text-gray uppercase tracking-wider text-xs mb-4">Full Leaderboard</div>
              {data.scoreboard.slice(1).map((entry, idx) => (
                <ScoreboardLollipop 
                  key={entry.guestId}
                  rank={idx + 2}
                  entry={entry}
                  maxScore={Math.max(...data.scoreboard.map(s => s.total), 0)}
                  vaultId={vaultId}
                />
              ))}
            </div>
          </div>
        )}

        {data.areas?.areas && data.areas.areas.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon="ic-home" title="By Area of Life" subtitle="Strengths and weaknesses" />
            <div className="space-y-0 mt-4">
              {data.areas.areas.map(area => (
                <DivergingBar 
                  key={area.id}
                  icon={area.iconKey}
                  title={area.name}
                  meta={`${area.outcomes.full} called · ${area.outcomes.half} sort of · ${area.outcomes.zero} missed`}
                  hitCount={area.outcomes.full}
                  missCount={area.outcomes.zero}
                  maxCount={Math.max(...data.areas.areas.map(a => Math.max(a.outcomes.full, a.outcomes.zero)))}
                />
              ))}
            </div>
          </div>
        )}

        {data.timeline?.reveals && data.timeline.reveals.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon="ic-dial" title="Timeline" subtitle="Reveal by reveal accuracy" />
            <div className="timeline mt-4">
              {data.timeline.reveals.map((reveal, idx) => (
                <TimelineNode 
                  key={reveal.revealSlotId}
                  reveal={reveal}
                  isLast={idx === data.timeline.reveals.length - 1}
                />
              ))}
            </div>
          </div>
        )}

        {data.standouts && data.standouts.length > 0 && (
          <div className="mb-8">
            <SectionHeader icon="ic-star" title="Standouts" subtitle="Highlights from the vault" />
            <div className="standouts mt-4">
              {data.standouts.map((so) => (
                <div key={so.vaultQuestionId} className="so-card">
                  <div className={`so-tag ${so.outcomeTier === 'full' ? 'hit' : 'miss'}`}>
                    <OutcomeBadge outcome={so.outcomeTier} className="w-4 h-4" /> 
                    {so.outcomeTier === 'full' ? 'Nailed it' : 'Missed it'}
                  </div>
                  <div className="so-pr text-ink font-medium leading-tight">{substituteTokens(so.prompt, { subjectValues: data.vaultSubjectValues, revealDate: so.revealDate })}</div>
                  {so.operatorNote && (
                    <div className="mt-3">
                      <OperatorNote note={so.operatorNote} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="space-y-6 mt-12 border-t-2 border-ink pt-8">
          <SectionHeader icon="ic-lock" title="The Archive" subtitle="Full breakdown of all answers." />
          
          {data.questions.map((q) => (
            <div key={q.vaultQuestionId} className="q border-t border-hairline pt-4">
              <div className="q-title font-bold text-lg text-ink">{substituteTokens(q.prompt, { subjectValues: data.vaultSubjectValues })}</div>
              <div className="q-meta text-xs text-gray uppercase tracking-wider mt-1">{q.answerType.replace('_', ' ')}</div>

              {q.answerType === "number" && q.outcomes[0]?.trueNumberValue !== undefined && (
                <NumberSpread 
                  guesses={q.answers.map(a => a.numberValue!).filter(v => v !== null)}
                  actualValue={q.outcomes[0].trueNumberValue!} 
                />
              )}

              {(q.answerType === "multiple_choice" || q.answerType === "name_pick") && (
                <div className="mt-3">
                  {q.optionCounts?.map(oc => {
                    return (
                      <OptionSplit 
                        key={oc.optionId} 
                        label={substituteTokens(oc.label, { subjectValues: data.vaultSubjectValues })}
                        isWinner={q.outcomes.some(o => o.trueOptionId === oc.optionId || o.trueTextValue === oc.optionId)} 
                        count={oc.count} 
                        maxCount={Math.max(...(q.optionCounts?.map(o => o.count) || [0]))} 
                      />
                    );
                  })}
                </div>
              )}

              {q.outcomes.map(o => o.operatorNote && (
                <div key={o.revealSlotId} className="mt-3">
                  <OperatorNote note={o.operatorNote} />
                </div>
              ))}

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
    </CertificateFrame>
  );
}