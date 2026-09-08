import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListAdminEmailDeliveriesQueryKey, useListAdminEmailDeliveries, useRetryAdminEmailDelivery } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AdminEmailTab() {
  const { data, isLoading } = useListAdminEmailDeliveries();
  const retry = useRetryAdminEmailDelivery();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  if (isLoading) return <div className="p-12 text-center text-text-2">Loading email deliveries...</div>;
  return <div className="space-y-4">
    <div className="bg-card border border-border rounded-xl p-4 text-sm text-text-2">Failed deliveries can be retried only with fresh MFA and an audit reason.</div>
    <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason required for retry" minLength={1} />
    <div className="bg-white border border-border rounded-xl overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left bg-muted"><th className="p-3">Event</th><th className="p-3">Recipient</th><th className="p-3">State</th><th className="p-3">Attempts / error</th><th className="p-3" /></tr></thead>
      <tbody>{data?.deliveries.map((delivery) => <tr key={delivery.id} className="border-t">
        <td className="p-3">{delivery.eventType}</td><td className="p-3">{delivery.recipientEmail}</td><td className="p-3">{delivery.status}</td>
        <td className="p-3">{delivery.attempts}{delivery.lastError ? ` — ${delivery.lastError}` : ""}</td><td className="p-3">{delivery.status === "failed" && <Button size="sm" disabled={!reason.trim() || retry.isPending} onClick={() => retry.mutate({ emailDeliveryId: delivery.id, data: { reason } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminEmailDeliveriesQueryKey() }) })}>Retry</Button>}</td>
      </tr>)}</tbody>
    </table></div>
  </div>;
}