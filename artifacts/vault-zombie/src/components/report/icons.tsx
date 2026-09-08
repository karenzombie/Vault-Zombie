export function IconSprite() {
  return (
    <svg style={{ display: 'none' }} xmlns="http://www.w3.org/2000/svg">
      <symbol id="ic-heart" viewBox="0 0 24 24"><path d="M12 20s-6.5-4.4-9-8.3C1.2 8.7 2.6 5 6.2 5c2 0 3.2 1.2 3.8 2.2C10.6 6.2 11.8 5 13.8 5c3.6 0 5 3.7 3.2 6.7C18.5 15.6 12 20 12 20z"/></symbol>
      <symbol id="ic-home" viewBox="0 0 24 24"><path d="M3.5 11.5 12 5l8.5 6.5"/><path d="M6 10.5V19h12v-8.5"/></symbol>
      <symbol id="ic-people" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 18a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M14.8 18a5 5 0 0 1 6.7-4.7"/></symbol>
      <symbol id="ic-plane" viewBox="0 0 24 24"><path d="M21 4 3 11l6 2 2 6z"/><path d="M21 4 11 15"/></symbol>
      <symbol id="ic-coin" viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v6c0 1.7 3.1 3 7 3s7-1.3 7-3V8"/><path d="M5 11c0 1.7 3.1 3 7 3s7-1.3 7-3"/></symbol>
      <symbol id="ic-car" viewBox="0 0 24 24"><path d="M4 13l1.8-4.5A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.5L20 13"/><rect x="3.5" y="13" width="17" height="5" rx="1.5"/><circle cx="7.5" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/></symbol>
      <symbol id="ic-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></symbol>
      <symbol id="ic-star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.5 9.6l5.9-.8z"/></symbol>
      <symbol id="ic-trophy" viewBox="0 0 24 24"><path d="M8 5h8v3.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.7 3M16 6h2.5a2.5 2.5 0 0 1-2.7 3"/><path d="M12 12v3"/><path d="M9.5 19h5l-.7-3.5h-3.6z"/></symbol>
      <symbol id="ic-lock" viewBox="0 0 24 24"><rect x="6" y="11" width="12" height="8.5" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></symbol>
      <symbol id="ic-dial" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20"/></symbol>
      <symbol id="ic-rings" viewBox="0 0 24 24"><circle cx="9.5" cy="14" r="4.6"/><circle cx="15" cy="14" r="4.6"/><path d="M9.5 5l1.8 2.6-1.8 2.6-1.8-2.6z"/></symbol>
      <symbol id="ic-cap" viewBox="0 0 24 24"><path d="M12 6 21 10l-9 4-9-4z"/><path d="M7 12.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.5"/></symbol>
      <symbol id="ic-baby" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/></symbol>
      <symbol id="ic-check" viewBox="0 0 24 24"><path d="M6 12.5l3.5 3.5 8-8.5"/></symbol>
      <symbol id="ic-x" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></symbol>
      <symbol id="ic-tilde" viewBox="0 0 24 24"><path d="M5 14q3-5 6.5 0t6.5 0"/></symbol>
      <symbol id="ic-person-fill" viewBox="0 0 20 26"><circle cx="10" cy="6" r="4"/><path d="M2 25a8 8 0 0 1 16 0z"/></symbol>
      
      {/* Outcome badges, shape plus color */}
      <symbol id="oc-hit" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="15" fill="var(--hit-wash)" stroke="var(--hit)" strokeWidth="2"/>
        <path d="M11 17 l4 4 8 -9" fill="none" stroke="var(--hit)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/>
      </symbol>
      <symbol id="oc-sortof" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="15" fill="var(--sortof-wash)" stroke="var(--sortof)" strokeWidth="2"/>
        <path d="M10 19 q3.5 -5 7 0 t7 0" fill="none" stroke="var(--sortof)" strokeWidth="2.6" strokeLinecap="round"/>
      </symbol>
      <symbol id="oc-miss" viewBox="0 0 34 34">
        <circle cx="17" cy="17" r="15" fill="var(--miss-wash)" stroke="var(--miss)" strokeWidth="2"/>
        <path d="M12 12 l10 10 M22 12 l-10 10" stroke="var(--miss)" strokeWidth="2.6" strokeLinecap="round"/>
      </symbol>
    </svg>
  );
}

export function Icon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg className={`ic ${className}`} aria-hidden="true">
      <use href={`#${name}`} />
    </svg>
  );
}

export function OutcomeBadge({ outcome, className = "" }: { outcome: 'full' | 'half' | 'zero'; className?: string }) {
  let id = "oc-miss";
  if (outcome === 'full') id = "oc-hit";
  if (outcome === 'half') id = "oc-sortof";
  
  return (
    <svg className={`w-[22px] h-[22px] shrink-0 align-middle ${className}`} aria-hidden="true">
      <use href={`#${id}`} />
    </svg>
  );
}

export function Medallion({ 
  icon, 
  color = "bronze", 
  className = "" 
}: { 
  icon: string; 
  color?: "bronze" | "brass" | "hit" | "miss" | "ink"; 
  className?: string;
}) {
  return (
    <span className={`med ${color} ${className}`}>
      <Icon name={icon} />
    </span>
  );
}
