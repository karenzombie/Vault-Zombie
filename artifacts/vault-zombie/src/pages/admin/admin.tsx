import { Link, useRoute, useLocation } from "wouter";
import {
  LayoutDashboard, Box, Users, TrendingUp, CreditCard,
  Gift, AlertCircle, Key, Mail, FileText, ClipboardList, ShieldAlert, Download
} from "lucide-react";

import { AdminDashboardTab } from "./admin-dashboard";
import { AdminVaultsTab } from "./admin-vaults";
import { AdminOperatorsTab } from "./admin-operators";
import { AdminRevenueTab } from "./admin-revenue";
import { AdminBillingTab } from "./admin-billing";
import { AdminGiftsTab } from "./admin-gifts";
import { AdminOveragesTab } from "./admin-overages";
import { AdminCompTab } from "./admin-comp";
import { AdminEmailTab } from "./admin-email";
import { AdminContentTab } from "./admin-content";
import { AdminAuditTab } from "./admin-audit";
import { AdminExportsTab } from "./admin-exports";

export default function AdminPage() {
  const [matchTabId, paramsTabId] = useRoute("/admin/:tab/:id");
  const [matchTab, paramsTab] = useRoute("/admin/:tab");
  const [, setLocation] = useLocation();

  const tab = paramsTabId?.tab || paramsTab?.tab || "dashboard";
  const id = paramsTabId?.id;

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] w-full text-foreground bg-background">
      <aside className="w-full md:w-[236px] bg-ink text-background flex flex-col md:p-4 shrink-0 md:fixed md:h-[100dvh] z-20">
        <div className="flex items-center gap-2 px-4 md:px-2 py-3 md:py-4 shrink-0 border-b border-white/10 md:border-0">
          <Link href="/" className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}vault_zombie_png.png`} alt="" className="h-12 md:h-16 w-auto cursor-pointer" />
            <img src={`${import.meta.env.BASE_URL}vaultzombie_text.png`} alt="VaultZombie" className="h-12 md:h-16 w-auto" />
          </Link>
        </div>
        <div className="hidden md:block text-[11px] tracking-[0.1em] uppercase text-gray px-3 py-2 mt-4">System Admin</div>

        <nav className="flex flex-row md:flex-col gap-1 px-2 md:px-0 pb-2 md:pb-0 md:mt-2 overflow-x-auto no-scrollbar items-center md:items-stretch">
          <NavButton id="dashboard" icon={<LayoutDashboard className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Dashboard" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="vaults" icon={<Box className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Vaults" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="operators" icon={<Users className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Hosts" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />

          <div className="hidden md:block text-[11px] tracking-[0.1em] uppercase text-gray px-3 py-2 mt-4">Finance</div>
          <NavButton id="revenue" icon={<TrendingUp className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Revenue" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="billing" icon={<CreditCard className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Billing" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="gifts" icon={<Gift className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Gifts" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="overages" icon={<AlertCircle className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Overages" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="comp" icon={<Key className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Comp Grant" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />

          <div className="hidden md:block text-[11px] tracking-[0.1em] uppercase text-gray px-3 py-2 mt-4">System</div>
          <NavButton id="content" icon={<FileText className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Content" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="email" icon={<Mail className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Email" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="audit" icon={<ClipboardList className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Audit" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
          <NavButton id="exports" icon={<Download className="w-[16px] h-[16px] md:w-[18px] md:h-[18px]" />} label="Exports" active={tab} setTab={(t) => setLocation(`/admin/${t}`)} />
        </nav>
      </aside>

      <main className="flex-1 w-full md:ml-[236px] p-4 md:p-10 max-w-full md:max-w-[1400px] min-w-0 overflow-x-hidden">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h1 className="font-display text-4xl text-ink capitalize">{tab}</h1>
          <div className="bg-destructive/10 text-destructive text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" /> Highly Privileged
          </div>
        </div>

        {tab === "dashboard" && <AdminDashboardTab />}
        {tab === "vaults" && <AdminVaultsTab vaultId={id} />}
        {tab === "operators" && <AdminOperatorsTab operatorId={id} />}
        {tab === "revenue" && <AdminRevenueTab />}
        {tab === "billing" && <AdminBillingTab />}
        {tab === "gifts" && <AdminGiftsTab />}
        {tab === "overages" && <AdminOveragesTab />}
        {tab === "comp" && <AdminCompTab />}
        {tab === "email" && <AdminEmailTab />}
        {tab === "content" && <AdminContentTab />}
        {tab === "audit" && <AdminAuditTab />}
        {tab === "exports" && <AdminExportsTab />}
      </main>
    </div>
  );
}

function NavButton({ id, icon, label, active, setTab }: { id: string, icon: React.ReactNode, label: string, active: string, setTab: (id: string) => void }) {
  const isActive = active === id;
  return (
    <button
      onClick={() => setTab(id)}
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
