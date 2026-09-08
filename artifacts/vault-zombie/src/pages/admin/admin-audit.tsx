import { useState } from "react";
import { useListAdminAuditEvents } from "@workspace/api-client-react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function AdminAuditTab() {
  const [targetId, setTargetId] = useState("");
  const [action, setAction] = useState("");

  const { data, isLoading } = useListAdminAuditEvents({ target: targetId || undefined, action: action || undefined });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 bg-white border border-border p-4 rounded-xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <Input 
            placeholder="Filter by Target ID..." 
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="pl-9 text-sm"
          />
        </div>
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Filter by Action (e.g. manual_unlock)..." 
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="text-sm"
          />
        </div>
      </div>

      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-text-2">Loading audit events...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-muted text-text-2 font-bold tracking-wider uppercase text-[10px]">
                <tr>
                  <th className="px-6 py-4 border-b">Timestamp</th>
                  <th className="px-6 py-4 border-b">Admin</th>
                  <th className="px-6 py-4 border-b">Action / Target</th>
                  <th className="px-6 py-4 border-b">Reason</th>
                  <th className="px-6 py-4 border-b">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline text-xs">
                {data?.events.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 text-text-2">
                      {new Date(event.occurredAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-bold text-ink">{event.adminName}</td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-ink font-bold">{event.action}</div>
                      <div className="text-text-2 font-mono mt-1">{event.targetType}: {event.targetId.slice(0, 16)}...</div>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate text-ink" title={event.reason}>
                      {event.reason}
                    </td>
                    <td className="px-6 py-4">
                      <details className="cursor-pointer">
                         <summary className="text-vault-accent hover:underline">View JSON</summary>
                         <pre className="mt-2 bg-muted p-2 rounded text-[10px] whitespace-pre-wrap max-w-xs">{JSON.stringify(event.details, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
                {data?.events.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-12 text-center text-text-2">No audit events found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
