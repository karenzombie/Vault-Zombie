import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useListUnlockedRevealWork } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

import { QuestionResolver } from "./question-resolver";
import { OperatorScoreboard } from "./operator-scoreboard";

export default function OperatorPage() {
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const vaultId = searchParams.get("vaultId");
  
  if (!vaultId) {
    return <VaultIdPrompt />;
  }

  return <OperatorReveal vaultId={vaultId} />;
}

function VaultIdPrompt() {
  const [, setLocation] = useLocation();
  const [val, setVal] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (val.trim()) {
      setLocation(`/operator?vaultId=${encodeURIComponent(val.trim())}`);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-20 w-auto mx-auto mb-6" />
          <h1 className="font-display text-4xl text-ink">Operator Login</h1>
          <p className="text-muted-foreground mt-3 text-lg leading-relaxed">Enter the Vault ID to access the live reveal surface.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            placeholder="Vault ID..." 
            value={val} 
            onChange={(e) => setVal(e.target.value)} 
            className="text-center text-xl py-7 font-mono bg-white border-hairline shadow-sm focus-visible:ring-pop focus-visible:border-pop"
            autoFocus
          />
          <Button type="submit" className="w-full py-7 text-lg font-bold bg-ink text-[hsl(var(--brass-lt))] hover:bg-ink-2 shadow-md transition-all active:scale-[0.98]">
            Open Control Surface
          </Button>
        </form>
      </div>
    </div>
  );
}

function OperatorReveal({ vaultId }: { vaultId: string }) {
  const { data: revealData, isLoading: isRevealLoading, error: revealError } = useListUnlockedRevealWork(vaultId);
  
  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 bg-ink text-parchment sticky top-0 z-20 shadow-md">
        <Link href="/">
          <img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-7 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" />
        </Link>
        <div className="text-[11px] font-bold tracking-widest text-brass uppercase bg-white/10 px-3 py-1.5 rounded-full">
          Live Operator
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-lg mx-auto p-4 flex flex-col pt-6">
        <Tabs defaultValue="reveal" className="w-full">
          <TabsList className="w-full grid grid-cols-2 mb-8 bg-muted p-1 border border-border/50">
            <TabsTrigger value="reveal" className="text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm">Live Reveal</TabsTrigger>
            <TabsTrigger value="scoreboard" className="text-base font-bold py-2.5 data-[state=active]:bg-white data-[state=active]:text-ink data-[state=active]:shadow-sm">Scoreboard</TabsTrigger>
          </TabsList>
          
          <TabsContent value="reveal" className="space-y-6 pb-24 focus-visible:outline-none">
            {isRevealLoading && (
              <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
                Loading reveal work...
              </div>
            )}
            
            {revealError && (
              <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl shadow-sm font-medium">
                Failed to load reveal data. Check the Vault ID.
              </div>
            )}
            
            {revealData?.questions?.length === 0 && (
              <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
                <Inbox className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
                <div className="font-bold text-ink text-lg">No unlocked questions</div>
                <div className="text-muted-foreground text-sm mt-1">Wait for the next drop to resolve predictions.</div>
              </div>
            )}
            
            <div className="space-y-5">
              {revealData?.questions?.map((q) => (
                <QuestionResolver key={q.vaultQuestionId} question={q} vaultId={vaultId} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="scoreboard" className="pb-24 focus-visible:outline-none">
            <OperatorScoreboard vaultId={vaultId} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
