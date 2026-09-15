/**
 * One render function per of the 13 transactional emails (spec section 6),
 * using verbatim copy and the layout/formatting primitives.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import {
  answersTable, db, getGuestPersonalReport, guestLinkUrl,
  guestsTable, overageEventsTable, PLAN_POLICY, revealSlotsTable, submissionsTable, todayInTimeZone,
  vaultQuestionsTable, vaultsTable, vaultTypesTable, type EmailDelivery, type PlanTier,
} from "@workspace/db";
import { TIER_ORDER, findStripePrice, getStripeClient, type PaidTier } from "../stripe";
import { daysBetween, formatEmailDate, formatEmailMoney, formatElapsedTime, formatPlanDuration } from "../format";
import { Block, FooterOptions, escapeHtml, renderDoc, resultLabel, type ResultKind } from "./layout";
import { substituteTokens } from "@workspace/shared";

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
function operatorVaultShareUrl(vaultId: string) { return `${appUrl()}/operator/vaults/${vaultId}/share`; }
// Stage 2 has not built the vault-creation screen yet; the spec still calls for a
// direct link, so this points at the eventual route rather than falling back to
// the site root (per explicit instruction: point there anyway, expected to 404 today).
function operatorNewVaultUrl() { return `${appUrl()}/operator/vaults/new`; }
function linkTag(url: string) { return `<a href="${url}" style="color:${"#8A6D3B"};text-decoration:underline;word-break:break-all">${url}</a>`; }
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

function planTiles(tier: PlanTier) {
  const policy = PLAN_POLICY[tier];
  return [
    { number: String(policy.guestCap), label: "guests" },
    { number: formatPlanDuration(policy.durationYears), label: "of reveals" },
  ] satisfies Array<{ number: string; label: string }>;
}

function f1GiftDelivery(p: Record<string, unknown>): Doc {
  const code = String(p.giftCode);
  const tier = String(p.targetTier) as PlanTier;
  const tierName = TIER_NAME[tier] ?? String(tier);
  const recipientEmail = p.recipientEmail ? String(p.recipientEmail) : null;
  const toLine = p.toLine ? String(p.toLine) : null;
  const fromLine = p.fromLine ? String(p.fromLine) : null;
  const blocks: Block[] = [
    { kind: "paragraph", text: `You just gave someone a ${escapeHtml(tierName)} vault from Vault Zombie. Their friends and family will seal predictions about their future, and the predictions unlock over time so everyone can see who called it.` },
    { kind: "highlightBand", children: [
      { kind: "sectionHeading", icon: "key", text: "Your gift code" },
      { kind: "codeBox", code, note: "The code never expires." },
    ] },
    { kind: "sectionHeading", icon: "gift-box", text: "How to give it" },
    { kind: "paragraph", text: "Pass the code along however you like: forward this email, write it in a card, or print the gift card from your confirmation page." },
  ];
  if (recipientEmail) blocks.push({ kind: "paragraph", text: `We also sent the code directly to ${escapeHtml(recipientEmail)}.` });
  blocks.push(
    { kind: "sectionHeading", text: "How they redeem it" },
    { kind: "numberedSteps", steps: [
      `They go to ${linkTag(giftRedeemUrl())}`,
      "They enter the code",
      "They sign in, or sign up for a free account",
      `Their ${escapeHtml(tierName)} vault is ready to set up`,
    ] },
    { kind: "paragraph", text: "We'll email you when they redeem it." },
    { kind: "darkBand", children: [
      { kind: "sectionHeading", icon: "group", text: `What's included in ${escapeHtml(tierName)}`, dark: true },
      { kind: "statTiles", tiles: planTiles(tier) },
    ] },
    { kind: "sectionHeading", icon: "receipt", text: "Your receipt" },
  );
  const receiptRows: Array<{ label: string; value: string }> = [
    { label: `${tierName} vault (gift)`, value: formatEmailMoney(Number(p.amountCents)) },
    { label: "Date", value: formatEmailDate(String(p.purchasedAt)) },
    { label: "Payment ID", value: String(p.stripePaymentIntentId) },
  ];
  if (toLine && fromLine) receiptRows.push({ label: "To and from", value: `${toLine}, from ${fromLine}` });
  else if (toLine) receiptRows.push({ label: "To", value: toLine });
  else if (fromLine) receiptRows.push({ label: "From", value: fromLine });
  blocks.push(
    { kind: "receiptTable", rows: receiptRows, total: { label: "Total", value: formatEmailMoney(Number(p.amountCents)) } },
    { kind: "paragraph", text: "Changed your mind? You can get a refund within 90 days of purchase, as long as the gift hasn't been redeemed. Contact info@zombieplatforms.com." },
  );
  return { subject: "Thank you for your gift! Your Vault Zombie code is inside", eyebrow: "Gift secured", heading: "Thank you for your gift!", blocks, footer: {} };
}

function f2GiftRecipientDelivery(p: Record<string, unknown>): Doc {
  const code = String(p.giftCode);
  const tier = String(p.targetTier) as PlanTier;
  const tierName = TIER_NAME[tier] ?? String(tier);
  const toLine = p.toLine ? String(p.toLine) : null;
  const fromLine = p.fromLine ? String(p.fromLine) : null;
  return {
    subject: fromLine ? `${fromLine} gave you a Vault Zombie vault! 🎁` : "You've been given a Vault Zombie vault! 🎁",
    eyebrow: "A gift for you",
    heading: "You've been given a gift!",
    blocks: [
      { kind: "greeting", text: toLine ? `Hi ${escapeHtml(toLine)},` : "Hi there," },
      { kind: "paragraph", text: fromLine ? `${escapeHtml(fromLine)} gave you a ${escapeHtml(tierName)} vault from Vault Zombie.` : `You've been given a ${escapeHtml(tierName)} vault from Vault Zombie.` },
      { kind: "sectionHeading", icon: "gift-box", text: "What is Vault Zombie?" },
      { kind: "paragraph", text: "It's a way to collect sealed predictions about your future from the people who know you best, at a wedding, a new baby, a graduation, a new job, or any big moment. The predictions stay sealed, even from you, and unlock over time so everyone can see who called it." },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "key", text: "Your gift code" },
        { kind: "codeBox", code },
      ] },
      { kind: "sectionHeading", text: "How to redeem it" },
      { kind: "numberedSteps", steps: [
        `Go to ${linkTag(giftRedeemUrl())}`,
        "Enter your code",
        "Sign in, or sign up for a free account",
        `Your ${escapeHtml(tierName)} vault is ready to set up`,
      ] },
      { kind: "paragraph", text: "Your code never expires, so redeem it whenever you're ready." },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", icon: "group", text: `What's included in ${escapeHtml(tierName)}`, dark: true },
        { kind: "statTiles", tiles: planTiles(tier) },
      ] },
    ],
    footer: {},
  };
}

function f3GiftRedeemed(p: Record<string, unknown>): Doc {
  const tier = String(p.targetTier) as PlanTier;
  const tierName = TIER_NAME[tier] ?? String(tier);
  const toLine = p.toLine ? String(p.toLine) : null;
  return {
    subject: "Your gift was redeemed! 🎉",
    eyebrow: "Gift redeemed",
    heading: "Your gift landed!",
    blocks: [
      { kind: "paragraph", text: toLine ? `Good news: ${escapeHtml(toLine)} just redeemed the ${escapeHtml(tierName)} vault you gave them.` : `The ${escapeHtml(tierName)} vault you gave was just redeemed.` },
      { kind: "paragraph", text: "Now they can set it up, choose their prompts, and invite their people to start predicting." },
      { kind: "paragraph", text: "Thank you for sharing Vault Zombie." },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "gift-box", text: "Gift details" },
        { kind: "bulletList", items: [
          `Gift: ${escapeHtml(tierName)} vault`,
          `Code: ${escapeHtml(String(p.giftCode))}`,
          `Purchased: ${escapeHtml(formatEmailDate(String(p.purchasedAt)))}`,
          `Redeemed: ${escapeHtml(formatEmailDate(String(p.redeemedAt)))}`,
        ] },
      ] },
    ],
    footer: {},
  };
}

// ---- H1: welcome ----
function h1HostWelcome(_p: Record<string, unknown>): Doc {
  return {
    subject: "Welcome to Vault Zombie! Let's build your first vault",
    eyebrow: "Welcome aboard",
    heading: "Welcome to Vault Zombie!",
    blocks: [
      { kind: "paragraph", text: "You just started something your people will be talking about for years." },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "lock", text: "How it works" },
        { kind: "numberedSteps", steps: [
          "Create a vault for your big moment and choose the prompts your guests will answer.",
          "Share your QR code or link. Guests answer in about a minute, with no account needed.",
          "Each prediction seals the moment it's submitted. Not even you can peek.",
          "Predictions unlock on the reveal schedule you choose, and you mark who called it.",
        ] },
      ] },
      { kind: "button", url: operatorNewVaultUrl(), label: "Create your first vault" },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", icon: "qr-code", text: "Tips for a great turnout", dark: true },
        { kind: "bulletList", items: [
          "Put your QR code where no one can miss it, like a table card or your welcome sign.",
          "Add a few prompts of your own. The personal ones get the best answers.",
          "Keep it light. Guests can answer in about a minute, so nudge them to jump in.",
        ] },
      ] },
      { kind: "paragraph", text: "Start free with a Lockbox vault, or choose Safe, Vault, or Deep Vault for bigger events and longer reveals." },
    ],
    footer: {},
  };
}

// ---- H2: vault created ----
function h2VaultCreated(p: Record<string, unknown>): Doc {
  const vaultType = String(p.vaultType);
  const tier = String(p.planTier) as PlanTier;
  const tierName = TIER_NAME[tier] ?? String(tier);
  const checklist = p.checklist as Array<{ done: boolean; label: string }>;
  return {
    subject: `Your ${vaultType} vault is saved! Here's what's next`,
    eyebrow: "Vault started",
    heading: "Your vault is saved!",
    blocks: [
      { kind: "paragraph", text: `Nice start. Your ${escapeHtml(vaultType)} vault on the ${escapeHtml(tierName)} plan is saved, so you can finish setting it up whenever you're ready. Drafts never expire.` },
      { kind: "button", url: operatorVaultUrl(String(p.vaultId)), label: "Finish setting up your vault" },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "pencil", text: "Your setup checklist" },
        { kind: "checklist", items: checklist },
      ] },
      { kind: "sectionHeading", icon: "lock", text: "Before you seal, remember" },
      { kind: "bulletList", items: [
        "Guests can't answer until your vault is sealed.",
        "Once sealed, your prompts, reveal schedule, and reveal dates are locked in for good. Take a final look before you seal.",
        "After sealing, you'll get your share link, QR code, and printable cards.",
      ] },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", icon: "group", text: "Your plan includes", dark: true },
        { kind: "statTiles", tiles: planTiles(tier) },
      ] },
    ],
    footer: {},
  };
}

// ---- H3: host receipt ----
function h3HostReceipt(p: Record<string, unknown>): Doc {
  const fromTier = String(p.fromTier) as PlanTier;
  const targetTier = String(p.targetTier) as PlanTier;
  const isUpgrade = fromTier !== "lockbox";
  const tierName = TIER_NAME[targetTier] ?? String(targetTier);
  const fromTierName = TIER_NAME[fromTier] ?? String(fromTier);
  const darkBandChildren: Block[] = [
    { kind: "sectionHeading", icon: "group", text: `What's included in ${escapeHtml(tierName)}`, dark: true },
    { kind: "statTiles", tiles: planTiles(targetTier) },
  ];
  if (isUpgrade) darkBandChildren.push({ kind: "paragraph", text: "Your upgrade raises your guest limit. Your reveal schedule and dates stay exactly as they were when you sealed the vault." });
  const blocks: Block[] = [
    { kind: "paragraph", text: isUpgrade
      ? `Your vault is now upgraded from ${escapeHtml(fromTierName)} to ${escapeHtml(tierName)}.`
      : `Your ${escapeHtml(tierName)} plan is active and ready to go.` },
    { kind: "button", url: operatorVaultUrl(String(p.vaultId)), label: isUpgrade ? "Open your vault" : "Continue setting up your vault" },
    { kind: "darkBand", children: darkBandChildren },
    { kind: "sectionHeading", icon: "receipt", text: "Your receipt" },
    { kind: "receiptTable", rows: [
      { label: "Item", value: isUpgrade ? `Upgrade from ${fromTierName} to ${tierName}` : `${tierName} plan` },
      { label: "Date", value: formatEmailDate(String(p.paidAt)) },
      { label: "Payment ID", value: String(p.stripePaymentIntentId) },
    ], total: { label: "Total", value: formatEmailMoney(Number(p.amountCents)) } },
    { kind: "paragraph", text: "Keep this email for your records." },
  ];
  return {
    subject: isUpgrade ? "Your Vault Zombie upgrade receipt" : "Your Vault Zombie receipt",
    eyebrow: "Payment received",
    heading: "Thank you for your purchase!",
    blocks,
    footer: { questionsLine: "purchase" },
  };
}

// ---- H4: vault sealed ----
function h4VaultSealed(p: Record<string, unknown>): Doc {
  const vaultName = String(p.vaultName);
  return {
    subject: `${vaultName} is sealed and ready for guests! 🔒`,
    eyebrow: "Vault sealed",
    heading: "Your vault is ready for guests!",
    blocks: [
      { kind: "paragraph", text: `${escapeHtml(vaultName)} is sealed and live. Time to get your people predicting.` },
      { kind: "highlightBand", children: [
        { kind: "sectionHeading", icon: "qr-code", text: "Share with your guests" },
        { kind: "linkBox", url: String(p.guestLink) },
        { kind: "paragraph", text: "Guests can use this link or scan your QR code. They answer in about a minute and never need an account." },
      ] },
      { kind: "button", url: operatorVaultShareUrl(String(p.vaultId)), label: "Get your QR code and printable cards" },
      { kind: "sectionHeading", icon: "lock", text: "What sealing means" },
      { kind: "paragraph", text: "Your prompts, reveal schedule, and reveal dates are now locked in. Every prediction seals the moment a guest submits it. No one can read one before its reveal date, not even you." },
      { kind: "darkBand", children: [
        { kind: "sectionHeading", text: "Your vault at a glance", dark: true },
        { kind: "bulletList", items: [
          bulletIcon("group", "brass", `Guest limit: ${Number(p.guestLimit)}`),
          bulletIcon("hourglass", "brass", `Reveal schedule: ${escapeHtml(String(p.revealScheduleName))}`),
          bulletIcon("calendar", "brass", `First reveal: ${escapeHtml(formatEmailDate(String(p.firstRevealDate)))}`),
        ] },
      ] },
      { kind: "sectionHeading", text: "What happens next" },
      { kind: "numberedSteps", steps: [
        "Guests answer and seal their predictions.",
        "We email you the moment a reveal is ready to open.",
        "You mark the results, and your guests find out who called it.",
      ] },
    ],
    footer: {},
  };
}

// ---- H5: reveal ready (operator) ----
function h5RevealOperator(p: Record<string, unknown>): Doc {
  return {
    subject: `It's reveal day for ${String(p.vaultName)}! 🔓`,
    eyebrow: "Reveal ready",
    heading: "It's time to open your vault!",
    blocks: [
      { kind: "paragraph", text: `A batch of predictions in ${escapeHtml(String(p.vaultName))} just unlocked. Your guests sealed these ${escapeHtml(String(p.elapsedSinceSealing))} ago, and now you get to see who called it.` },
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
  const scoreTiles: Array<{ kind: ResultKind; count: string; label: string } | { rank: string; of: string }> = [
    { kind: "full", count: String(p.full), label: "came true" },
    { kind: "half", count: String(p.half), label: "sort of" },
    { kind: "zero", count: String(p.zero), label: "nope" },
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
    case "operator_vault_sealed": return buildH4(row, p);
    case "reveal_operator": return h5RevealOperator(p);
    case "unmarked_reveal_nudge": return h6UnmarkedNudge(p);
    case "operator_overage_initial": return buildH7(row, p);
    case "operator_overage_escalation": return buildH8(row, p);
    case "guest_submission_confirmation": return buildG1(row, p);
    case "guest_personal_report": return buildG2(row);
    case "vault_created": return buildH2(row);
    default:
      throw new Error(`No email template is defined for event type "${row.eventType}".`);
  }
}

const CHECKLIST_LABELS = {
  vaultType: "Choose your vault type",
  names: "Add the names for your vault",
  eventDate: "Set your event date",
  revealSchedule: "Choose your reveal schedule",
  prompts: "Pick your prompts, and add your own",
  guestLayout: "Choose how guests see the prompts: one at a time, or all on one page",
  cover: "Add your own cover photo, if you want one",
  sealed: "Seal your vault",
} as const;

async function buildH2(row: EmailDelivery): Promise<Doc> {
  if (!row.vaultId) throw new Error("Vault created email is missing its vault.");
  const [vault] = await db.select({
    vaultTypeId: vaultsTable.vaultTypeId, planTier: vaultsTable.planTier,
    subjectValues: vaultsTable.subjectValues, anchorDate: vaultsTable.anchorDate,
    revealSchedule: vaultsTable.revealSchedule, coverObjectKey: vaultsTable.coverObjectKey,
    status: vaultsTable.status,
  }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Vault no longer exists.");
  const [vaultType] = await db.select({ name: vaultTypesTable.name, requiredSubjectTokens: vaultTypesTable.requiredSubjectTokens })
    .from(vaultTypesTable).where(eq(vaultTypesTable.id, vault.vaultTypeId)).limit(1);
  if (!vaultType) throw new Error("Vault type no longer exists.");
  const [{ value: promptCount }] = await db.select({ value: count() }).from(vaultQuestionsTable)
    .where(and(eq(vaultQuestionsTable.vaultId, row.vaultId), eq(vaultQuestionsTable.enabled, true)));
  const namesFilled = vaultType.requiredSubjectTokens.every((token) => Boolean(vault.subjectValues?.[token]?.trim()));
  const checklist = [
    { done: true, label: CHECKLIST_LABELS.vaultType },
    { done: namesFilled, label: CHECKLIST_LABELS.names },
    { done: Boolean(vault.anchorDate), label: CHECKLIST_LABELS.eventDate },
    { done: Boolean(vault.revealSchedule), label: CHECKLIST_LABELS.revealSchedule },
    { done: promptCount > 0, label: CHECKLIST_LABELS.prompts },
    { done: true, label: CHECKLIST_LABELS.guestLayout },
    // Lockbox has no cover upload control at all, so this line is omitted
    // rather than shown as permanently unchecked.
    ...(vault.planTier === "lockbox" ? [] : [{ done: Boolean(vault.coverObjectKey), label: CHECKLIST_LABELS.cover }]),
    { done: vault.status === "sealed", label: CHECKLIST_LABELS.sealed },
  ];
  return h2VaultCreated({ vaultId: row.vaultId, vaultType: vaultType.name, planTier: vault.planTier, checklist });
}

async function buildH4(row: EmailDelivery, p: Record<string, unknown>): Promise<Doc> {
  if (!row.vaultId) throw new Error("Vault sealed email is missing its vault.");
  const [vault] = await db.select({
    entitledPlanTier: vaultsTable.entitledPlanTier, revealSchedule: vaultsTable.revealSchedule, guestToken: vaultsTable.guestToken,
  }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Vault no longer exists.");
  if (!vault.guestToken) throw new Error("Sealed vault is missing its guest token.");
  const slots = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, row.vaultId));
  const firstRevealDate = slots.map((s) => s.revealDate).sort()[0] ?? null;
  if (!firstRevealDate) throw new Error("Sealed vault is missing its reveal schedule.");
  if (!vault.revealSchedule) throw new Error("Sealed vault is missing its reveal schedule.");
  return h4VaultSealed({
    vaultName: p.vaultName, vaultId: row.vaultId, guestLink: guestLinkUrl(vault.guestToken),
    guestLimit: PLAN_POLICY[vault.entitledPlanTier].guestCap,
    revealScheduleName: SCHEDULE_NAME[vault.revealSchedule] ?? vault.revealSchedule,
    firstRevealDate,
  });
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
  const [vault] = await db.select({ tier: vaultsTable.entitledPlanTier, timeZone: vaultsTable.timeZone }).from(vaultsTable).where(eq(vaultsTable.id, row.vaultId)).limit(1);
  if (!vault) throw new Error("Vault no longer exists.");
  const [event] = await db.select({ guestCap: overageEventsTable.guestCap, submissionCount: overageEventsTable.submissionCount })
    .from(overageEventsTable).where(eq(overageEventsTable.vaultId, row.vaultId)).limit(1);
  const guestLimit = event?.guestCap ?? PLAN_POLICY[vault.tier].guestCap;
  const overCount = Math.max(0, (event?.submissionCount ?? guestLimit) - guestLimit);
  const today = todayInTimeZone(new Date(), vault.timeZone);
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
  const [vault] = await db.select({ operatorId: vaultsTable.operatorId, name: vaultsTable.name, referrerCode: vaultsTable.referrerCode, timeZone: vaultsTable.timeZone })
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
    prompt: substituteTokens(answer.prompt, { subjectValues: report.vaultSubjectValues, revealDate: answer.revealDate }),
    said: String(answer.textValue ?? answer.optionLabel ?? (answer.numberValue !== null && answer.numberValue !== undefined ? `${answer.numberValue}${answer.numberUnit ? ` ${answer.numberUnit}` : ""}` : "")),
    note: answer.operatorNote ?? null,
    result: outcomeKind(answer.outcomeTier, null),
  }));
  const full = answers.filter((a) => a.outcomeTier === "full").length;
  const half = answers.filter((a) => a.outcomeTier === "half").length;
  const zero = answers.filter((a) => a.outcomeTier === "zero").length;
  const today = todayInTimeZone(new Date(), vault.timeZone);
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
