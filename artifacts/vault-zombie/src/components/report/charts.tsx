import { ReactNode } from "react";
import { OutcomeBadge, Icon } from "./icons";
import { OutcomeCounts, ScoreboardEntry } from "@workspace/api-client-react";

export function RingGauge({ outcomes, label = "called it" }: { outcomes: OutcomeCounts, label?: string }) {
  const total = outcomes.scored || 1;
  const pct = Math.round((outcomes.full / total) * 100) || 0;
  
  // Circumference for r=54 is ~339.3
  const dashLength = (pct / 100) * 339.29;
  
  return (
    <div className="gauge-container">
      <svg className="gauge-svg" viewBox="0 0 140 140" role="img" aria-label={`${pct}% ${label}`}>
        <circle cx="70" cy="70" r="54" fill="none" stroke="hsl(var(--hairline))" strokeWidth="16"/>
        <circle cx="70" cy="70" r="54" fill="none" stroke="var(--hit)" strokeWidth="16" strokeLinecap="round" 
                strokeDasharray={`${dashLength} ${339.29 - dashLength}`} transform="rotate(-90 70 70)"/>
        <text x="70" y="68" textAnchor="middle" dominantBaseline="middle" className="font-display text-[36px]" fill="hsl(var(--ink))">{pct}%</text>
        <text x="70" y="90" textAnchor="middle" className="font-sans text-[12px]" fill="hsl(var(--gray))">{label}</text>
      </svg>
      <div>
        <div className="brk-row">
          <OutcomeBadge outcome="full" />
          <span className="brk-nm">Came true</span>
          <div className="brk-track">
            <div className="brk-fill" style={{ width: `${(outcomes.full / total) * 100}%`, background: 'var(--hit)' }}></div>
          </div>
          <span className="brk-ct">{outcomes.full}</span>
        </div>
        <div className="brk-row">
          <OutcomeBadge outcome="half" />
          <span className="brk-nm">Sort of</span>
          <div className="brk-track">
            <div className="brk-fill" style={{ width: `${(outcomes.half / total) * 100}%`, background: 'var(--sortof)' }}></div>
          </div>
          <span className="brk-ct">{outcomes.half}</span>
        </div>
        <div className="brk-row">
          <OutcomeBadge outcome="zero" />
          <span className="brk-nm">Nope</span>
          <div className="brk-track">
            <div className="brk-fill" style={{ width: `${(outcomes.zero / total) * 100}%`, background: 'var(--miss)' }}></div>
          </div>
          <span className="brk-ct">{outcomes.zero}</span>
        </div>
      </div>
    </div>
  );
}

export function Pictograph({ scoreboard, maxScore }: { scoreboard: ScoreboardEntry[], maxScore?: number }) {
  const highest = scoreboard.length > 0 ? Math.max(...scoreboard.map(s => s.total)) : 0;
  
  return (
    <div className="picto" aria-label={`${scoreboard.length} guests, colored by accuracy`}>
      {scoreboard.map(guest => {
        let color = "var(--hairline)";
        if (highest > 0 && guest.total === highest) {
          color = "var(--hit)";
        } else if (maxScore && guest.full > (maxScore / 2)) {
          color = "var(--bronze)";
        } else if (!maxScore && guest.full > 0) {
          // fallback if we don't know the exact max score
          color = "var(--bronze)";
        }
        
        return (
          <span key={guest.guestId} className="person-icon" style={{ color }} title={`${guest.displayName}: ${guest.full} called`}>
            <svg viewBox="0 0 20 26"><use href="#ic-person-fill"/></svg>
          </span>
        );
      })}
    </div>
  );
}

export function DivergingBar({ 
  icon, 
  title, 
  meta, 
  hitCount, 
  missCount, 
  maxCount 
}: { 
  icon: string, 
  title: string, 
  meta: string, 
  hitCount: number, 
  missCount: number, 
  maxCount: number 
}) {
  const hitPct = maxCount > 0 ? (hitCount / maxCount) * 100 : 0;
  const missPct = maxCount > 0 ? (missCount / maxCount) * 100 : 0;

  return (
    <div className="dvg-row">
      <span className="med bronze"><Icon name={icon} /></span>
      <div>
        <div className="dvg-top">
          <span className="dvg-name">{title}</span>
          <span className="dvg-meta">{meta}</span>
        </div>
        <div className="dvg-track">
          <div className="dvg-side left">
            {missCount > 0 && <div className="dvg-fill miss" style={{ width: `${missPct}%` }}>{missCount}</div>}
          </div>
          <div className="dvg-side">
            {hitCount > 0 && <div className="dvg-fill hit" style={{ width: `${hitPct}%` }}>{hitCount}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NumberSpread({ guesses, actualValue }: { guesses: number[], actualValue: number }) {
  if (guesses.length === 0) return null;
  
  const allVals = [...guesses, actualValue];
  const min = Math.min(...allVals);
  const max = Math.max(...allVals);
  const range = Math.max(max - min, 1);
  
  const getX = (val: number) => 30 + ((val - min) / range) * 270; // Map to 30..300 range

  return (
    <svg viewBox="0 0 320 74" className="w-full h-auto mt-2">
      <line x1="30" y1="40" x2="300" y2="40" stroke="hsl(var(--hairline))" strokeWidth="2"/>
      <line x1={getX(Math.min(...guesses))} y1="40" x2={getX(Math.max(...guesses))} y2="40" stroke="var(--sortof)" strokeWidth="2" opacity="0.5"/>
      
      {guesses.map((g, i) => (
        <circle key={i} cx={getX(g)} cy="40" r="6" fill="var(--sortof)" opacity="0.85"/>
      ))}
      
      {/* Actual Value Marker */}
      <path d={`M${getX(actualValue)} 20 l9 9 -9 9 -9 -9 z`} fill="hsl(var(--ink))"/>
      <text x={getX(actualValue)} y="14" textAnchor="middle" className="font-sans text-[11px] font-bold" fill="hsl(var(--ink))">
        Actual: {actualValue}
      </text>
    </svg>
  );
}

export function OptionSplit({ label, isWinner, count, maxCount }: { label: string, isWinner: boolean, count: number, maxCount: number }) {
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
  
  return (
    <div className={`optbar ${isWinner ? 'win' : ''}`}>
      <div className="ot">
        <span className="olab">{label} {isWinner && <Icon name="ic-check" className="w-4 h-4 text-ok" />}</span>
        <span className="oval">{count} guest{count !== 1 ? 's' : ''}</span>
      </div>
      <div className="otrack">
        <div className="ofill" style={{ width: `${pct}%` }}></div>
      </div>
    </div>
  );
}
