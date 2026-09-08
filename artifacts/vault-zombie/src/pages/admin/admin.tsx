import { Link } from "wouter";

export default function AdminPlaceholder() {
  return (
    <div className="flex h-[100dvh] w-full text-foreground">
      <aside className="w-[236px] bg-ink text-background flex flex-col p-4">
        <div className="flex items-center gap-2 px-2 py-4 mb-2">
          <Link href="/"><img src="/vault_zombie_png.png" alt="Vault Zombie" className="h-8 w-auto" /></Link>
        </div>
        <div className="text-[11px] tracking-[0.1em] uppercase text-gray px-3 py-2">Admin</div>
        <nav className="flex flex-col gap-1">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md bg-pop text-[#FFF7F2] font-medium text-[14.5px]">
            <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/></svg>
            System Health
          </Link>
        </nav>
      </aside>
      <main className="flex-1 bg-background p-10">
        <div className="max-w-[840px] mx-auto">
          <h1 className="text-3xl font-bold mb-8">System Admin</h1>
          <div className="p-12 text-center bg-white border border-border rounded-xl">
            <p className="text-muted-foreground">Admin functions will appear here. (Placeholder)</p>
          </div>
        </div>
      </main>
    </div>
  );
}
