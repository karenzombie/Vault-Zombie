import { useGetAdminDashboard } from "@workspace/api-client-react";
import { Users, Box, HardDrive, Inbox, AlertCircle, Mail, AlertTriangle } from "lucide-react";
import { Link } from "wouter";

export function AdminDashboardTab() {
  const { data: dashboard, isLoading } = useGetAdminDashboard();

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading dashboard...</div>;
  if (!dashboard) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Operators" value={dashboard.operatorCount} icon={<Users className="w-5 h-5 text-gray" />} />
        <StatCard title="Total Vaults" value={dashboard.vaultCount} icon={<Box className="w-5 h-5 text-gray" />} />
        <StatCard title="Total Guests" value={dashboard.guestCount} icon={<HardDrive className="w-5 h-5 text-gray" />} />
        <StatCard title="Total Submissions" value={dashboard.submissionCount} icon={<Inbox className="w-5 h-5 text-gray" />} />
      </div>

      {(dashboard.unresolvedOverageCount > 0 || dashboard.failedEmailCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dashboard.unresolvedOverageCount > 0 && (
            <div className="bg-warn-tint border border-warn/30 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-warn" />
                <div>
                  <div className="font-bold text-warn font-display">Unresolved Overages</div>
                  <div className="text-sm text-warn/80">{dashboard.unresolvedOverageCount} vaults over capacity</div>
                </div>
              </div>
              <Link href="/admin/overages" className="bg-white text-warn text-sm px-3 py-1.5 rounded shadow-sm font-bold border border-warn/20 hover:bg-warn/10">View</Link>
            </div>
          )}
          {dashboard.failedEmailCount > 0 && (
            <div className="bg-destructive/10 border border-destructive/30 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <div>
                  <div className="font-bold text-destructive font-display">Failed Emails</div>
                  <div className="text-sm text-destructive/80">{dashboard.failedEmailCount} deliveries failed</div>
                </div>
              </div>
              <Link href="/admin/email" className="bg-white text-destructive text-sm px-3 py-1.5 rounded shadow-sm font-bold border border-destructive/20 hover:bg-destructive/10">View</Link>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ChartCard title="Vaults by State" data={dashboard.vaultsByState} />
        <ChartCard title="Vaults by Tier" data={dashboard.vaultsByTier} />
        <ChartCard title="Vaults by Type" data={dashboard.vaultsByType} />
      </div>

      <div className="bg-white border border-border p-6 rounded-xl shadow-sm">
        <h3 className="font-display text-lg mb-4 text-ink">System Reveal Progress</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-text-2 mb-1">Slots Scheduled</div>
            <div className="font-bold text-ink text-xl">{dashboard.revealProgress.slotsTotal}</div>
          </div>
          <div>
            <div className="text-text-2 mb-1">Slots Landed</div>
            <div className="font-bold text-ink text-xl">{dashboard.revealProgress.slotsLanded}</div>
          </div>
          <div>
            <div className="text-text-2 mb-1">Answers Total</div>
            <div className="font-bold text-ink text-xl">{dashboard.revealProgress.answersTotal}</div>
          </div>
          <div>
            <div className="text-text-2 mb-1">Answers Unlocked</div>
            <div className="font-bold text-ink text-xl">{dashboard.revealProgress.answersUnlocked}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-border p-5 rounded-xl shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-text-2">{title}</div>
        {icon}
      </div>
      <div className="text-3xl font-display text-ink">{value.toLocaleString()}</div>
    </div>
  );
}

function ChartCard({ title, data }: { title: string, data: { key: string, count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bg-white border border-border p-5 rounded-xl shadow-sm">
      <h3 className="font-display text-lg mb-4 text-ink">{title}</h3>
      <div className="space-y-3">
        {data.length === 0 && <div className="text-sm text-text-2">No data</div>}
        {data.map((item) => (
          <div key={item.key}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-ink capitalize">{item.key.replace(/_/g, ' ')}</span>
              <span className="text-text-2">{item.count.toLocaleString()}</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-vault-accent rounded-full" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
