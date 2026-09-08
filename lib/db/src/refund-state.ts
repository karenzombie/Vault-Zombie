export const UNRESOLVED_REFUND_STATUSES = ["reserved", "stripe_pending", "unknown"] as const;
export const TERMINAL_REFUND_STATUSES = ["failed", "canceled", "completed"] as const;

export type RefundAttemptStatus =
  | (typeof UNRESOLVED_REFUND_STATUSES)[number]
  | (typeof TERMINAL_REFUND_STATUSES)[number];

export function isUnresolvedRefundStatus(status: string | null | undefined): status is (typeof UNRESOLVED_REFUND_STATUSES)[number] {
  return status != null && (UNRESOLVED_REFUND_STATUSES as readonly string[]).includes(status);
}

export function canTransitionRefundAttempt(from: string, to: RefundAttemptStatus): boolean {
  if (!isUnresolvedRefundStatus(from)) return false;
  if (to === "completed" || to === "failed" || to === "canceled") return true;
  if (to === "reserved") return true;
  if (to === "stripe_pending") return from === "reserved" || from === "unknown" || from === "stripe_pending";
  return to === "unknown";
}