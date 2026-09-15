import { and, eq, gte, isNotNull, isNull, lte, min, or } from "drizzle-orm";
import { accountsTable, addDaysToDateString, answerVerdictsTable, answersTable, db, enqueueEmail, getGuestRevealReportEligibility, guestsTable, overageEventsTable, questionsTable, revealSlotsTable, submissionsTable, todayInTimeZone, vaultQuestionsTable, vaultsTable } from "@workspace/db";
import { daysBetween, formatElapsedTime } from "./format";
import { logger } from "./logger";

/**
 * DB-derived recurring work. Dedupe keys make this safe after downtime/restarts.
 * "Today" for every reveal-date comparison is each vault's own time zone (build brief
 * addendum 2, section 7.8) rather than one global date, since sibling vaults can be
 * sealed in different zones; a sealed vault always has one (sealing requires it).
 */
export async function evaluateEmailWork(now = new Date()) {
  // This reads only identity/metadata to recover authorized early unlocks; it
  // deliberately never reads answer values.
  const overridden = await db.select({ revealSlotId: answersTable.revealSlotId, earliestOverrideAt: min(answersTable.unlockOverrideAt) })
    .from(answersTable)
    .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
    .innerJoin(vaultsTable, eq(submissionsTable.vaultId, vaultsTable.id))
    .where(and(eq(vaultsTable.status, "sealed"), lte(answersTable.unlockOverrideAt, now), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)))
    .groupBy(answersTable.revealSlotId);
  const overrideOpenedAt = new Map(overridden.map((row) => [row.revealSlotId, row.earliestOverrideAt as Date]));
  const overrideSlotIds = [...overrideOpenedAt.keys()];
  const sealed = await db.select({ id: vaultsTable.id, name: vaultsTable.name, email: accountsTable.email })
    .from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
    .where(eq(vaultsTable.status, "sealed"));
  let queued = 0;
  for (const vault of sealed) {
    if (await enqueueEmail({ dedupeKey: `vault-sealed:${vault.id}`, eventType: "operator_vault_sealed", recipientEmail: vault.email, vaultId: vault.id, payload: { vaultName: vault.name } })) queued++;
  }
  // F1/F2 (gift purchase delivery) and H3 (host receipt) are enqueued directly by the
  // verified Stripe webhook handler at the moment payment is confirmed (spec 5.2); this
  // evaluator does not duplicate them.
  // Every vault's own timezone-aware today is unknown to SQL ahead of time (different
  // sealed vaults can be in different zones), so the date comparison itself happens in
  // JS below, once for each slot against its own vault's time zone.
  const slots = (await db.select({
    id: revealSlotsTable.id, vaultId: vaultsTable.id, vaultName: vaultsTable.name, label: revealSlotsTable.label,
    revealDate: revealSlotsTable.revealDate, manualUnlockEmailsEnabled: revealSlotsTable.manualUnlockEmailsEnabled,
    operatorId: vaultsTable.operatorId, operatorEmail: accountsTable.email, sealedAt: vaultsTable.sealedAt,
    timeZone: vaultsTable.timeZone,
  }).from(revealSlotsTable).innerJoin(vaultsTable, eq(revealSlotsTable.vaultId, vaultsTable.id))
    .innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
    .where(eq(vaultsTable.status, "sealed"))).filter((slot) => {
      const vaultToday = todayInTimeZone(now, slot.timeZone);
      return slot.revealDate <= vaultToday || overrideSlotIds.includes(slot.id);
    });
  // A reveal opened early by an admin is eligible only when the admin opted in; once its
  // natural reveal date arrives it becomes eligible regardless (spec 5.1). "Today" is
  // each slot's own vault's time zone.
  const eligibleSlots = slots.filter((slot) => slot.revealDate <= todayInTimeZone(now, slot.timeZone) || slot.manualUnlockEmailsEnabled === true);
  for (const slot of eligibleSlots) {
    const guests = await db.select({ id: guestsTable.id, email: guestsTable.email }).from(guestsTable)
      .innerJoin(submissionsTable, eq(submissionsTable.guestId, guestsTable.id))
      .innerJoin(answersTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, slot.id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt), isNotNull(guestsTable.email), eq(guestsTable.emailOptedOut, false)));
    const uniqueGuests = [...new Map(guests.map((g) => [g.id, g])).values()];
    const predictionRows = await db.selectDistinct({ submissionId: answersTable.submissionId }).from(answersTable)
      .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, slot.id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
    if (await enqueueEmail({ dedupeKey: `reveal-operator:${slot.id}`, eventType: "reveal_operator", recipientEmail: slot.operatorEmail, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName, revealLabel: slot.label, revealDate: slot.revealDate, guestCount: uniqueGuests.length, predictionCount: predictionRows.length, elapsedSinceSealing: slot.sealedAt ? formatElapsedTime(slot.sealedAt, now) : "some time" } })) queued++;
    for (const guest of uniqueGuests) {
      try {
        const eligibility = await getGuestRevealReportEligibility(slot.vaultId, slot.operatorId, guest.id, slot.id);
        if (eligibility.eligible && await enqueueEmail({ dedupeKey: `guest-report:${slot.id}:${guest.id}`, eventType: "guest_personal_report", recipientEmail: guest.email!, recipientGuestId: guest.id, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName } })) queued++;
      } catch (error) { logger.warn({ err: error, guestId: guest.id, revealSlotId: slot.id }, "Guest report email was not yet eligible"); }
    }
    // H6: nudge the host once a reveal has sat unmarked for 3+ days with scoreable
    // predictions still lacking a verdict. "Unmarked prediction" is approximated at
    // submission granularity (one guest's full answer bundle for this reveal), matching
    // the app's existing prediction-count convention elsewhere.
    const openedAt = slot.revealDate <= todayInTimeZone(now, slot.timeZone) ? new Date(`${slot.revealDate}T00:00:00.000Z`) : overrideOpenedAt.get(slot.id) ?? null;
    if (openedAt && daysBetween(openedAt, now) >= 3) {
      const unscored = await db.selectDistinct({ submissionId: answersTable.submissionId }).from(answersTable)
        .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
        .innerJoin(vaultQuestionsTable, eq(answersTable.vaultQuestionId, vaultQuestionsTable.id))
        .innerJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
        .leftJoin(answerVerdictsTable, eq(answerVerdictsTable.answerId, answersTable.id))
        .where(and(
          eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, slot.id),
          isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt),
          isNull(answerVerdictsTable.id),
          or(eq(questionsTable.answerType, "number"), eq(questionsTable.answerType, "name_pick"), eq(questionsTable.answerType, "multiple_choice"), eq(questionsTable.freeTextMode, "scoreable")),
        ));
      if (unscored.length && await enqueueEmail({ dedupeKey: `reveal-nudge:${slot.id}`, eventType: "unmarked_reveal_nudge", recipientEmail: slot.operatorEmail, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName, daysSinceOpened: daysBetween(openedAt, now), guestCount: uniqueGuests.length, unmarkedPredictionCount: unscored.length } })) queued++;
    }
  }
  const events = await db.select({ id: overageEventsTable.id, vaultId: vaultsTable.id, vaultName: vaultsTable.name, email: accountsTable.email, timeZone: vaultsTable.timeZone })
    .from(overageEventsTable).innerJoin(vaultsTable, eq(overageEventsTable.vaultId, vaultsTable.id)).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id)).where(isNull(overageEventsTable.resolvedAt));
  for (const event of events) {
    if (await enqueueEmail({ dedupeKey: `overage-initial:${event.id}`, eventType: "operator_overage_initial", recipientEmail: event.email, vaultId: event.vaultId, payload: { vaultName: event.vaultName } })) queued++;
    // "Within the next 7 days" is measured from this vault's own today (section 7.8); an
    // overage event's vault may still be a draft with no time zone chosen yet, which
    // falls back to UTC for this window only.
    const eventToday = todayInTimeZone(now, event.timeZone);
    const [near] = await db.select({ id: revealSlotsTable.id }).from(revealSlotsTable).where(and(eq(revealSlotsTable.vaultId, event.vaultId), gte(revealSlotsTable.revealDate, eventToday), lte(revealSlotsTable.revealDate, addDaysToDateString(eventToday, 7)))).limit(1);
    if (near && await enqueueEmail({ dedupeKey: `overage-escalation:${event.id}`, eventType: "operator_overage_escalation", recipientEmail: event.email, vaultId: event.vaultId, payload: { vaultName: event.vaultName } })) queued++;
  }
  return { queued, dueSlots: slots.length };
}