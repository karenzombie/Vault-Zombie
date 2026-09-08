import { and, eq, gte, inArray, isNotNull, isNull, lte, or } from "drizzle-orm";
import { accountsTable, answersTable, db, enqueueEmail, getGuestRevealReportEligibility, giftsTable, guestsTable, overageEventsTable, revealSlotsTable, submissionsTable, vaultsTable } from "@workspace/db";
import { logger } from "./logger";

/** DB-derived recurring work. Dedupe keys make this safe after downtime/restarts. */
export async function evaluateEmailWork(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  // This reads only identity/metadata to recover authorized early unlocks; it
  // deliberately never reads answer values.
  const overridden = await db.select({ revealSlotId: answersTable.revealSlotId }).from(answersTable)
    .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
    .innerJoin(vaultsTable, eq(submissionsTable.vaultId, vaultsTable.id))
    .where(and(eq(vaultsTable.status, "sealed"), lte(answersTable.unlockOverrideAt, now), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
  const overrideSlotIds = [...new Set(overridden.map((row) => row.revealSlotId))];
  const sealed = await db.select({ id: vaultsTable.id, name: vaultsTable.name, email: accountsTable.email })
    .from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
    .where(eq(vaultsTable.status, "sealed"));
  let queued = 0;
  for (const vault of sealed) {
    if (await enqueueEmail({ dedupeKey: `vault-sealed:${vault.id}`, eventType: "operator_vault_sealed", recipientEmail: vault.email, vaultId: vault.id, payload: { vaultName: vault.name } })) queued++;
  }
  const purchasedGifts = await db.select({ id: giftsTable.id, email: giftsTable.gifterEmail, code: giftsTable.code }).from(giftsTable)
    .where(and(eq(giftsTable.status, "purchased"), isNotNull(giftsTable.gifterEmail)));
  for (const gift of purchasedGifts) {
    if (await enqueueEmail({ dedupeKey: `gift-delivery:${gift.id}`, eventType: "gift_delivery", recipientEmail: gift.email!, giftId: gift.id, payload: { giftCode: gift.code } })) queued++;
  }
  const slots = await db.select({
    id: revealSlotsTable.id, vaultId: vaultsTable.id, vaultName: vaultsTable.name, label: revealSlotsTable.label,
    operatorId: vaultsTable.operatorId, operatorEmail: accountsTable.email,
  }).from(revealSlotsTable).innerJoin(vaultsTable, eq(revealSlotsTable.vaultId, vaultsTable.id))
    .innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
    .where(and(eq(vaultsTable.status, "sealed"), overrideSlotIds.length
      ? or(lte(revealSlotsTable.revealDate, today), inArray(revealSlotsTable.id, overrideSlotIds))
      : lte(revealSlotsTable.revealDate, today)));
  for (const slot of slots) {
    if (await enqueueEmail({ dedupeKey: `reveal-operator:${slot.id}`, eventType: "reveal_operator", recipientEmail: slot.operatorEmail, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName, revealLabel: slot.label } })) queued++;
    const guests = await db.select({ id: guestsTable.id, email: guestsTable.email }).from(guestsTable)
      .innerJoin(submissionsTable, eq(submissionsTable.guestId, guestsTable.id))
      .innerJoin(answersTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, slot.id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt), isNotNull(guestsTable.email), eq(guestsTable.emailOptedOut, false)));
    for (const guest of new Map(guests.map((g) => [g.id, g])).values()) {
      if (await enqueueEmail({ dedupeKey: `reveal-guest:${slot.id}:${guest.id}`, eventType: "reveal_guest", recipientEmail: guest.email!, recipientGuestId: guest.id, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName, revealLabel: slot.label } })) queued++;
      try {
        const eligibility = await getGuestRevealReportEligibility(slot.vaultId, slot.operatorId, guest.id, slot.id);
        if (eligibility.eligible && await enqueueEmail({ dedupeKey: `guest-report:${slot.id}:${guest.id}`, eventType: "guest_personal_report", recipientEmail: guest.email!, recipientGuestId: guest.id, vaultId: slot.vaultId, revealSlotId: slot.id, payload: { vaultName: slot.vaultName } })) queued++;
      } catch (error) { logger.warn({ err: error, guestId: guest.id, revealSlotId: slot.id }, "Guest report email was not yet eligible"); }
    }
  }
  const events = await db.select({ id: overageEventsTable.id, vaultId: vaultsTable.id, vaultName: vaultsTable.name, email: accountsTable.email })
    .from(overageEventsTable).innerJoin(vaultsTable, eq(overageEventsTable.vaultId, vaultsTable.id)).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id)).where(isNull(overageEventsTable.resolvedAt));
  for (const event of events) {
    if (await enqueueEmail({ dedupeKey: `overage-initial:${event.id}`, eventType: "operator_overage_initial", recipientEmail: event.email, vaultId: event.vaultId, payload: { vaultName: event.vaultName } })) queued++;
    const [near] = await db.select({ id: revealSlotsTable.id }).from(revealSlotsTable).where(and(eq(revealSlotsTable.vaultId, event.vaultId), gte(revealSlotsTable.revealDate, today), lte(revealSlotsTable.revealDate, new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10)))).limit(1);
    if (near && await enqueueEmail({ dedupeKey: `overage-escalation:${event.id}`, eventType: "operator_overage_escalation", recipientEmail: event.email, vaultId: event.vaultId, payload: { vaultName: event.vaultName } })) queued++;
  }
  return { queued, dueSlots: slots.length };
}