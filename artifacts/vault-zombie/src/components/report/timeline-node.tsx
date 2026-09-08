import { OutcomeCounts } from "@workspace/api-client-react";
import { Icon } from "./icons";

export function TimelineNode({ 
  reveal, 
  isLast = false 
}: { 
  reveal: { revealSlotId: string, label: string, revealDate: string, outcomes: OutcomeCounts },
  isLast?: boolean
}) {
  const total = reveal.outcomes.scored || 0;
  const pct = total > 0 ? Math.round((reveal.outcomes.full / total) * 100) : 0;
  
  // Decide icon based on timing/idx. In reality this should be passed in or derived from the data
  // For now, assume simple mapping
  const isLocked = new Date(reveal.revealDate) > new Date();
  const icon = isLocked ? "ic-lock" : (isLast ? "ic-trophy" : "ic-dial");
  const color = isLocked ? "ink" : "bronze";

  return (
    <div className={`tl-row ${isLocked ? 'locked' : ''}`}>
      <span className={`tl-node med ${color}`}>
        <Icon name={icon} />
      </span>
      <div className="tl-body">
        <div className="tl-top">
          <b>{reveal.label}</b>
          <span>{new Date(reveal.revealDate).toLocaleDateString()}</span>
        </div>
        {!isLocked && total > 0 && (
          <>
            <div className="tl-bar">
              <i style={{ width: `${pct}%`, background: 'var(--hit)' }}></i>
            </div>
            <div className="tl-note">
              {pct}% called it &middot; {total} scored
            </div>
          </>
        )}
        {isLocked && (
          <div className="tl-note mt-1">Sealed until drop</div>
        )}
      </div>
    </div>
  );
}
