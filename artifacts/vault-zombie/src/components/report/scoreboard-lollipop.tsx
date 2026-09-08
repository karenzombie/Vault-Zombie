import { ScoreboardEntry } from "@workspace/api-client-react";
import { Icon } from "./icons";
import { Link } from "wouter";

export function ScoreboardLollipop({ 
  rank, 
  entry, 
  maxScore,
  vaultId
}: { 
  rank: number, 
  entry: ScoreboardEntry, 
  maxScore: number,
  vaultId?: string
}) {
  const isLead = rank === 1;
  const pct = maxScore > 0 ? (entry.total / maxScore) * 100 : 0;
  
  const content = (
    <>
      <div className="lt">
        <span className="nm group-hover:text-vault-accent transition-colors">
          {entry.displayName} 
          {isLead && <Icon name="ic-trophy" className="w-4 h-4 text-brass ml-1" />}
        </span>
        <span className="v">{entry.total} pts</span>
      </div>
      <div className="track">
        <div className="base"></div>
        <div className="line" style={{ width: `${pct}%` }}></div>
        <span className="dot" style={{ left: `${pct}%` }}></span>
      </div>
    </>
  );

  return (
    <div className={`lolli group ${isLead ? 'lead' : ''}`}>
      <span className="rank">{rank}</span>
      <div className="w-full">
        {vaultId ? (
          <Link href={`/operator/vaults/${vaultId}/reports/guests/${entry.guestId}`} className="block w-full">
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
