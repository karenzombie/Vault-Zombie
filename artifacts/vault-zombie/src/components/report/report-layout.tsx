import { ReactNode } from "react";
import { Link } from "wouter";
import { IconSprite } from "./icons";
import { WaxSeal } from "./components";
import { ArrowLeft } from "lucide-react";

export function ReportLayout({ 
  children, 
  vaultId,
  title,
  subtitle,
  eyebrow = "Vault results",
  sealOpen = true,
  backUrl,
  backLabel = "Back to Operator",
  printMode = false
}: { 
  children: ReactNode; 
  vaultId: string;
  title: string;
  subtitle: string;
  eyebrow?: string;
  sealOpen?: boolean;
  backUrl?: string;
  backLabel?: string;
  printMode?: boolean;
}) {
  const finalBackUrl = backUrl || `/operator?vaultId=${encodeURIComponent(vaultId)}`;

  return (
    <>
      <IconSprite />
      <div className={`min-h-[100dvh] bg-background text-foreground flex flex-col font-sans ${printMode ? 'print-mode print:bg-white print:p-0' : ''}`}>
        
        {/* Hide header in print mode entirely */}
        <header className="flex items-center justify-between px-5 py-4 bg-ink text-parchment sticky top-0 z-20  print:hidden">
          <div className="flex items-center gap-4">
            <Link href="/" className="shrink-0">
              <img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-7 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity" />
            </Link>
            <div className="w-px h-5 bg-white/20"></div>
            <Link href={finalBackUrl} className="flex items-center gap-2 text-sm font-bold text-brass-lt hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> {backLabel}
            </Link>
          </div>
          <div className="text-[11px] font-bold tracking-widest text-brass uppercase bg-white/10 px-3 py-1.5 rounded-full hidden sm:block">
            Vault Report
          </div>
        </header>

        <main className={`flex-1 w-full max-w-2xl mx-auto p-4 sm:p-6 pb-24 ${printMode ? 'print:max-w-none print:w-full print:p-0' : ''}`}>
          
          <header className="report-mast bg-ink text-parchment rounded-[18px] p-8 sm:px-7 sm:py-12 text-center mb-8">
            <img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-14 sm:h-16 w-auto mx-auto mb-6 object-contain" />
            
            <WaxSeal className="mx-auto my-6 sm:my-8 block" isOpen={sealOpen} />
            
            <div className="text-[11px] font-bold tracking-[0.12em] uppercase text-brass eyebrow">
              {eyebrow}
            </div>
            
            <h1 className="font-display text-3xl sm:text-[40px] leading-[1.02] mt-2 text-parchment">
              {title}
            </h1>
            
            <div className="mt-3 text-[15px] text-brass-lt/90 sub">
              {subtitle}
            </div>
          </header>

          <div className="report-content space-y-4">
            {children}
          </div>

          <footer className="text-center text-[12px] text-gray mt-12 print:mt-8">
            VaultZombie &middot; Report Surface
          </footer>
        </main>
      </div>
    </>
  );
}
