import { ReactNode } from "react";

export function WaxSeal({ className = "", isOpen = true }: { className?: string, isOpen?: boolean }) {
  return (
    <svg className={className} width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={isOpen ? "Opened seal" : "Sealed"}>
      <circle cx="48" cy="48" r="30" fill="var(--vault-accent, #C9A96A)"/>
      <circle cx="48" cy="48" r="33" fill="none" stroke="var(--vault-accent, #C9A96A)" strokeWidth="8" strokeLinecap="round" strokeDasharray="0.1 11"/>
      <circle cx="48" cy="48" r="22" fill="none" stroke="hsl(var(--ink))" strokeWidth="2"/>
      <rect x="41" y="46" width="14" height="12" rx="2" fill="hsl(var(--parchment))"/>
      {isOpen ? (
        <>
          <path d="M43 46 v-4 a5 5 0 0 1 10 0 v1" fill="none" stroke="hsl(var(--parchment))" strokeWidth="3" strokeLinecap="round" transform="rotate(-28 43 46)"/>
          <path d="M18 40 l14 6 -8 8 16 3 -6 9" fill="none" stroke="hsl(var(--ink))" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".75"/>
        </>
      ) : (
        <path d="M43 46 v-4 a5 5 0 0 1 10 0 v4" fill="none" stroke="hsl(var(--parchment))" strokeWidth="3"/>
      )}
    </svg>
  );
}

export function SectionHeader({ icon, title, subtitle }: { icon: string, title: string, subtitle: string }) {
  return (
    <div className="report-sec">
      <span className="med bronze"><svg className="ic"><use href={`#${icon}`} /></svg></span>
      <div>
        <div className="h">{title}</div>
        <div className="s">{subtitle}</div>
      </div>
    </div>
  );
}

export function StatCallout({ value, label, highlight, icon, color = "bronze" }: { value: string | number, label: string, highlight: string, icon: string, color?: "bronze" | "brass" | "hit" | "miss" | "ink" }) {
  return (
    <div className="callout">
      <span className={`med ${color}`}><svg className="ic"><use href={`#${icon}`} /></svg></span>
      <div>
        <div className="n">{value}</div>
        <div className="l"><b>{highlight}</b> &middot; {label}</div>
      </div>
    </div>
  );
}

export function OperatorNote({ note }: { note: string | null | undefined }) {
  if (!note) return null;
  return (
    <div className="opnote">
      <span className="oplab">Operator note</span>
      <span className="optxt">{note}</span>
    </div>
  );
}

export function CertificateFrame({ children, showFrame = true }: { children: ReactNode, showFrame?: boolean }) {
  if (!showFrame) return <>{children}</>;
  return (
    <div className="cert">
      <div className="cdia tl"></div>
      <div className="cdia tr"></div>
      <div className="cdia bl"></div>
      <div className="cdia br"></div>
      {children}
    </div>
  );
}
