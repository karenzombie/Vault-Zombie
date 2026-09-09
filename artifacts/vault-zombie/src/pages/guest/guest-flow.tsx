import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useGetGuestVault, useSubmitGuestPrediction } from "@workspace/api-client-react";
import { useGuestDraft } from "@/hooks/use-guest-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { GuestAnswerInput, GuestQuestion, GuestTiming } from "@workspace/api-client-react";

export default function GuestFlow() {
  const { token } = useParams<{ token: string }>();
  const { data: vault, isLoading, error } = useGetGuestVault(token || "");

  const [phase, setPhase] = useState<"landing" | "answer" | "confirm" | "success">("landing");
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [successUrl, setSuccessUrl] = useState("/");
  const draftKey = `vault_zombie_draft_${token}`;

  const hasUnsavedAnswers = () => {
    try {
      const stored = localStorage.getItem(draftKey);
      return stored ? Object.keys(JSON.parse(stored).answers ?? {}).length > 0 : false;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (phase !== "success" && hasUnsavedAnswers()) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [phase, draftKey]);

  const leaveForHome = () => {
    if (phase !== "success" && hasUnsavedAnswers()) setShowLeaveConfirm(true);
    else window.location.assign("/");
  };
  
  if (isLoading) {
    return <div className="min-h-[100dvh] flex items-center justify-center bg-background"><div className="text-gray">Loading vault...</div></div>;
  }
  
  if (error || !vault) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-ink mb-4">Vault Not Found</h1>
          <p className="text-muted-foreground">This vault might be closed or the link is incorrect.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-ink sm:bg-background flex items-center justify-center sm:py-10">
      <div className="w-full sm:w-[400px] min-h-[100dvh] sm:min-h-[700px] bg-background sm:rounded-[32px] sm:shadow-[0_40px_80px_-30px_rgba(28,27,25,0.6)] sm:border sm:border-[#2a2825] flex flex-col relative overflow-hidden">
        
        {/* Top Bar */}
        <button type="button" onClick={leaveForHome} className="bg-ink text-primary-foreground p-4 flex items-center gap-3 shrink-0 text-left">
          <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-16 w-auto shrink-0" />
          <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-16 w-auto shrink-0" />
          <div className="ml-auto max-w-24 text-right text-[13px] font-bold leading-tight">{vault.name}</div>
        </button>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 pb-24">
          {phase === "landing" && (
            <LandingPhase vault={vault} onStart={() => setPhase("answer")} />
          )}
          {phase === "answer" && (
            <AnswerPhase token={token!} vault={vault} onFinish={() => setPhase("confirm")} />
          )}
          {phase === "confirm" && (
            <ConfirmPhase token={token!} vault={vault} onBack={() => setPhase("answer")} onSuccess={(url) => { setSuccessUrl(url); setPhase("success"); }} />
          )}
          {phase === "success" && (
            <SuccessPhase vault={vault} createVaultUrl={successUrl} />
          )}
        </div>
      </div>
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 bg-ink/70 p-5 flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="leave-title">
          <div className="w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl">
            <h2 id="leave-title" className="text-xl font-bold text-ink">Leave your unfinished guesses?</h2>
            <p className="mt-3 text-text-2">Your answers are saved on this device, but they are not sealed yet.</p>
            <div className="mt-6 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowLeaveConfirm(false)}>Keep guessing</Button>
              <Button variant="pop" className="flex-1" onClick={() => window.location.assign("/")}>Leave</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LandingPhase({ vault, onStart }: { vault: any, onStart: () => void }) {
  return (
    <div className="text-center mt-2 flex flex-col h-full">
      <div className="w-[82px] h-[82px] rounded-full bg-pop-tint flex items-center justify-center mx-auto mt-4 mb-4 shadow-sm">
        <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" className="w-10 h-10 text-pop">
          <circle cx="26" cy="38" r="14"/><circle cx="40" cy="38" r="14"/><path d="M22 16l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <div className="font-script text-3xl text-pop mt-4">you're invited to guess!</div>
      <h1 className="text-[28px] font-bold tracking-tight mt-2 leading-[1.1] text-ink font-sans">
        {vault.name}
      </h1>
      <p className="text-text-2 mt-4 text-[16px] leading-relaxed px-2">
        Guess what the years ahead hold. Your answers seal right away and unlock over time, so everyone sees who knew them best.
      </p>
      
      <div className="bg-bronze-wash rounded-xl p-5 mt-8 flex justify-around shadow-inner border border-hairline">
        <div>
          <div className="font-display text-[26px] text-ink leading-none">{vault.questions.length}</div>
          <div className="text-[13px] text-gray mt-1.5 font-medium">prompts</div>
        </div>
        <div>
          <div className="font-display text-[26px] text-ink leading-none">~{Math.max(1, Math.round(vault.questions.length * 0.5))}m</div>
          <div className="text-[13px] text-gray mt-1.5 font-medium">to fill in</div>
        </div>
        <div>
          <div className="font-display text-[26px] text-ink leading-none">0</div>
          <div className="text-[13px] text-gray mt-1.5 font-medium">sign-ups</div>
        </div>
      </div>

      <div className="mt-auto pt-10 pb-4">
        <Button variant="pop" size="lg" className="w-full text-lg shadow-lg shadow-pop/30" onClick={onStart}>
          Seal a prediction
        </Button>
        <p className="text-[13px] text-gray mt-4 font-medium">
          No app and no account. Just you and your guesses.
        </p>
      </div>
    </div>
  );
}

function AnswerPhase({ token, vault, onFinish }: { token: string, vault: any, onFinish: () => void }) {
  const { draft, saveDraft } = useGuestDraft(token);
  const questions = vault.questions || [];
  
  if (vault.layout === "all_prompts") {
    return <AllPromptsLayout questions={questions} timings={vault.timings} draft={draft} saveDraft={saveDraft} onFinish={onFinish} />;
  }
  
  return <OneAtATimeLayout questions={questions} timings={vault.timings} draft={draft} saveDraft={saveDraft} onFinish={onFinish} />;
}

function OneAtATimeLayout({ questions, timings, draft, saveDraft, onFinish }: any) {
  const currentIndex = draft.stepIndex || 0;
  const question = questions[currentIndex];
  
  const currentAnswer = draft.answers[question.id] || {
    vaultQuestionId: question.id,
    revealSlotId: timings[0]?.id,
    answerType: question.answerType,
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      saveDraft({ stepIndex: currentIndex + 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      onFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      saveDraft({ stepIndex: currentIndex - 1 });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const updateAnswer = (updates: Partial<GuestAnswerInput>) => {
    saveDraft({
      answers: {
        ...draft.answers,
        [question.id]: { ...currentAnswer, ...updates }
      }
    });
  };

  const progress = ((currentIndex) / questions.length) * 100;

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex justify-between items-center px-1">
        <span className="text-[13px] text-gray font-medium tracking-wide uppercase">Prompt {currentIndex + 1} of {questions.length}</span>
        <button onClick={handleNext} className="text-[13.5px] text-pop font-bold hover:text-pop-dk transition-colors">Skip</button>
      </div>
      <div className="h-[6px] bg-bronze-wash rounded-full mt-3 overflow-hidden shadow-inner">
        <div className="h-full bg-pop transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      <h2 className="text-[24px] font-bold leading-[1.25] mt-8 text-ink px-1">
        {question.prompt}
      </h2>

      <div className="mt-8 flex-1 px-1">
        <QuestionInput question={question} value={currentAnswer} onChange={updateAnswer} />
        
        {timings && timings.length > 0 && (
          <div className="mt-10">
            <div className="font-semibold text-[15.5px] mb-3.5 text-ink">When should this unlock?</div>
            <div className="grid grid-cols-3 gap-2.5">
              {timings.map((t: GuestTiming) => (
                <button 
                  key={t.id}
                  onClick={() => updateAnswer({ revealSlotId: t.id })}
                  className={`px-2 py-3 text-[14px] rounded-lg font-semibold transition-all duration-200 border ${
                    currentAnswer.revealSlotId === t.id 
                      ? "bg-pop text-[#FFF7F2] border-pop shadow-md shadow-pop/20 scale-[1.02]" 
                      : "bg-white text-ink border-hairline hover:bg-bronze-wash hover:border-[#D8C9A9]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-12 flex gap-3 pb-2">
        <Button variant="secondary" onClick={handleBack} disabled={currentIndex === 0} className="w-[100px]">Back</Button>
        <Button variant="pop" className="flex-1 text-[16px] shadow-md shadow-pop/20" onClick={handleNext}>
          {currentIndex === questions.length - 1 ? "Finish" : "Next prompt"}
          {currentIndex < questions.length - 1 && (
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] ml-2" fill="none" stroke="currentColor" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6"/></svg>
          )}
        </Button>
      </div>
    </div>
  );
}

function AllPromptsLayout({ questions, timings, draft, saveDraft, onFinish }: any) {
  const updateAnswer = (qId: string, qType: string, updates: Partial<GuestAnswerInput>) => {
    const current = draft.answers[qId] || {
      vaultQuestionId: qId,
      revealSlotId: timings[0]?.id,
      answerType: qType,
    };
    saveDraft({
      answers: {
        ...draft.answers,
        [qId]: { ...current, ...updates }
      }
    });
  };

  return (
    <div className="flex flex-col pb-8 animate-in fade-in duration-300">
      <h2 className="text-[26px] font-bold mb-2">All Prompts</h2>
      <p className="text-text-2 mb-8 text-[15px]">Fill in as many as you'd like. Leave blank to skip.</p>
      
      <div className="flex flex-col gap-8">
        {questions.map((question: GuestQuestion, i: number) => {
          const currentAnswer = draft.answers[question.id] || {
            vaultQuestionId: question.id,
            revealSlotId: timings[0]?.id,
            answerType: question.answerType,
          };
          
          return (
            <div key={question.id} className="bg-white p-6 rounded-[16px] border border-hairline shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-bronze-wash"></div>
              <div className="text-[11px] font-bold text-pop uppercase tracking-wider mb-2">Prompt {i+1}</div>
              <h3 className="text-[18px] font-bold leading-snug mb-5">{question.prompt}</h3>
              
              <QuestionInput question={question} value={currentAnswer} onChange={(u) => updateAnswer(question.id, question.answerType, u)} />
              
              {timings && timings.length > 0 && (
                <div className="mt-6 pt-5 border-t border-hairline/60">
                  <div className="text-[13px] font-semibold text-gray mb-3">Unlock timing</div>
                  <div className="flex flex-wrap gap-2">
                    {timings.map((t: GuestTiming) => (
                      <button 
                        key={t.id}
                        onClick={() => updateAnswer(question.id, question.answerType, { revealSlotId: t.id })}
                        className={`px-3 py-1.5 text-[13px] rounded-md font-semibold transition-colors border ${
                          currentAnswer.revealSlotId === t.id 
                            ? "bg-pop text-[#FFF7F2] border-pop" 
                            : "bg-background text-text-2 border-hairline hover:bg-bronze-wash"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-12">
        <Button variant="pop" size="lg" className="w-full text-[17px] shadow-lg shadow-pop/30 h-14" onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); onFinish(); }}>
          Review & Seal
        </Button>
      </div>
    </div>
  );
}

function QuestionInput({ question, value, onChange }: { question: GuestQuestion, value: any, onChange: (v: any) => void }) {
  if (question.answerType === "free_text" || question.answerType === "name_pick") {
    return (
      <Input 
        className="text-[18px] py-6 px-4 bg-background border-hairline focus:border-pop shadow-inner" 
        placeholder="Your answer" 
        value={value.textValue || ""} 
        onChange={e => onChange({ textValue: e.target.value })} 
      />
    );
  }
  
  if (question.answerType === "number") {
    return (
      <div>
        <Input 
          type="number"
          className="text-[24px] font-display tracking-wide text-center py-6 bg-background shadow-inner" 
          placeholder="0" 
          value={value.numberValue || ""} 
          onChange={e => onChange({ numberValue: e.target.value ? Number(e.target.value) : null })} 
        />
        {(question.numberMinimum !== undefined || question.numberMaximum !== undefined) && (
          <p className="text-[12.5px] text-gray mt-2.5 text-center font-medium">
            {question.numberMinimum !== undefined ? `Min: ${question.numberMinimum}` : ''}
            {question.numberMinimum !== undefined && question.numberMaximum !== undefined ? ' - ' : ''}
            {question.numberMaximum !== undefined ? `Max: ${question.numberMaximum}` : ''}
          </p>
        )}
      </div>
    );
  }

  if (question.answerType === "multiple_choice") {
    return (
      <div className="flex flex-col gap-2.5">
        {question.options?.map(opt => (
          <label key={opt.id} className={`flex items-center gap-3.5 p-4 rounded-xl border-2 cursor-pointer transition-all ${value.optionId === opt.id ? 'border-pop bg-pop-tint/30 scale-[1.01] shadow-sm' : 'border-hairline bg-white hover:bg-background'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${value.optionId === opt.id ? 'border-pop' : 'border-gray'}`}>
              {value.optionId === opt.id && <div className="w-2.5 h-2.5 bg-pop rounded-full" />}
            </div>
            <span className="text-[16px] font-semibold text-ink">{opt.label}</span>
          </label>
        ))}
      </div>
    );
  }

  return null;
}

function ConfirmPhase({ token, vault, onBack, onSuccess }: { token: string, vault: any, onBack: () => void, onSuccess: (url: string) => void }) {
  const { draft, saveDraft, clearDraft } = useGuestDraft(token);
  const submitMutation = useSubmitGuestPrediction();
  const [error, setError] = useState("");

  const answeredCount = Object.keys(draft.answers).filter(k => {
    const a = draft.answers[k];
    return a.textValue || a.numberValue !== undefined || a.optionId;
  }).length;

  const handleSubmit = async () => {
    if (!draft.displayName.trim()) {
      setError("Please enter your name so they know who made these guesses.");
      return;
    }
    setError("");

    const answersArray = Object.values(draft.answers).filter(a => 
      a.textValue || a.numberValue !== undefined || a.optionId
    ) as GuestAnswerInput[];

    if (answersArray.length === 0) {
      setError("Please answer at least one question before sealing.");
      return;
    }

    try {
      const confirmation = await submitMutation.mutateAsync({
        token,
        data: {
          displayName: draft.displayName,
          email: draft.email || null,
          emailOptedOut: draft.emailOptedOut,
          answers: answersArray
        }
      });
      clearDraft();
      onSuccess(confirmation.createVaultUrl);
    } catch (e: any) {
      setError("Something went wrong saving your predictions. Please try again.");
    }
  };

  return (
    <div className="flex flex-col h-full pt-4 animate-in slide-in-from-right-4 duration-300">
      <div className="text-center px-2">
        <div className="w-[96px] h-[96px] rounded-full bg-ink flex items-center justify-center mx-auto shadow-xl shadow-ink/20">
          <svg viewBox="0 0 24 24" className="w-11 h-11 stroke-brass fill-none stroke-[1.6]" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
        </div>
        <div className="font-script text-[32px] text-pop mt-6 leading-none transform -rotate-2">ready to seal?</div>
        <h1 className="text-[26px] font-bold mt-4 leading-tight">
          {answeredCount} guesses locked away.
        </h1>
        <p className="text-text-2 mt-4 text-[15.5px] leading-relaxed">
          We just need your name to mark them. Leave your email if you want to know the moment each one unlocks.
        </p>
      </div>

      <div className="mt-10 space-y-6 px-1">
        <div>
          <label className="block text-[14px] font-bold text-text-2 mb-2 uppercase tracking-wide">Your Name</label>
          <Input 
            className="h-14 text-[16px] bg-white"
            placeholder="Jane Doe" 
            value={draft.displayName} 
            onChange={e => { setError(""); saveDraft({ displayName: e.target.value }); }} 
          />
        </div>
        <div>
          <label className="block text-[14px] font-bold text-text-2 mb-2 uppercase tracking-wide">Email (Optional)</label>
          <Input 
            type="email"
            className="h-14 text-[16px] bg-white"
            placeholder="you@email.com" 
            value={draft.email} 
            onChange={e => saveDraft({ email: e.target.value })} 
          />
          <label className="flex items-start gap-3 mt-4 text-[13.5px] text-text-2 cursor-pointer p-3 bg-bronze-wash/50 rounded-lg">
            <input 
              type="checkbox" 
              className="mt-[3px] w-[18px] h-[18px] accent-pop shrink-0 cursor-pointer" 
              checked={!draft.emailOptedOut}
              onChange={e => saveDraft({ emailOptedOut: !e.target.checked })}
            />
            <span className="leading-snug">
              Email me when my predictions unlock and when the outcome is in. <span className="text-gray font-medium">Skip this and you won't hear how they turned out.</span>
            </span>
          </label>
        </div>
      </div>

      {error && <div className="mt-6 mx-1 p-4 bg-destructive/10 text-destructive text-[14.5px] font-medium rounded-lg border border-destructive/20 text-center animate-in shake">{error}</div>}

      <div className="mt-auto pt-10 flex gap-3">
        <Button variant="secondary" onClick={onBack} disabled={submitMutation.isPending} className="w-[100px] h-14">Edit</Button>
        <Button variant="pop" className="flex-1 text-[17px] h-14 shadow-lg shadow-pop/30" onClick={handleSubmit} disabled={submitMutation.isPending}>
          {submitMutation.isPending ? "Sealing..." : "Seal My Guesses"}
        </Button>
      </div>
    </div>
  );
}

function SuccessPhase({ vault, createVaultUrl }: { vault: any, createVaultUrl: string }) {
  return (
    <div className="flex flex-col h-full pt-12 text-center animate-in zoom-in-95 duration-500">
      <div className="w-[100px] h-[100px] rounded-full bg-ok flex items-center justify-center mx-auto mb-8 shadow-xl shadow-ok/20">
        <svg viewBox="0 0 24 24" className="w-12 h-12 stroke-white fill-none stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      </div>
      <h1 className="font-display text-[32px] font-bold text-ink leading-tight tracking-tight">Sealed!</h1>
      <p className="text-text-2 mt-5 text-[17px] leading-relaxed max-w-[280px] mx-auto">
        Your guesses are locked in the vault. We'll be in touch when it's time to reveal them.
      </p>

      <div className="mt-14 pt-8 border-t border-hairline/60 bg-white shadow-sm rounded-2xl p-8 border border-hairline text-left relative overflow-hidden">
        <div className="absolute -right-4 -top-4 w-16 h-16 bg-pop-tint rounded-full opacity-50"></div>
        <div className="font-script text-[28px] text-pop leading-none mb-2">your turn?</div>
        <p className="text-text-2 text-[15px] mt-3 mb-6 leading-relaxed">
          Got a wedding, a baby, or a big year coming? Start a vault of your own and invite friends to guess.
        </p>
        <a href={createVaultUrl} className={cn(buttonVariants({ variant: "secondary" }), "w-full h-12 border-[#D8C9A9] text-bronze font-bold hover:bg-bronze-wash flex items-center justify-center")}>
          Create your own Vault
        </a>
      </div>
    </div>
  );
}
