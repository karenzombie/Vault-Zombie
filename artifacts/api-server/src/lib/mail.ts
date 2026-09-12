import { and, eq } from "drizzle-orm";
import { guestsTable, db, claimEmailDeliveries, markEmailFailed, markEmailSent, markEmailSuppressed } from "@workspace/db";
import { logger } from "./logger";
import { evaluateEmailWork } from "./email-evaluator";
import { renderEmail, verifyUnsubscribeToken } from "./email/render";

export const MAIL_FROM = process.env.VAULT_ZOMBIE_EMAIL_FROM ?? "Vault Zombie <noreply@vaultzombie.com>";
export { verifyUnsubscribeToken };

async function message(row: Parameters<typeof renderEmail>[0]) {
  return renderEmail(row);
}

export async function processEmailOutbox() {
  const rows = await claimEmailDeliveries();
  let sent = 0;
  for (const row of rows) {
    try {
      if (row.recipientGuestId) {
        const [guest] = await db.select({ optedOut: guestsTable.emailOptedOut, email: guestsTable.email }).from(guestsTable).where(and(eq(guestsTable.id, row.recipientGuestId), eq(guestsTable.email, row.recipientEmail))).limit(1);
        if (!guest || guest.optedOut) { await markEmailSuppressed(row.id, row.claimToken!, "Guest opted out"); continue; }
      }
      const key = process.env.RESEND_API_KEY;
      if (!key) throw new Error("RESEND_API_KEY must be configured to send transactional email.");
      const rendered = await message(row);
      const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": row.dedupeKey }, body: JSON.stringify({ from: MAIL_FROM, to: [row.recipientEmail], ...rendered }) });
      const data = await response.json() as { id?: string; message?: string };
      if (!response.ok || !data.id) throw new Error(data.message ?? `Resend returned ${response.status}`);
      if (await markEmailSent(row.id, row.claimToken!, data.id)) sent += 1;
    } catch (error) { await markEmailFailed(row.id, row.claimToken!, error instanceof Error ? error.message : "Unknown delivery failure"); logger.error({ err: error, emailDeliveryId: row.id }, "Email delivery failed"); }
  }
  return { claimed: rows.length, sent, guarded: false };
}

export async function runEmailCycle() {
  const evaluation = await evaluateEmailWork();
  const delivery = await processEmailOutbox();
  return { ...evaluation, ...delivery };
}