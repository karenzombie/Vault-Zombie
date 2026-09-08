import { useGetOperatorScoreboard } from "@workspace/api-client-react";
import { BarChart3 } from "lucide-react";

export function OperatorScoreboard({ vaultId }: { vaultId: string }) {
  const { data, isLoading, error } = useGetOperatorScoreboard(vaultId);

  if (isLoading) return (
    <div className="p-12 text-center text-muted-foreground animate-pulse font-medium">
      Tallying scores...
    </div>
  );
  
  if (error) return (
    <div className="p-6 text-center text-white bg-[#A24B3A] rounded-xl shadow-sm font-medium">
      Failed to load scoreboard.
    </div>
  );
  
  if (!data || data.entries.length === 0) return (
    <div className="p-10 text-center bg-card border border-border rounded-xl shadow-sm">
      <BarChart3 className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-30" />
      <div className="font-bold text-ink text-lg">No scores yet</div>
      <div className="text-muted-foreground text-sm mt-1">Resolve predictions to update the board.</div>
    </div>
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 bg-muted/80 border-b border-border flex items-center justify-between text-[11px] font-bold tracking-widest uppercase text-gray">
        <span>Rank & Guest</span>
        <span>Points</span>
      </div>
      <div className="divide-y divide-border">
        {data.entries.map((entry, idx) => (
          <div key={entry.guestId} className="px-5 py-4 flex items-center justify-between hover:bg-muted/20 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-6 text-center font-display text-xl text-brass shrink-0">
                {idx + 1}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="font-bold text-ink text-base leading-none">{entry.displayName}</div>
                <div className="text-[12px] text-text-2 font-medium">
                  <span className="text-ok">{entry.full} full</span><span className="text-gray mx-1.5">•</span><span className="text-brass">{entry.half} half</span>
                </div>
              </div>
            </div>
            <div className="font-display text-3xl text-ink tracking-tight bg-muted/30 px-3 py-1 rounded-lg">
              {entry.total}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
