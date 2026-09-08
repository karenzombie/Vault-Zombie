import { useState } from "react";
import { useGetAdminRevenueReport } from "@workspace/api-client-react";
import { DollarSign, ShieldAlert } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminRevenueTab() {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [to, setTo] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  const { data: report, isLoading } = useGetAdminRevenueReport({ from, to });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white border border-border p-4 rounded-xl shadow-sm">
        <div>
          <label className="text-xs font-bold text-gray uppercase tracking-wider mb-1 block">From</label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-auto h-8 text-sm" />
        </div>
        <div>
          <label className="text-xs font-bold text-gray uppercase tracking-wider mb-1 block">To</label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-auto h-8 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-text-2">Loading revenue report...</div>
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <RevCard title="Gross Confirmed" cents={report.grossConfirmedAmountCents} />
            <RevCard title="Refunded" cents={report.refundedAmountCents} className="text-destructive" />
            <RevCard title="Disputed" cents={report.disputedAmountCents} className="text-warn" />
            <RevCard title="Comp Value (Lost)" cents={report.compAmountCents} className="text-text-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <RevCard title="Gift Income (Issued)" cents={report.giftIssuedAmountCents} />
            <RevCard title="Gift Value (Redeemed)" cents={report.giftRedeemedAmountCents} />
          </div>

          <div className="bg-card border border-border p-5 rounded-xl shadow-sm text-sm">
            <h3 className="font-bold text-ink mb-2 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-warn" /> Reconciliation Status
            </h3>
            <p className="text-text-2 mb-3">{report.reconciliation.message}</p>
            <div className="flex gap-4">
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${report.reconciliation.feesAvailable ? 'bg-ok-tint text-ok' : 'bg-muted text-text-2'}`}>Fees: {report.reconciliation.feesAvailable ? 'Yes' : 'No'}</span>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${report.reconciliation.netAvailable ? 'bg-ok-tint text-ok' : 'bg-muted text-text-2'}`}>Net: {report.reconciliation.netAvailable ? 'Yes' : 'No'}</span>
              <span className={`px-2 py-1 rounded text-xs font-bold uppercase tracking-wider ${report.reconciliation.payoutsAvailable ? 'bg-ok-tint text-ok' : 'bg-muted text-text-2'}`}>Payouts: {report.reconciliation.payoutsAvailable ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RevCard({ title, cents, className = "text-ink" }: { title: string, cents: number, className?: string }) {
  return (
    <div className="bg-white border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="text-sm font-medium text-text-2 mb-2">{title}</div>
      <div className={`text-2xl font-display flex items-center gap-1 ${className}`}>
        <DollarSign className="w-5 h-5 opacity-50" />
        {(cents / 100).toFixed(2)}
      </div>
    </div>
  );
}
