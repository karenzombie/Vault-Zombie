import { useListAdminOverages } from "@workspace/api-client-react";

export function AdminOveragesTab() {
  const { data, isLoading } = useListAdminOverages();

  if (isLoading) return <div className="p-12 text-center text-text-2">Loading overage events...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-5 mb-6 text-sm text-text-2">
        <strong>History:</strong> This shows system overage events. Hosts only see current unhandled state, not this history.
      </div>
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
              <tr>
                <th className="px-6 py-4 border-b">Vault ID</th>
                <th className="px-6 py-4 border-b">Cap</th>
                <th className="px-6 py-4 border-b">Submitted</th>
                <th className="px-6 py-4 border-b">Outcome</th>
                <th className="px-6 py-4 border-b">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {data?.events?.map((event) => (
                <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-mono text-ink font-bold">{event.vaultId}</div>
                    <div className="text-text-2 text-xs font-mono mt-1">{event.id.slice(0, 12)}...</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-ink">{event.guestCap}</td>
                  <td className="px-6 py-4 font-bold text-warn">{event.submissionCount}</td>
                  <td className="px-6 py-4">
                    {!event.outcome ? (
                      <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-warn-tint text-warn">
                        Unresolved
                      </span>
                    ) : (
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        event.outcome === 'upgraded' ? 'bg-pop-tint text-pop-dk' : 'bg-muted text-text-2'
                      }`}>
                        {event.outcome}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs text-text-2">
                    {new Date(event.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {data?.events?.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-text-2">No overage events found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
