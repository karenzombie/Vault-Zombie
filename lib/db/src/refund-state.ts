export const UNRESOLVED_REFUND_STATUSES = ["reserved", "stripe_pending", "unknown", "stripe_succeeded"] as const;
export const TERMINAL_REFUND_STATUSES = ["failed", "canceled", "completed"] as const;

export type RefundAttemptStatus =
  | (typeof UNRESOLVED_REFUND_STATUSES)[number]
  | (typeof TERMINAL_REFUND_STATUSES)[number];

export function isUnresolvedRefundStatus(status: string | null | undefined): status is (typeof UNRESOLVED_REFUND_STATUSES)[number] {
  return status != null && (UNRESOLVED_REFUND_STATUSES as readonly string[]).includes(status);
}

export function canTransitionRefundAttempt(from: string, to: RefundAttemptStatus): boolean {
  if (from === "reserved") return ["unknown", "stripe_pending", "stripe_succeeded", "failed", "canceled"].includes(to);
  if (from === "unknown" || from === "stripe_pending") return ["stripe_pending", "stripe_succeeded", "failed", "canceled"].includes(to);
  return from === "stripe_succeeded" && to === "completed";
}