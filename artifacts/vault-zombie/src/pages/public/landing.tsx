import { Link } from 'wouter';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Landing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground font-sans">
      <header className="bg-background/90 backdrop-blur border-b border-border sticky top-0 z-50">
        <div className="max-w-[1160px] mx-auto px-6 h-[66px] flex items-center gap-6">
          <Link href="/" className="font-display text-[25px] leading-none tracking-[-0.01em]">
            Vault<span className="text-pop">Zombie</span>
          </Link>
          <nav className="hidden md:flex gap-6 ml-2">
            <a href="#how-it-works" className="text-[15px] text-muted-foreground font-medium hover:text-foreground">How it works</a>
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <Link href="/sign-in" className="text-[15px] font-semibold text-foreground hover:text-pop transition-colors">Log in</Link>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "default", size: "sm" }))}>Create Vault</Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-24 px-6 text-center max-w-3xl mx-auto">
          <div className="w-[82px] h-[82px] rounded-full bg-pop-tint flex items-center justify-center mx-auto mb-6">
             <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="4" className="w-10 h-10 text-pop">
                <circle cx="26" cy="38" r="14"/><circle cx="40" cy="38" r="14"/><path d="M22 16l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </div>
          <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight text-ink mb-6">
            Sealed predictions,<br />unlocked over time.
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Got a wedding, a baby, or a big year coming? Start a vault of your own. Guests seal their predictions in under a minute. Every six months a fresh batch unlocks, and you mark who called it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "pop", size: "lg" }))}>
              Start your vault
            </Link>
            <a href="#how-it-works" className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}>
              See how it works
            </a>
          </div>
        </section>

        <section id="how-it-works" className="bg-white border-y border-border py-20 px-6 scroll-mt-20">
          <div className="max-w-[1160px] mx-auto text-center">
            <h2 className="text-3xl font-bold mb-12">How it works</h2>
            <div className="grid md:grid-cols-3 gap-10">
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-background border border-border shadow-md flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-pop text-white font-display text-sm flex items-center justify-center border-2 border-background">1</span>
                  <svg className="w-6 h-6 text-pop" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Create a Vault</h3>
                <p className="text-muted-foreground">Pick prompts for your event. Send the unique link to your guests.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-background border border-border shadow-md flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-pop text-white font-display text-sm flex items-center justify-center border-2 border-background">2</span>
                  <svg className="w-6 h-6 text-pop" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0v4m-9 0h10a2 2 0 012 2v6a2 2 0 01-2 2H7a2 2 0 01-2-2v-6a2 2 0 012-2z"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Guests guess</h3>
                <p className="text-muted-foreground">They fill in predictions in ~1 minute, account-free. Guesses are sealed.</p>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-background border border-border shadow-md flex items-center justify-center mb-6 relative">
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-pop text-white font-display text-sm flex items-center justify-center border-2 border-background">3</span>
                  <svg className="w-6 h-6 text-pop" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                </div>
                <h3 className="text-xl font-bold mb-3">Time unveils</h3>
                <p className="text-muted-foreground">Every six months, answers unlock. See who knew you best.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-background py-10 px-6">
        <div className="max-w-[1160px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-display text-2xl tracking-tight text-background">Vault<span className="text-brass">Zombie</span></div>
          <div className="flex gap-6 text-sm text-gray">
            <Link href="/" className="hover:text-brass">Terms</Link>
            <Link href="/" className="hover:text-brass">Privacy</Link>
            <Link href="/" className="hover:text-brass">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
