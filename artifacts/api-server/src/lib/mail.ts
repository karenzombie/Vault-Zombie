import { and, eq, isNull } from "drizzle-orm";
import { accountsTable, answersTable, guestsTable, submissionsTable, db, claimEmailDeliveries, claimEmailDeliveryById, enqueueEmail, getGuestRevealReportEligibility, markEmailFailed, markEmailSent, markEmailSuppressed, revealSlotsTable, todayInTimeZone, vaultsTable, type EmailEventType } from "@workspace/db";
import { logger } from "./logger";
import { formatElapsedTime } from "./format";
import { evaluateEmailWork } from "./email-evaluator";
import { renderEmail, verifyUnsubscribeToken } from "./email/render";

export const MAIL_FROM = process.env.VAULT_ZOMBIE_EMAIL_FROM ?? "Vault Zombie <noreply@vaultzombie.com>";
export { verifyUnsubscribeToken };

type ClaimedRow = Awaited<ReturnType<typeof claimEmailDeliveries>>[number];

async function message(row: Parameters<typeof renderEmail>[0]) {
  return renderEmail(row);
}

/**
 * Sends one already-claimed row and finalizes its status. Shared by the
 * recurring outbox sweep and an action-triggered immediate send, so both
 * paths use one send implementation and one set of dedupe/opt-out checks.
 */
async function sendClaimedRow(row: ClaimedRow): Promise<boolean> {
  try {
    if (row.recipientGuestId) {
      const [guest] = await db.select({ optedOut: guestsTable.emailOptedOut, email: guestsTable.email }).from(guestsTable).where(and(eq(guestsTable.id, row.recipientGuestId), eq(guestsTable.email, row.recipientEmail))).limit(1);
      if (!guest || guest.optedOut) { await markEmailSuppressed(row.id, row.claimToken!, "Guest opted out"); return false; }
    }
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY must be configured to send transactional email.");
    const rendered = await message(row);
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": row.dedupeKey }, body: JSON.stringify({ from: MAIL_FROM, to: [row.recipientEmail], ...rendered }) });
    const data = await response.json() as { id?: string; message?: string };
    if (!response.ok || !data.id) throw new Error(data.message ?? `Resend returned ${response.status}`);
    return await markEmailSent(row.id, row.claimToken!, data.id);
  } catch (error) {
    await markEmailFailed(row.id, row.claimToken!, error instanceof Error ? error.message : "Unknown delivery failure");
    logger.error({ err: error, emailDeliveryId: row.id }, "Email delivery failed");
    return false;
  }
}

export async function processEmailOutbox() {
  const rows = await claimEmailDeliveries();
  let sent = 0;
  for (const row of rows) {
    if (await sendClaimedRow(row)) sent += 1;
  }
  return { claimed: rows.length, sent, guarded: false };
}

/**
 * Attempts immediate delivery of one just-queued row, for the action-triggered
 * sends in build brief addendum 2 section 6. Call this after the action's own
 * database changes are committed, without awaiting it from the request path
 * (fire-and-forget), so a slow or failed send never blocks or fails the
 * action. It claims the row with the same atomic claim the recurring outbox
 * sweep uses, so the two paths can never both send it: whichever claims first
 * wins, and a failed attempt here leaves the row for the recurring check to
 * retry. If the row was already claimed, sent, or suppressed by the time this
 * runs, it is a no-op.
 */
export async function sendEmailNow(deliveryId: string, eventType?: EmailEventType): Promise<void> {
  try {
    const row = await claimEmailDeliveryById(deliveryId);
    if (!row) return;
    await sendClaimedRow(row);
  } catch (error) {
    logger.error({ err: error, emailDeliveryId: deliveryId, eventType }, "Immediate email send failed");
  }
}

/**
 * G2 (results), to one guest — queues and immediately attempts delivery the moment the
 * host marks that guest's last unmarked scoreable prediction in a reveal (build brief
 * addendum 2, section 6.1/6.2). Reuses the exact eligibility rule the recurring check
 * uses (getGuestRevealReportEligibility) and the exact dedupe key it enqueues under, so
 * the two paths can never send this guest's report twice. Call this after the verdict
 * write has committed.
 */
export async function sendGuestReportIfEligible(vaultId: string, operatorId: string, guestId: string, revealSlotId: string): Promise<void> {
  try {
    const [guest] = await db.select({ email: guestsTable.email, optedOut: guestsTable.emailOptedOut }).from(guestsTable).where(eq(guestsTable.id, guestId)).limit(1);
    if (!guest?.email || guest.optedOut) return;
    const [slot] = await db.select({ revealDate: revealSlotsTable.revealDate, manualUnlockEmailsEnabled: revealSlotsTable.manualUnlockEmailsEnabled }).from(revealSlotsTable).where(eq(revealSlotsTable.id, revealSlotId)).limit(1);
    if (!slot) return;
    const [vault] = await db.select({ name: vaultsTable.name, timeZone: vaultsTable.timeZone }).from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
    if (!vault) return;
    // "Today" is this vault's own time zone (section 7.8); a sealed vault always has one.
    const today = todayInTimeZone(new Date(), vault.timeZone);
    if (!(slot.revealDate <= today || slot.manualUnlockEmailsEnabled === true)) return;
    const eligibility = await getGuestRevealReportEligibility(vaultId, operatorId, guestId, revealSlotId);
    if (!eligibility.eligible) return;
    const row = await enqueueEmail({ dedupeKey: `guest-report:${revealSlotId}:${guestId}`, eventType: "guest_personal_report", recipientEmail: guest.email, recipientGuestId: guestId, vaultId, revealSlotId, payload: { vaultName: vault.name } });
    if (row) await sendEmailNow(row.id, "guest_personal_report");
  } catch (error) {
    logger.error({ err: error, vaultId, guestId, revealSlotId }, "Immediate guest report email failed");
  }
}

/**
 * H5 (reveal ready) and G2 (results), for one reveal slot the admin has just opened
 * early with the "send emails" option checked (build brief addendum 2, section 6.2).
 * Call this after the unlock transaction has committed. The existing opt-in rule is
 * unchanged: this only fires when the caller has already set
 * revealSlotsTable.manualUnlockEmailsEnabled for this slot. Uses the same dedupe keys
 * as the recurring check, so re-running the recurring check afterward cannot double-send.
 */
export async function sendManualUnlockEmails(revealSlotId: string): Promise<void> {
  try {
    const [slot] = await db.select({
      id: revealSlotsTable.id, vaultId: vaultsTable.id, vaultName: vaultsTable.name, label: revealSlotsTable.label,
      revealDate: revealSlotsTable.revealDate, operatorId: vaultsTable.operatorId, operatorEmail: accountsTable.email,
      sealedAt: vaultsTable.sealedAt,
    }).from(revealSlotsTable).innerJoin(vaultsTable, eq(revealSlotsTable.vaultId, vaultsTable.id))
      .innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
      .where(eq(revealSlotsTable.id, revealSlotId)).limit(1);
    if (!slot) return;
    const guestRows = await db.select({ id: guestsTable.id }).from(guestsTable)
      .innerJoin(submissionsTable, eq(submissionsTable.guestId, guestsTable.id))
      .innerJoin(answersTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, revealSlotId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
    const uniqueGuestIds = [...new Set(guestRows.map((row) => row.id))];
    const predictionCount = await db.selectDistinct({ submissionId: answersTable.submissionId }).from(answersTable)
      .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, slot.vaultId), eq(answersTable.revealSlotId, revealSlotId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
    const row = await enqueueEmail({
      dedupeKey: `reveal-operator:${slot.id}`, eventType: "reveal_operator", recipientEmail: slot.operatorEmail, vaultId: slot.vaultId,
      revealSlotId: slot.id,
      payload: { vaultName: slot.vaultName, revealLabel: slot.label, revealDate: slot.revealDate, guestCount: uniqueGuestIds.length, predictionCount: predictionCount.length, elapsedSinceSealing: slot.sealedAt ? formatElapsedTime(slot.sealedAt, new Date()) : "some time" },
    });
    if (row) void sendEmailNow(row.id, "reveal_operator");
    for (const guestId of uniqueGuestIds) void sendGuestReportIfEligible(slot.vaultId, slot.operatorId, guestId, revealSlotId);
  } catch (error) {
    logger.error({ err: error, revealSlotId }, "Immediate manual-unlock emails failed");
  }
}

export async function runEmailCycle() {
  const evaluation = await evaluateEmailWork();
  const delivery = await processEmailOutbox();
  return { ...evaluation, ...delivery };
}