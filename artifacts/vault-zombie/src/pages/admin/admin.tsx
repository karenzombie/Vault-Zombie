import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Activity, CreditCard, Gift, AlertCircle, ShieldAlert, Key } from "lucide-react";
import { useAuth } from "@clerk/react";

import { AdminBillingTab } from "./admin-billing";
import { AdminGiftsTab } from "./admin-gifts";
import { AdminOveragesTab } from "./admin-overages";
import { AdminCompTab } from "./admin-comp";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("billing");

  // Note: Backend handles actual role verification, but we use requireOperator pattern in App
  // so this route is auth-protected. We don't need to double-guard if the endpoints themselves return 403.

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full text-foreground bg-background">
      <aside className="w-full md:w-[236px] bg-ink text-background flex flex-col md:p-4 shrink-0 md:fixed md:h-[100dvh] z-20">
        <div className="flex items-center gap-2 px-4 md:px-2 py-3 md:py-4 shrink-0">
          <Link href="/"><img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="Vault Zombie" className="h-6 md:h-8 w-auto" /></Link>
        </div>
        <div className="hidden md:block text-[11px] tracking-[0.1em] uppercase text-gray px-3 py-2">Admin Panel</div>
        <nav className="flex flex-row md:flex-col gap-1 px-2 md:px-0 pb-2 md:pb-0 md:mt-2 overflow-x-auto no-scrollbar">
          <NavButton id="health" icon={<Activity className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Health" active={activeTab} setActive={setActiveTab} />
          <NavButton id="billing" icon={<CreditCard className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Billing" active={activeTab} setActive={setActiveTab} />
          <NavButton id="gifts" icon={<Gift className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Gifts" active={activeTab} setActive={setActiveTab} />
          <NavButton id="overages" icon={<AlertCircle className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Overages" active={activeTab} setActive={setActiveTab} />
          <NavButton id="comp" icon={<Key className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Comp Grant" active={activeTab} setActive={setActiveTab} />
        </nav>
      </aside>

      <main className="flex-1 w-full md:ml-[236px] p-4 md:p-10 max-w-full md:max-w-[1200px] min-w-0 overflow-x-hidden">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="font-display text-4xl text-ink">System Admin</h1>
          <div className="bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Highly Privileged
          </div>
        </div>

        {activeTab === "health" && (
          <div className="p-12 text-center bg-white border border-border rounded-xl shadow-sm">
            <Activity className="w-12 h-12 text-ok mx-auto mb-4 opacity-50" />
            <h2 className="font-display text-2xl mb-2">System Health</h2>
            <p className="text-text-2">All services operational.</p>
          </div>
        )}

        {activeTab === "billing" && <AdminBillingTab />}
        {activeTab === "gifts" && <AdminGiftsTab />}
        {activeTab === "overages" && <AdminOveragesTab />}
        {activeTab === "comp" && <AdminCompTab />}
      </main>
    </div>
  );
}

function NavButton({ id, icon, label, active, setActive }: { id: string, icon: React.ReactNode, label: string, active: string, setActive: (id: string) => void }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setActive(id)}
      aria-label={label}
      title={label}
      className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-md font-medium text-[13px] md:text-[14.5px] transition-colors whitespace-nowrap ${
        isActive ? "bg-pop text-[#FFF7F2]" : "text-gray hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon} <span className="hidden sm:inline md:inline">{label}</span>
    </button>
  );
}
