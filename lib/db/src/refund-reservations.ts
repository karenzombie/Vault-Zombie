import { and, eq, inArray } from "drizzle-orm";
import { db } from "./index";
import { billingRecordsTable, giftsTable, refundAttemptsTable } from "./schema/billing";
import { UNRESOLVED_REFUND_STATUSES } from "./refund-state";

type QueryExecutor = Pick<typeof db, "select">;

export async function findUnresolvedRefundReservation(
  executor: QueryExecutor,
  target: { giftId: string } | { billingRecordId: string } | { vaultId: string },
) {
  if ("giftId" in target) {
    const [attempt] = await executor.select().from(refundAttemptsTable).where(and(
      eq(refundAttemptsTable.giftId, target.giftId),
      inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
    )).limit(1);
    return attempt;
  }
  if ("billingRecordId" in target) {
    const [attempt] = await executor.select().from(refundAttemptsTable).where(and(
      eq(refundAttemptsTable.billingRecordId, target.billingRecordId),
      inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
    )).limit(1);
    return attempt;
  }
  const [attempt] = await executor.select({ attempt: refundAttemptsTable })
    .from(refundAttemptsTable)
    .innerJoin(billingRecordsTable, eq(refundAttemptsTable.billingRecordId, billingRecordsTable.id))
    .where(and(
      eq(billingRecordsTable.vaultId, target.vaultId),
      inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
    )).limit(1);
  if (attempt) return attempt.attempt;
  const [giftAttempt] = await executor.select({ attempt: refundAttemptsTable })
    .from(refundAttemptsTable)
    .innerJoin(giftsTable, eq(refundAttemptsTable.giftId, giftsTable.id))
    .where(and(
      eq(giftsTable.redeemedVaultId, target.vaultId),
      inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
    )).limit(1);
  return giftAttempt?.attempt;
}
