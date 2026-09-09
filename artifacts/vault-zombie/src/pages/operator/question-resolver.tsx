import { useForm } from "react-hook-form";
import { 
  RevealQuestionWork, 
  useResolveRevealQuestionOutcome,
  useOverrideRevealTextClusterVerdict,
  getListUnlockedRevealWorkQueryKey
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";

export function QuestionResolver({ question, vaultId }: { question: RevealQuestionWork; vaultId: string }) {
  const resolveOutcome = useResolveRevealQuestionOutcome();
  const queryClient = useQueryClient();
  
  const form = useForm({
    defaultValues: {
      trueNumberValue: question.trueNumberValue ?? "",
      trueTextValue: question.trueTextValue ?? "",
      trueOptionId: question.trueOptionId ?? "",
      operatorNote: question.operatorNote ?? "",
    }
  });

  const onSubmit = (data: any) => {
    resolveOutcome.mutate({
      vaultId,
      revealSlotId: question.revealSlotId,
      vaultQuestionId: question.vaultQuestionId,
      data: {
        trueNumberValue: data.trueNumberValue !== "" && data.trueNumberValue != null ? Number(data.trueNumberValue) : null,
        trueTextValue: data.trueTextValue || null,
        trueOptionId: data.trueOptionId || null,
        operatorNote: data.operatorNote || null,
      }
    }, {
      onSuccess: () => {
        // optimistically update cache
        queryClient.setQueryData(getListUnlockedRevealWorkQueryKey(vaultId), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            questions: old.questions.map((q: RevealQuestionWork) => 
              q.vaultQuestionId === question.vaultQuestionId 
                ? { ...q, ...data } 
                : q
            )
          };
        });
      }
    });
  };

  const isResolved = question.trueNumberValue !== null || question.trueTextValue !== null || question.trueOptionId !== null;
  // For free text scoreable, it might just be cluster verdicts and operator note.
  const isFreeTextScoreable = question.answerType === "free_text" && question.freeTextMode === "scoreable";
  const isKeepsake = question.answerType === "free_text" && question.freeTextMode === "keepsake";

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-5 transition-all hover-elevate">
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[22px] text-ink leading-tight">{question.prompt}</h3>
          {isResolved && <CheckCircle2 className="w-6 h-6 text-ok shrink-0 mt-0.5" />}
        </div>
        <div className="text-[11px] font-bold text-bronze uppercase tracking-widest">
          {question.answerType.replace('_', ' ')} {isKeepsake && "· Keepsake"}
        </div>
      </div>

      {isKeepsake ? (
        <div className="space-y-3 pt-2">
          <div className="bg-bronze-wash/50 p-3 rounded-lg border border-bronze/10">
            <p className="text-[13px] text-bronze font-medium leading-relaxed">
              Keepsakes are shown just for fun and are never scored. Share the best ones with the room!
            </p>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {question.answers.map((a) => (
              <div key={a.answerId} className="bg-muted/40 p-3 rounded-lg text-[15px] border border-border/50 flex flex-col gap-1">
                <span className="font-bold text-ink text-sm">{a.guestDisplayName}</span>
                <span className="text-text-2 leading-relaxed">{a.textValue}</span>
              </div>
            ))}
            {question.answers.length === 0 && (
              <div className="text-sm text-gray text-center py-4 italic">No guest answers submitted.</div>
            )}
          </div>
        </div>
      ) : isFreeTextScoreable ? (
        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            {question.clusters.map(cluster => (
              <ClusterVerdictRow 
                key={cluster.key} 
                cluster={cluster} 
                vaultId={vaultId} 
                revealSlotId={question.revealSlotId} 
                vaultQuestionId={question.vaultQuestionId} 
              />
            ))}
            {question.clusters.length === 0 && (
              <div className="text-sm text-gray text-center py-4 bg-muted/30 rounded-lg border border-border/50">No answers to score.</div>
            )}
          </div>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4 border-t border-border">
             <div className="space-y-2">
               <Label className="text-ink font-bold text-sm">Host Note (Optional)</Label>
               <Textarea {...form.register("operatorNote")} placeholder="Add context for the room..." className="resize-none h-20 bg-muted/20" />
             </div>
             <Button type="submit" disabled={resolveOutcome.isPending} className="w-full bg-ink text-primary-foreground hover:bg-ink-2 py-6 text-base font-bold shadow-sm active:scale-[0.98] transition-transform">
                {resolveOutcome.isPending ? "Saving..." : "Save Note & Finish"}
             </Button>
          </form>
        </div>
      ) : (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {question.answerType === "number" && (
            <div className="space-y-2">
              <Label className="text-ink font-bold text-sm">Correct Number</Label>
              <Input type="number" step="any" {...form.register("trueNumberValue")} placeholder="e.g. 42" className="text-lg py-6 bg-muted/20" />
            </div>
          )}

          {question.answerType === "name_pick" && (
            <div className="space-y-2">
              <Label className="text-ink font-bold text-sm">Correct Name</Label>
              <Input {...form.register("trueTextValue")} placeholder="e.g. John Doe" className="text-lg py-6 bg-muted/20" />
            </div>
          )}

          {question.answerType === "multiple_choice" && (
            <div className="space-y-3">
              <Label className="text-ink font-bold text-sm">Winning Option</Label>
              <RadioGroup 
                value={form.watch("trueOptionId")} 
                onValueChange={(val) => form.setValue("trueOptionId", val)}
                className="space-y-2 mt-1"
              >
                {Array.from(
                  new Map(
                    question.answers
                      .filter((a) => a.optionId)
                      .map((a) => [a.optionId, a.textValue])
                  ).entries()
                ).map(([id, label]) => (
                  <div key={id as string} className="flex items-center space-x-3 bg-muted/30 hover:bg-muted/60 transition-colors p-3.5 rounded-lg border border-border/60">
                    <RadioGroupItem value={id as string} id={`opt-${id}`} className="w-5 h-5 text-pop" />
                    <Label htmlFor={`opt-${id}`} className="flex-1 cursor-pointer text-base font-medium text-ink leading-none">{label as string}</Label>
                  </div>
                ))}
              </RadioGroup>
              {question.answers.filter((a) => a.optionId).length === 0 && (
                <div className="text-sm text-gray py-4 text-center bg-muted/30 rounded-lg border border-border/50">No options selected by guests.</div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <Label className="text-ink font-bold text-sm">Host Note (Optional)</Label>
            <Textarea {...form.register("operatorNote")} placeholder="Add context for the room..." className="resize-none h-20 bg-muted/20" />
          </div>

          <Button type="submit" disabled={resolveOutcome.isPending} className="w-full bg-ink text-primary-foreground hover:bg-ink-2 py-6 text-base font-bold shadow-sm active:scale-[0.98] transition-transform">
             {resolveOutcome.isPending ? "Saving..." : (isResolved ? "Update Outcome" : "Resolve Outcome")}
          </Button>
        </form>
      )}
    </div>
  );
}

function ClusterVerdictRow({ cluster, vaultId, revealSlotId, vaultQuestionId }: any) {
  const override = useOverrideRevealTextClusterVerdict();
  const queryClient = useQueryClient();
  
  const currentTier = cluster.confirmedTier || cluster.suggestedTier || "zero";
  
  const handleTier = (tier: string) => {
    if (tier === currentTier) return;
    
    override.mutate({
      vaultId, 
      revealSlotId, 
      vaultQuestionId, 
      clusterKey: cluster.key,
      data: { tier: tier as any }
    }, {
      onSuccess: () => {
        queryClient.setQueryData(getListUnlockedRevealWorkQueryKey(vaultId), (old: any) => {
          if (!old) return old;
          return {
            ...old,
            questions: old.questions.map((q: any) => {
              if (q.vaultQuestionId !== vaultQuestionId) return q;
              return {
                ...q,
                clusters: q.clusters.map((c: any) => {
                  if (c.key !== cluster.key) return c;
                  return { ...c, confirmedTier: tier };
                })
              };
            })
          };
        });
      }
    });
  };

  return (
    <div className="flex flex-col gap-3 p-3.5 border border-border bg-muted/20 rounded-xl shadow-sm">
      <div className="flex items-start justify-between">
        <div className="font-bold text-ink text-[15px] leading-tight max-w-[70%]">{cluster.normalizedValue || "(Empty)"}</div>
        <div className="text-[11px] font-bold text-bronze uppercase tracking-widest bg-bronze-wash/50 px-2 py-1 rounded-full whitespace-nowrap">
          {cluster.answerCount} answer{cluster.answerCount !== 1 && 's'}
        </div>
      </div>
      <div className="flex p-1 bg-white border border-border rounded-lg shadow-sm w-full">
        <button 
          type="button"
          onClick={() => handleTier("full")}
          className={`flex-1 px-3 py-2 text-[13px] font-bold rounded-md transition-all ${currentTier === 'full' ? 'bg-ok text-ok-tint shadow-sm' : 'text-text-2 hover:bg-muted'}`}
        >
          Full
        </button>
        <button 
          type="button"
          onClick={() => handleTier("half")}
          className={`flex-1 px-3 py-2 text-[13px] font-bold rounded-md transition-all ${currentTier === 'half' ? 'bg-brass text-ink shadow-sm' : 'text-text-2 hover:bg-muted'}`}
        >
          Half
        </button>
        <button 
          type="button"
          onClick={() => handleTier("zero")}
          className={`flex-1 px-3 py-2 text-[13px] font-bold rounded-md transition-all ${currentTier === 'zero' ? 'bg-ink text-primary-foreground shadow-sm' : 'text-text-2 hover:bg-muted'}`}
        >
          Zero
        </button>
      </div>
    </div>
  );
}
