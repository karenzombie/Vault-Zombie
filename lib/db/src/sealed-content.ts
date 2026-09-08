import { and, eq, isNull, lte, or } from "drizzle-orm";
import { db } from "./index";
import {
  answersTable,
  guestsTable,
  submissionsTable,
} from "./schema/predictions";

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
 */
export async function readUnlockedAnswers(scope: UnlockedAnswerScope) {
  const now = scope.now ?? new Date();
  const database = scope.database ?? db;
  const conditions = [
    eq(submissionsTable.vaultId, scope.vaultId),
    or(
      lte(answersTable.unlockOverrideAt, now),
      and(
        isNull(answersTable.unlockOverrideAt),
        lte(answersTable.unlockAt, now),
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
      unlockAt: answersTable.unlockAt,
      unlockOverrideAt: answersTable.unlockOverrideAt,
      createdAt: answersTable.createdAt,
    })
    .from(answersTable)
    .innerJoin(
      submissionsTable,
      eq(answersTable.submissionId, submissionsTable.id),
    )
    .innerJoin(guestsTable, eq(submissionsTable.guestId, guestsTable.id))
    .where(and(...conditions));
}
