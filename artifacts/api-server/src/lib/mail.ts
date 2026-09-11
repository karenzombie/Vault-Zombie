import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { guestsTable, vaultsTable, db, claimEmailDeliveries, markEmailFailed, markEmailSent, markEmailSuppressed, type EmailDelivery, getGuestPersonalReport } from "@workspace/db";
import { logger } from "./logger";
import { evaluateEmailWork } from "./email-evaluator";

export const MAIL_FROM = process.env.VAULT_ZOMBIE_EMAIL_FROM ?? "Vault Zombie <noreply@vaultzombie.com>";

function appUrl() {
  const value = process.env.VAULT_ZOMBIE_APP_URL;
  if (!value) throw new Error("VAULT_ZOMBIE_APP_URL must be configured before email links can be created.");
  return value.replace(/\/$/, "");
}
function unsubscribeToken(guestId: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET must be configured before guest unsubscribe links can be created.");
  return createHmac("sha256", secret).update(`email-unsubscribe:${guestId}`).digest("base64url");
}
export function verifyUnsubscribeToken(guestId: string, token: string) {
  const expected = Buffer.from(unsubscribeToken(guestId));
  const received = Buffer.from(token);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
function escape(value: unknown) { return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!); }

async function message(row: EmailDelivery) {
  const p = row.payload;
  const name = escape(p.vaultName ?? "your vault");
  const operatorLink = `${appUrl()}/operator/vaults/${encodeURIComponent(String(row.vaultId ?? ""))}`;
  const guestLink = appUrl();
  const giftLink = `${appUrl()}/gifts/redeem`;
  let link = operatorLink;
  let subject = "Vault Zombie update";
  let body = `There is an update for ${name}.`;
  let textBody = `There is an update for ${String(p.vaultName ?? "your vault")}.`;
  if (row.eventType === "guest_submission_confirmation") { subject = "Your prediction is sealed"; body = `Your prediction for ${name} is sealed until its reveal date.`; link = guestLink; }
  if (row.eventType === "operator_vault_sealed") { subject = "Your Vault Zombie vault is sealed"; body = `${name} is sealed and ready for guest predictions.`; }
  if (row.eventType === "reveal_operator" || row.eventType === "reveal_guest") { subject = `A reveal is ready for ${name}`; body = `The ${escape(p.revealLabel ?? "scheduled")} reveal is now available.`; if (row.eventType === "reveal_guest") link = guestLink; }
  if (row.eventType === "guest_personal_report") {
    if (!row.vaultId || !row.recipientGuestId) throw new Error("Guest report delivery is missing vault or guest identity.");
    const [vault] = await db.select({ operatorId: vaultsTable.operatorId }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
    if (!vault) throw new Error("Guest report vault no longer exists.");
    const report = await getGuestPersonalReport(row.vaultId, vault.operatorId, row.recipientGuestId);
    subject = `Your personal report for ${name}`;
    const answers = report.answers.filter((answer) => answer.revealSlotId === row.revealSlotId);
    const outcome = (tier: string | null) => tier === "full" ? "Called it" : tier === "half" ? "Sort of" : tier === "zero" ? "Missed" : "Keepsake";
    const lines = answers.map((answer) => {
      const value = answer.textValue ?? answer.numberValue ?? answer.optionLabel ?? "";
      return `${answer.prompt}: ${value} — ${outcome(answer.outcomeTier)}${answer.operatorNote ? ` (${answer.operatorNote})` : ""}`;
    });
    const summary = `Your results: ${report.score.full} called it, ${report.score.half} sort of, ${report.score.zero} missed.${report.rank ? ` Your rank is ${report.rank}.` : ""}`;
    textBody = `${summary}\n\n${lines.join("\n")}`;
    body = `${escape(summary)}<br><br>${lines.map(escape).join("<br>")}`;
    link = guestLink;
  }
  if (row.eventType.startsWith("operator_overage")) { subject = `Guest overage needs attention: ${name}`; body = `This vault has submissions awaiting your resolution.`; }
  if (row.eventType === "gift_delivery") { subject = "Your Vault Zombie gift code"; body = `Your gift code is ${escape(p.giftCode)}.`; link = giftLink; }
  const unsubscribe = row.recipientGuestId ? `${appUrl()}/api/email/unsubscribe/${row.recipientGuestId}?token=${encodeURIComponent(unsubscribeToken(row.recipientGuestId))}` : null;
  const footer = unsubscribe ? `\n\nUnsubscribe: ${unsubscribe}\nOpting out means no unlock and no outcome updates because results are not shown through guest links.` : "";
  const text = `${row.eventType === "guest_personal_report" ? textBody : String(body).replace(/<[^>]+>/g, "")}\n\nView: ${link}${footer}`;
  return { subject, text, html: `<main style="font-family:system-ui;max-width:600px;margin:auto;color:#1f2937"><h1 style="color:#742b3f">Vault Zombie</h1><p>${body}</p><p><a href="${link}">Open Vault Zombie</a></p>${unsubscribe ? `<p style="font-size:12px"><a href="${unsubscribe}">Unsubscribe from guest email</a><br>Opting out means no unlock and no outcome updates because results are not shown through guest links.</p>` : ""}</main>` };
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