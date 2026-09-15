import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "./index";
import {
  answersTable,
  guestsTable,
  submissionsTable,
} from "./schema/predictions";
import { revealSlotsTable, vaultsTable } from "./schema/vaults";
import { todayInTimeZone } from "./timezone";

export interface UnlockedAnswerScope {
  vaultId: string;
  revealSlotId?: string;
  guestId?: string;
  now?: Date;
  /** A transaction may be supplied so a reveal mutation reads and writes atomically. */
  database?: Pick<typeof db, "select">;
}

/**
 * The sole ordinary read path for prediction content.
 *
 * Admin full export is deliberately separate and must be protected by fresh MFA,
 * typed reason, and an audit event. Manual unlock still uses this function after
 * setting unlockOverrideAt.
 *
 * An answer's unlock date is not stored on the answer itself. It is read from the
 * reveal slot the answer belongs to (revealSlotsTable.revealDate), compared against
 * now's date, so there is one date in one place and it can never drift from the
 * slot's own schedule. unlockOverrideAt remains the sole sanctioned exception
 * (admin manual unlock), unchanged.
 */
export async function readUnlockedAnswers(scope: UnlockedAnswerScope) {
  const now = scope.now ?? new Date();
  const database = scope.database ?? db;
  // The sealed rule's "today" is the vault's own time zone (build brief addendum 2,
  // section 7.8), computed through the one shared helper. A draft has no time zone yet,
  // but a draft is never sealed and this function only ever reads sealed vaults'
  // predictions in practice, so the UTC fallback in todayInTimeZone is not reached here.
  const [vault] = await database.select({ timeZone: vaultsTable.timeZone }).from(vaultsTable).where(eq(vaultsTable.id, scope.vaultId)).limit(1);
  const today = todayInTimeZone(now, vault?.timeZone ?? null);
  const conditions = [
    eq(submissionsTable.vaultId, scope.vaultId),
    isNull(submissionsTable.heldAt),
    isNull(submissionsTable.archivedAt),
    isNull(submissionsTable.culledAt),
    or(
      lte(answersTable.unlockOverrideAt, now),
      and(
        isNull(answersTable.unlockOverrideAt),
        lte(revealSlotsTable.revealDate, today),
      ),
    ),
  ];

  if (scope.revealSlotId) {
    conditions.push(eq(answersTable.revealSlotId, scope.revealSlotId));
  }
  if (scope.guestId) {
    conditions.push(eq(submissionsTable.guestId, scope.guestId));
  }

  return database
    .select({
      id: answersTable.id,
      submissionId: answersTable.submissionId,
      guestId: submissionsTable.guestId,
      guestDisplayName: guestsTable.displayName,
      vaultQuestionId: answersTable.vaultQuestionId,
      revealSlotId: answersTable.revealSlotId,
      answerType: answersTable.answerType,
      textValue: answersTable.textValue,
      numberValue: answersTable.numberValue,
      optionId: answersTable.optionId,
      unlockAt: sql<Date>`(${revealSlotsTable.revealDate}::timestamptz)`,
      unlockOverrideAt: answersTable.unlockOverrideAt,
      createdAt: answersTable.createdAt,
    })
    .from(answersTable)
    .innerJoin(
      submissionsTable,
      eq(answersTable.submissionId, submissionsTable.id),
    )
    .innerJoin(guestsTable, eq(submissionsTable.guestId, guestsTable.id))
    .innerJoin(
      revealSlotsTable,
      eq(answersTable.revealSlotId, revealSlotsTable.id),
    )
    .where(and(...conditions));
}
