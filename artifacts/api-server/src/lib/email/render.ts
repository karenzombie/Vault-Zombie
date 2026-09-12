/**
 * One render function per of the 13 transactional emails (spec section 6),
 * using verbatim copy and the layout/formatting primitives.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  answersTable, db, getGuestPersonalReport,
  guestsTable, overageEventsTable, PLAN_POLICY, revealSlotsTable, submissionsTable,
  vaultsTable, type EmailDelivery, type PlanTier,
} from "@workspace/db";
import { TIER_ORDER, findStripePrice, getStripeClient, type PaidTier } from "../stripe";
import { daysBetween, formatEmailDate, formatEmailMoney, formatElapsedTime, formatPlanDuration } from "../format";
import { Block, FooterOptions, escapeHtml, renderDoc, resultLabel, type ResultKind } from "./layout";

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
function guestUnsubscribeUrl(guestId: string) {
  return `${appUrl()}/email/unsubscribe/${guestId}?token=${encodeURIComponent(unsubscribeToken(guestId))}`;
}

const TIER_NAME: Record<string, string> = { lockbox: "Lockbox", safe: "Safe", vault: "Vault", deep_vault: "Deep Vault" };
const SCHEDULE_NAME: Record<string, string> = {
  weekly_sprint: "Weekly Sprint", monthly_x3: "Monthly x3", monthly_year: "Monthly Year",
  half_then_annual: "Half-then-Annual", annual_keepsake: "Annual Keepsake",
};

function operatorVaultUrl(vaultId: string) { return `${appUrl()}/operator/vaults/${vaultId}`; }
function operatorRevealUrl(vaultId: string, revealSlotId?: string | null) {
  return revealSlotId ? `${appUrl()}/operator/vaults/${vaultId}/reveals/${revealSlotId}` : operatorVaultUrl(vaultId);
}
function operatorBillingUrl(vaultId: string) { return `${appUrl()}/operator/vaults/${vaultId}/billing`; }
function guestHomeUrl() { return appUrl(); }
function signUpUrl(referrerCode?: string | null) { return referrerCode ? `${appUrl()}/sign-up?ref=${encodeURIComponent(referrerCode)}` : `${appUrl()}/sign-up`; }
function giftRedeemUrl() { return `${appUrl()}/gifts/redeem`; }
function giftPurchaseUrl() { return `${appUrl()}/gifts/purchase`; }

type Doc = { subject: string; eyebrow: string; heading: string; blocks: Block[]; footer: FooterOptions };

async function findUpgradeOption(currentTier: PlanTier, guestCount: number) {
  const tiers: PaidTier[] = ["safe", "vault", "deep_vault"];
  const candidate = tiers.find((tier) => TIER_ORDER[tier] > TIER_ORDER[currentTier] && PLAN_POLICY[tier].guestCap >= guestCount);
  if (!candidate) return null;
  try {
    const stripe = getStripeClient();
    const price = await findStripePrice(stripe, currentTier, candidate);
    if (price.unit_amount === null) return null;
    return { tier: candidate, amountCents: price.unit_amount };
  } catch {
    return null;
  }
}

// ---- F1/F2/F3: gift emails ----

function giftReceiptBlocks(p: Record<string, unknown>) {
  return [
    { kind: "receiptTable", rows: [
      { label: "Plan", value: TIER_NAME[String(p.targetTier)] ?? String(p.targetTier) },
      { label: "Purchased", value: formatEmailDate(String(p.purchasedAt)) },
    ], total: { label: "Total", value: formatEmailMoney(Number(p.amountCents)) } },
  ] satisfies Block[];
}

function f1GiftDelivery(p: Record<string, unknown>): Doc {
  const code = String(p.giftCode);
  return {
    subject: "Your Vault Zombie gift purchase 🎁",
    eyebrow: "Gift purchased",
    heading: "Your gift is ready to send",
    blocks: [
      { kind: "paragraph", text: `Thanks for gifting ${escapeHtml(TIER_NAME[String(p.targetTier)] ?? String(p.targetTier))}! Here's the code to pass along, plus your receipt.` },
      { kind: "codeBox", code, note: "Share this code with the person you're gifting." },
      { kind: "sectionHeading", icon: "receipt", text: "Your receipt" },
      ...giftReceiptBlocks(p),
      { kind: "button", url: giftRedeemUrl(), label: "View gift details" },
    ],
    footer: { questionsLine: "purchase" },
  };
}

function f2GiftRecipientDelivery(p: Record<string, unknown>): Doc {
  const code = String(p.giftCode);
  const fromLine = p.fromLine ? String(p.fromLine) : null;
  return {
    subject: "You've been gifted a Vault Zombie vault! 🎁",
    eyebrow: "A gift for you",
    heading: fromLine ? `${fromLine} sent you a gift!` : "You've got a gift!",
    blocks: [
      { kind: "paragraph", text: `Someone gave you ${escapeHtml(TIER_NAME[String(p.targetTier)] ?? String(p.targetTier))} on Vault Zombie. Use the code below to redeem it.` },
      { kind: "codeBox", code, note: "Enter this code when you start your vault." },
      { kind: "button", url: giftRedeemUrl(), label: "Redeem your gift" },
    ],
    footer: {},
  };
}

function f3GiftRedeemed(p: Record<string, unknown>): Doc {
  return {
    subject: "Your Vault Zombie gift was redeemed",
    eyebrow: "Gift redeemed",
    heading: "Your gift found a home",
    blocks: [
      { kind: "paragraph", text: `Good news — the gift code ${escapeHtml(String(p.giftCode))} was just redeemed for ${escapeHtml(TIER_NAME[String(p.targetTier)] ?? String(p.targetTier))}${p.toLine ? ` by ${escapeHtml(String(p.toLine))}` : ""}.` },
      { kind: "receiptTable", rows: [
        { label: "Purchased", value: formatEmailDate(String(p.purchasedAt)) },
        { label: "Redeemed", value: formatEmailDate(String(p.redeemedAt)) },
      ], total: { label: "Plan", value: TIER_NAME[String(p.targetTier)] ?? String(p.targetTier) } },
    ],
    footer: { questionsLine: "purchase" },
  };
}

// ---- H1: welcome ----
function h1HostWelcome(p: Record<string, unknown>): Doc {
  return {
    subject: "Welcome to Vault Zombie",
    eyebrow: "Welcome",
    heading: `Welcome, ${escapeHtml(String(p.displayName ?? "there"))}!`,
    blocks: [
      { kind: "paragraph", text: "You're in. Vault Zombie lets you seal predictions from your guests, then reveal them on your own schedule — no peeking, not even for you." },
      { kind: "numberedSteps", steps: [
        "Pick a vault type and set up your questions.",
        "Share your write-only guest link. Nobody, including you, can read a prediction before it unlocks.",
        "When it's time, mark what really happened, and we'll score everyone for you.",
      ] },
      { kind: "button", url: appUrl(), label: "Start your first vault" },
    ],
    footer: {},
  };
}

// ---- H2: vault created ----
function h2VaultCreated(p: Record<string, unknown>): Doc {
  const checklist = p.checklist as Array<{ done: boolean; label: string }>;
  return {
    subject: `${String(p.vaultName)} is on its way`,
    eyebrow: "Vault started",
    heading: `${String(p.vaultName)} is taking shape`,
    blocks: [
      { kind: "paragraph", text: "Here's where things stand. Finish the checklist below, then seal your vault when you're ready." },
      { kind: "sectionHeading", icon: "pencil", text: "Setup checklist" },
      { kind: "checklist", items: checklist },
      { kind: "button", url: operatorVaultUrl(String(p.vaultId)), label: "Continue setup" },
    ],
    footer: {},
  };
}

// ---- H3: host receipt ----
function h3HostReceipt(p: Record<string, unknown>): Doc {
  return {
    subject: "Your Vault Zombie receipt",
    eyebrow: "Payment received",
    heading: "You're upgraded!",
    blocks: [
      { kind: "paragraph", text: `Your vault is now on ${escapeHtml(TIER_NAME[String(p.targetTier)] ?? String(p.targetTier))}. Thanks for keeping the vault going.` },
      { kind: "sectionHeading", icon: "receipt", text: "Your receipt" },
      { kind: "receiptTable", rows: [
        { label: "From", value: TIER_NAME[String(p.fromTier)] ?? String(p.fromTier) },
        { label: "To", value: TIER_NAME[String(p.targetTier)] ?? String(p.targetTier) },
      ], total: { label: "Charged", value: formatEmailMoney(Number(p.amountCents)) } },
      { kind: "button", url: operatorVaultUrl(String(p.vaultId)), label: "Open your vault" },
    ],
    footer: { questionsLine: "purchase" },
  };
}

// ---- H4: vault sealed ----
function h4VaultSealed(p: Record<string, unknown>): Doc {
  return {
    subject: `${String(p.vaultName)} is sealed 🔒`,
    eyebrow: "Sealed",
    heading: "Your vault is sealed",
    blocks: [
      { kind: "sectionHeading", icon: "lock", text: `${escapeHtml(String(p.vaultName))} is sealed` },
      { kind: "paragraph", text: "Guests can now submit predictions through your write-only link. Nobody can read a prediction before it unlocks, not even you." },
      { kind: "button", url: operatorVaultUrl(String(p.vaultId)), label: "Share your guest link" },
    ],
    footer: {},
  };
}

// ---- H5: reveal ready (operator) ----
function h5RevealOperator(p: Record<string, unknown>): Doc {
  return {
    subject: `${String(p.vaultName)}: a reveal just opened`,
    eyebrow: "Reveal open",
    heading: "It's time to mark a reveal",
    blocks: [
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "open-lock", text: "This reveal" },
        { kind: "bulletList", items: [
          bulletIcon("calendar", "bronze", `Reveal: ${escapeHtml(String(p.revealLabel))}, ${escapeHtml(formatEmailDate(String(p.revealDate)))}`),
          bulletIcon("group", "bronze", `${Number(p.guestCount)} guests are waiting on ${Number(p.predictionCount)} predictions`),
        ] },
      ] },
      { kind: "button", url: operatorRevealUrl(String(p.vaultId), p.revealSlotId ? String(p.revealSlotId) : null), label: "Open your reveal" },
      { kind: "sectionHeading", icon: "trophy", text: "How marking works" },
      { kind: "paragraph", text: "For each question, enter what really happened, just once. Vault Zombie scores every guest's answer for you as <strong>came true</strong>, <strong>sort of</strong>, or <strong>nope</strong>. You can change any result with one tap." },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", text: "Your guests are waiting", dark: true },
        { kind: "paragraph", text: "Guests only find out how they did once you mark the results, so try not to leave them hanging." },
      ] },
    ],
    footer: {},
  };
}

function bulletIcon(icon: string, variant: "bronze" | "brass", text: string) {
  const src = `${appUrl()}/email-icons/${icon}-${variant}.png`;
  return `<img src="${src}" width="16" height="16" style="height:16px;width:16px;vertical-align:middle;margin-right:6px;border:0" alt="" />${text}`;
}

// ---- H6: unmarked reveal nudge ----
function h6UnmarkedNudge(p: Record<string, unknown>): Doc {
  return {
    subject: "Your guests are waiting 👀",
    eyebrow: "Still sealed",
    heading: "Somebody out there is dying to know",
    blocks: [
      { kind: "paragraph", text: `Your latest reveal in ${escapeHtml(String(p.vaultName))} opened ${Number(p.daysSinceOpened)} days ago, and it's still unmarked. Somewhere out there, a few people are quietly wondering if they called it, and they can't find out until you open it.` },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "hourglass", text: "Waiting on you" },
        { kind: "bulletList", items: [
          bulletIcon("group", "bronze", `${Number(p.guestCount)} guests`),
          bulletIcon("open-lock", "bronze", `${Number(p.unmarkedPredictionCount)} predictions ready to mark`),
        ] },
      ] },
      { kind: "button", url: operatorRevealUrl(String(p.vaultId), p.revealSlotId ? String(p.revealSlotId) : null), label: "Open your reveal" },
      { kind: "paragraph", text: "It only takes a few minutes. Enter what really happened, and we'll score everyone for you." },
    ],
    footer: {},
  };
}

// ---- H7: guest limit reached ----
function h7GuestLimitReached(p: Record<string, unknown>): Doc {
  const hasUpgrade = Boolean(p.upgradeTier);
  const options = hasUpgrade
    ? [`Upgrade to ${TIER_NAME[String(p.upgradeTier)]} for ${formatEmailMoney(Number(p.upgradePriceCents))} and keep every prediction`, `Stay on ${TIER_NAME[String(p.tier)]}, and the ${Number(p.overCount)} most recent guests' predictions are removed`]
    : [`Stay on ${TIER_NAME[String(p.tier)]}, and the ${Number(p.overCount)} most recent guests' predictions are removed`];
  return {
    subject: `${String(p.vaultName)} was a hit! Your vault went over its guest limit`,
    eyebrow: "Guest limit reached",
    heading: "More people wanted in!",
    blocks: [
      { kind: "paragraph", text: `${escapeHtml(String(p.vaultName))} is on the ${escapeHtml(TIER_NAME[String(p.tier)])} plan, which allows ${Number(p.guestLimit)} guests, and ${Number(p.totalGuestCount)} guests sealed predictions.` },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "group", text: `${Number(p.overCount)} guests' predictions are on hold` },
        { kind: "paragraph", text: "They're safe, and nothing has been deleted. Until you decide, they're held back from reveals." },
      ] },
      { kind: "sectionHeading", icon: "lock", text: "Your options" },
      { kind: "bulletList", items: options },
      { kind: "button", url: operatorBillingUrl(String(p.vaultId)), label: "Review your options" },
      { kind: "paragraph", text: "Upgrading only raises your guest limit. Your reveal schedule and dates stay the same." },
    ],
    footer: {},
  };
}

// ---- H8: guest limit reminder ----
function h8GuestLimitReminder(p: Record<string, unknown>): Doc {
  return {
    subject: `Reminder: ${Number(p.overCount)} guests' predictions are still on hold`,
    eyebrow: "Reveal coming up",
    heading: "Don't leave anyone out of the reveal",
    blocks: [
      { kind: "paragraph", text: `Your next reveal for ${escapeHtml(String(p.vaultName))} is ${escapeHtml(formatEmailDate(String(p.nextRevealDate)))}, ${Number(p.daysUntil)} days from now. The ${Number(p.overCount)} extra guests' predictions are still on hold and won't be included unless you decide before then.` },
      { kind: "button", url: operatorBillingUrl(String(p.vaultId)), label: "Review your options" },
    ],
    footer: {},
  };
}

// ---- G1: predictions sealed (guest) ----
function g1GuestSealed(p: Record<string, unknown>): Doc {
  const guestName = p.guestName ? String(p.guestName) : null;
  const revealDates = p.revealDates as Array<{ count: number; date: string }>;
  return {
    subject: `Your predictions for ${String(p.vaultName)} are sealed! 🔒`,
    eyebrow: "Sealed tight",
    heading: guestName ? `Thanks for playing, ${escapeHtml(guestName)}!` : "Thanks for playing!",
    blocks: [
      { kind: "paragraph", text: `Your predictions for ${escapeHtml(String(p.vaultName))} are locked in. No one can read them before they unlock, not even the hosts.` },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "lock", text: `${Number(p.predictionCount)} predictions sealed` },
        { kind: "bulletList", items: revealDates.map((row) => bulletIcon("calendar", "bronze", `${row.count} unlock on ${formatEmailDate(row.date)}`)) },
      ] },
      { kind: "sectionHeading", icon: "hourglass", text: "What happens next" },
      { kind: "paragraph", text: "When it's time, we'll email you to let you know how your predictions turned out and whether you called it. Sit tight. The future takes a little while to get here." },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", text: "Having fun?", dark: true },
        { kind: "paragraph", text: "Got a wedding, a baby, or a big year coming up? Start a vault of your own." },
        { kind: "button", url: signUpUrl(p.referrerCode ? String(p.referrerCode) : null), label: "Sign up for your own Vault" },
      ] },
    ],
    footer: { guestUnsubscribe: { vaultName: String(p.vaultName), url: guestUnsubscribeUrl(String(p.guestId)) } },
  };
}

// ---- G2: results (guest) ----
function g2GuestResults(p: Record<string, unknown>): Doc {
  const guestName = p.guestName ? String(p.guestName) : null;
  const rows = p.rows as Array<{ prompt: string; said: string; note?: string | null; result: ResultKind }>;
  const scoreTiles: Array<{ count: string; label: string } | { rank: string; of: string }> = [
    { count: String(p.full), label: "came true" },
    { count: String(p.half), label: "sort of" },
    { count: String(p.zero), label: "nope" },
  ];
  if (p.rank) scoreTiles.push({ rank: `#${p.rank}`, of: `of ${p.guestCount}` });
  return {
    subject: `The results are in! Did you call it for ${String(p.vaultName)}? 🏆`,
    eyebrow: "Results are in",
    heading: guestName ? `Remember those predictions, ${escapeHtml(guestName)}?` : "Remember those predictions?",
    blocks: [
      { kind: "paragraph", text: `You sealed them ${escapeHtml(String(p.elapsed))} ago for ${escapeHtml(String(p.vaultName))}. They've unlocked, and the hosts marked how they turned out.` },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "trophy", text: "Your score this reveal" },
        { kind: "resultScoreTiles", tiles: scoreTiles },
      ] },
      { kind: "sectionHeading", icon: "open-lock", text: "Your predictions" },
      { kind: "predictionsTable", rows },
      { kind: "sectionHeading", icon: "calendar", text: "What's next" },
      { kind: "paragraph", text: p.nextRevealDate
        ? `Your next predictions unlock on ${escapeHtml(formatEmailDate(String(p.nextRevealDate)))}. We'll email you when the results are in.`
        : `That was your final reveal for ${escapeHtml(String(p.vaultName))}. Thanks for being part of it from the start.` },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", text: "Having fun?", dark: true },
        { kind: "paragraph", text: "Got a wedding, a baby, or a big year coming up? Start a vault of your own." },
        { kind: "button", url: signUpUrl(p.referrerCode ? String(p.referrerCode) : null), label: "Sign up for your own Vault" },
      ] },
    ],
    footer: { guestUnsubscribe: { vaultName: String(p.vaultName), url: guestUnsubscribeUrl(String(p.guestId)) } },
  };
}

// ---- context assembly per event type ----

export async function buildDoc(row: EmailDelivery): Promise<Doc> {
  const p = row.payload as Record<string, unknown>;
  switch (row.eventType) {
    case "gift_delivery": return f1GiftDelivery(p);
    case "gift_recipient_delivery": return f2GiftRecipientDelivery(p);
    case "gift_redeemed": return f3GiftRedeemed(p);
    case "host_welcome": return h1HostWelcome(p);
    case "host_receipt": return h3HostReceipt(p);
    case "operator_vault_sealed": return h4VaultSealed(p);
    case "reveal_operator": return h5RevealOperator(p);
    case "unmarked_reveal_nudge": return h6UnmarkedNudge(p);
    case "operator_overage_initial": return buildH7(row, p);
    case "operator_overage_escalation": return buildH8(row, p);
    case "guest_submission_confirmation": return buildG1(row, p);
    case "guest_personal_report": return buildG2(row);
    case "vault_created": return h2VaultCreated(p);
    default:
      throw new Error(`No email template is defined for event type "${row.eventType}".`);
  }
}

async function buildH7(row: EmailDelivery, p: Record<string, unknown>): Promise<Doc> {
  if (!row.vaultId) throw new Error("Guest-limit email is missing its vault.");
  const [vault] = await db.select({ tier: vaultsTable.entitledPlanTier }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Vault no longer exists.");
  const [event] = await db.select({ guestCap: overageEventsTable.guestCap, submissionCount: overageEventsTable.submissionCount })
    .from(overageEventsTable).where(eq(overageEventsTable.vaultId, row.vaultId)).limit(1);
  const guestLimit = event?.guestCap ?? PLAN_POLICY[vault.tier].guestCap;
  const totalGuestCount = event?.submissionCount ?? guestLimit;
  const overCount = Math.max(0, totalGuestCount - guestLimit);
  const upgrade = vault.tier === "deep_vault" ? null : await findUpgradeOption(vault.tier, totalGuestCount);
  return h7GuestLimitReached({
    vaultName: p.vaultName, vaultId: row.vaultId, tier: vault.tier, guestLimit, totalGuestCount, overCount,
    upgradeTier: upgrade?.tier ?? null, upgradePriceCents: upgrade?.amountCents ?? null,
  });
}

async function buildH8(row: EmailDelivery, p: Record<string, unknown>): Promise<Doc> {
  if (!row.vaultId) throw new Error("Guest-limit reminder email is missing its vault.");
  const [vault] = await db.select({ tier: vaultsTable.entitledPlanTier }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Vault no longer exists.");
  const [event] = await db.select({ guestCap: overageEventsTable.guestCap, submissionCount: overageEventsTable.submissionCount })
    .from(overageEventsTable).where(eq(overageEventsTable.vaultId, row.vaultId)).limit(1);
  const guestLimit = event?.guestCap ?? PLAN_POLICY[vault.tier].guestCap;
  const overCount = Math.max(0, (event?.submissionCount ?? guestLimit) - guestLimit);
  const today = new Date().toISOString().slice(0, 10);
  const [nextSlot] = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable)
    .where(and(eq(revealSlotsTable.vaultId, row.vaultId))).orderBy(revealSlotsTable.revealDate).limit(50);
  const upcoming = (await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, row.vaultId)))
    .filter((s) => s.revealDate >= today).sort((a, b) => a.revealDate.localeCompare(b.revealDate))[0];
  const nextRevealDate = upcoming?.revealDate ?? nextSlot?.revealDate ?? today;
  return h8GuestLimitReminder({ vaultName: p.vaultName, vaultId: row.vaultId, overCount, nextRevealDate, daysUntil: daysBetween(new Date(), new Date(`${nextRevealDate}T00:00:00.000Z`)) });
}

async function buildG1(row: EmailDelivery, p: Record<string, unknown>): Promise<Doc> {
  if (!row.recipientGuestId || !row.vaultId) throw new Error("Guest confirmation email is missing guest or vault identity.");
  const [guest] = await db.select({ name: guestsTable.displayName }).from(guestsTable).where(eq(guestsTable.id, row.recipientGuestId)).limit(1);
  const [vault] = await db.select({ referrerCode: vaultsTable.referrerCode }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  const [submission] = await db.select({ id: submissionsTable.id }).from(submissionsTable)
    .where(and(eq(submissionsTable.vaultId, row.vaultId), eq(submissionsTable.guestId, row.recipientGuestId))).limit(1);
  const rows = submission ? await db.select({ revealDate: revealSlotsTable.revealDate })
    .from(answersTable).innerJoin(revealSlotsTable, eq(answersTable.revealSlotId, revealSlotsTable.id))
    .where(eq(answersTable.submissionId, submission.id)) : [];
  const byDate = new Map<string, number>();
  for (const answerRow of rows) byDate.set(answerRow.revealDate, (byDate.get(answerRow.revealDate) ?? 0) + 1);
  const revealDates = [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));
  return g1GuestSealed({
    vaultName: p.vaultName, guestId: row.recipientGuestId, guestName: guest?.name ?? null,
    predictionCount: rows.length, revealDates, referrerCode: vault?.referrerCode ?? null,
  });
}

async function buildG2(row: EmailDelivery): Promise<Doc> {
  if (!row.recipientGuestId || !row.vaultId || !row.revealSlotId) throw new Error("Guest report email is missing vault, guest, or reveal identity.");
  const [vault] = await db.select({ operatorId: vaultsTable.operatorId, name: vaultsTable.name, referrerCode: vaultsTable.referrerCode })
    .from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Guest report vault no longer exists.");
  const [guest] = await db.select({ name: guestsTable.displayName }).from(guestsTable).where(eq(guestsTable.id, row.recipientGuestId)).limit(1);
  const [submission] = await db.select({ id: submissionsTable.id, createdAt: submissionsTable.submittedAt }).from(submissionsTable)
    .where(and(eq(submissionsTable.vaultId, row.vaultId), eq(submissionsTable.guestId, row.recipientGuestId))).limit(1);
  const report = await getGuestPersonalReport(row.vaultId, vault.operatorId, row.recipientGuestId);
  const answers = report.answers.filter((answer) => answer.revealSlotId === row.revealSlotId);
  const outcomeKind = (tier: string | null, freeTextMode: string | null | undefined): ResultKind => {
    if (tier === "full") return "full";
    if (tier === "half") return "half";
    if (tier === "zero") return "zero";
    return "keepsake";
  };
  const rows = answers.map((answer) => ({
    prompt: answer.prompt,
    said: String(answer.textValue ?? answer.optionLabel ?? (answer.numberValue !== null && answer.numberValue !== undefined ? `${answer.numberValue}${answer.numberUnit ? ` ${answer.numberUnit}` : ""}` : "")),
    note: answer.operatorNote ?? null,
    result: outcomeKind(answer.outcomeTier, null),
  }));
  const full = answers.filter((a) => a.outcomeTier === "full").length;
  const half = answers.filter((a) => a.outcomeTier === "half").length;
  const zero = answers.filter((a) => a.outcomeTier === "zero").length;
  const today = new Date().toISOString().slice(0, 10);
  const laterSlots = await db.select({ id: answersTable.revealSlotId, date: revealSlotsTable.revealDate }).from(answersTable)
    .innerJoin(revealSlotsTable, eq(answersTable.revealSlotId, revealSlotsTable.id)).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
    .where(and(eq(submissionsTable.vaultId, row.vaultId), eq(submissionsTable.guestId, row.recipientGuestId), eq(submissionsTable.id, submission?.id ?? "")));
  const nextRevealDate = [...new Set(laterSlots.map((s) => s.date))].filter((date) => date > today).sort()[0] ?? null;
  return g2GuestResults({
    vaultName: vault.name, guestId: row.recipientGuestId, guestName: guest?.name ?? null,
    elapsed: submission ? formatElapsedTime(submission.createdAt) : "recently",
    full, half, zero, rank: report.rank ?? null, guestCount: report.guestCount ?? null,
    rows, nextRevealDate, referrerCode: vault.referrerCode ?? null,
  });
}

export async function renderEmail(row: EmailDelivery) {
  const doc = await buildDoc(row);
  const { html, text } = renderDoc(doc);
  return { subject: doc.subject, html, text };
}
