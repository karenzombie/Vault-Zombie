import { and, asc, eq, inArray, lt, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "./index";
import { emailDeliveriesTable } from "./schema/email";
import { guestsTable } from "./schema/predictions";

export type EmailEventType =
  | "guest_submission_confirmation" | "reveal_operator"
  | "guest_personal_report" | "operator_vault_sealed"
  | "operator_overage_initial" | "operator_overage_escalation" | "gift_delivery"
  | "host_welcome" | "vault_created" | "host_receipt" | "unmarked_reveal_nudge"
  | "gift_recipient_delivery" | "gift_redeemed";

/**
 * Enqueues an email delivery row. Accepts an optional transaction handle so callers that
 * enqueue an email referencing a row inserted earlier in the same transaction (e.g. a
 * freshly created vault) can pass that transaction through; otherwise the foreign key on
 * the referenced row is checked against a separate connection that cannot see the
 * uncommitted insert yet, and the enqueue (and the whole transaction) fails.
 */
export async function enqueueEmail(input: {
  dedupeKey: string; eventType: EmailEventType; recipientEmail: string;
  recipientGuestId?: string | null; vaultId?: string | null; revealSlotId?: string | null;
  giftId?: string | null;
  payload?: Record<string, unknown>;
}, dbClient: Pick<typeof db, "insert"> = db) {
  const [row] = await dbClient.insert(emailDeliveriesTable).values({
    ...input, recipientGuestId: input.recipientGuestId ?? null, vaultId: input.vaultId ?? null,
    revealSlotId: input.revealSlotId ?? null, giftId: input.giftId ?? null, payload: input.payload ?? {},
  }).onConflictDoNothing({ target: emailDeliveriesTable.dedupeKey }).returning();
  return row ?? null;
}

/** Claims one row under a row lock. Sending is deliberately performed outside this transaction. */
export async function claimEmailDeliveries(limit = 20) {
  return db.transaction(async (tx) => {
    const stale = new Date(Date.now() - 10 * 60_000);
    const candidates = await tx.select().from(emailDeliveriesTable).where(or(
      eq(emailDeliveriesTable.status, "queued"),
      and(eq(emailDeliveriesTable.status, "sending"), lt(emailDeliveriesTable.claimedAt, stale)),
    )).orderBy(asc(emailDeliveriesTable.createdAt)).limit(limit).for("update", { skipLocked: true });
    if (!candidates.length) return [];
    const ids = candidates.map((row) => row.id);
    const claimToken = randomUUID();
    const claimed = await tx.update(emailDeliveriesTable).set({
      status: "sending", claimedAt: new Date(),
      claimToken,
      attempts: sql`${emailDeliveriesTable.attempts} + 1`,
    }).where(inArray(emailDeliveriesTable.id, ids)).returning();
    return claimed;
  });
}

/**
 * Claims one specific row by id, under the same row lock and staleness rule as
 * claimEmailDeliveries. Used for an action-triggered immediate send so it
 * never races the recurring check's claim of the same row.
 */
export async function claimEmailDeliveryById(id: string) {
  return db.transaction(async (tx) => {
    const stale = new Date(Date.now() - 10 * 60_000);
    const [row] = await tx.select().from(emailDeliveriesTable).where(and(
      eq(emailDeliveriesTable.id, id),
      or(
        eq(emailDeliveriesTable.status, "queued"),
        and(eq(emailDeliveriesTable.status, "sending"), lt(emailDeliveriesTable.claimedAt, stale)),
      ),
    )).limit(1).for("update", { skipLocked: true });
    if (!row) return null;
    const claimToken = randomUUID();
    const [claimed] = await tx.update(emailDeliveriesTable).set({
      status: "sending", claimedAt: new Date(), claimToken,
      attempts: sql`${emailDeliveriesTable.attempts} + 1`,
    }).where(eq(emailDeliveriesTable.id, row.id)).returning();
    return claimed ?? null;
  });
}

export async function markEmailSent(id: string, claimToken: string, providerId: string) {
  const rows = await db.update(emailDeliveriesTable).set({ status: "sent", providerId, sentAt: new Date(), lastError: null }).where(and(eq(emailDeliveriesTable.id, id), eq(emailDeliveriesTable.claimToken, claimToken), eq(emailDeliveriesTable.status, "sending"))).returning({ id: emailDeliveriesTable.id });
  return rows.length === 1;
}
export async function markEmailFailed(id: string, claimToken: string, error: string) {
  const rows = await db.update(emailDeliveriesTable).set({ status: "failed", lastError: error.slice(0, 2000), claimedAt: null, claimToken: null }).where(and(eq(emailDeliveriesTable.id, id), eq(emailDeliveriesTable.claimToken, claimToken), eq(emailDeliveriesTable.status, "sending"))).returning({ id: emailDeliveriesTable.id });
  return rows.length === 1;
}
export async function markEmailSuppressed(id: string, claimToken: string, reason: string) {
  const rows = await db.update(emailDeliveriesTable).set({ status: "suppressed", lastError: reason, claimedAt: null, claimToken: null }).where(and(eq(emailDeliveriesTable.id, id), eq(emailDeliveriesTable.claimToken, claimToken), eq(emailDeliveriesTable.status, "sending"))).returning({ id: emailDeliveriesTable.id });
  return rows.length === 1;
}
export async function requeueEmail(id: string) {
  await db.update(emailDeliveriesTable).set({ status: "queued", lastError: null, claimedAt: null, claimToken: null }).where(eq(emailDeliveriesTable.id, id));
}
export async function optOutGuestEmail(guestId: string) {
  await db.transaction(async (tx) => {
    await tx.update(guestsTable).set({ emailOptedOut: true }).where(eq(guestsTable.id, guestId));
    await tx.update(emailDeliveriesTable).set({ status: "suppressed", lastError: "Guest opted out", claimedAt: null, claimToken: null })
      .where(and(eq(emailDeliveriesTable.recipientGuestId, guestId), inArray(emailDeliveriesTable.status, ["queued", "sending"])));
  });
}

/** Re-subscribes a guest to vault email. Does not resurrect already-suppressed deliveries. */
export async function resubscribeGuestEmail(guestId: string) {
  await db.update(guestsTable).set({ emailOptedOut: false }).where(eq(guestsTable.id, guestId));
}

/** Admin/operator toggle: sets a guest's subscription status directly, either direction. */
export async function setGuestEmailSubscription(guestId: string, subscribed: boolean) {
  if (subscribed) return resubscribeGuestEmail(guestId);
  return optOutGuestEmail(guestId);
}