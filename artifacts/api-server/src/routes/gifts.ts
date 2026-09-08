import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  CreateGiftCheckoutBody, CreateGiftCheckoutResponse, GetGiftCardParams,
  GetGiftCardResponse, GetGiftCardByCheckoutSessionParams, RedeemGiftBody, RedeemGiftResponse,
} from "@workspace/api-zod";
import { billingRecordsTable, db, giftsTable, vaultsTable } from "@workspace/db";
import { findStripePrice, getStripeClient, TIER_ORDER, type PaidTier } from "../lib/stripe";
import { requireOperator } from "../middlewares/auth";
import { getTrustedAppUrl } from "../lib/app-url";

const giftRouter: IRouter = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function limited(key: string, limit: number) {
  const now = Date.now(); const current = attempts.get(key);
  if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 3_600_000 }); return false; }
  current.count += 1; return current.count > limit;
}
function code() {
  const bytes = randomBytes(16);
  return [...bytes].map((byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
function normalized(value: string) { return value.trim().toUpperCase(); }
function giftCard(gift: typeof giftsTable.$inferSelect) {
  const base = getTrustedAppUrl();
  return GetGiftCardResponse.parse({
    logo: "Vault Zombie", line: "A Vault Zombie vault has been given to you.",
    tierName: gift.targetTier.replace("_", " "), code: gift.code,
    redemptionUrl: `${base}/gifts/redeem`, fromLine: gift.fromLine, toLine: gift.toLine,
    description: "A vault seals your guests' predictions until their chosen reveal dates.",
  });
}

giftRouter.post("/gifts/checkout", async (req, res, next) => {
  try {
    const input = CreateGiftCheckoutBody.parse(req.body);
    const targetTier = input.targetTier as PaidTier;
    const stripe = getStripeClient();
    const price = await findStripePrice(stripe, "lockbox", targetTier);
    if (price.unit_amount == null || price.currency !== "usd") throw new Error("Configured Stripe Price must have a fixed USD amount.");
    const appUrl = getTrustedAppUrl();
    let gift;
    for (let i = 0; i < 3; i += 1) {
      try {
        [gift] = await db.insert(giftsTable).values({
          code: code(), targetTier, amountCents: price.unit_amount, currency: price.currency,
          fromLine: input.fromLine?.trim() || null, toLine: input.toLine?.trim() || null,
          gifterEmail: input.gifterEmail?.trim().toLowerCase() || null,
        }).returning();
        break;
      } catch (error) { if (i === 2) throw error; }
    }
    if (!gift) throw new Error("Unable to allocate a gift code.");
    const session = await stripe.checkout.sessions.create({
      mode: "payment", line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${appUrl.replace(/\/$/, "")}/gifts/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl.replace(/\/$/, "")}/gifts/checkout/cancelled`,
      metadata: { gift_id: gift.id },
      payment_intent_data: { metadata: { gift_id: gift.id } },
    }, { idempotencyKey: gift.id });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    await db.update(giftsTable).set({ stripeCheckoutSessionId: session.id }).where(eq(giftsTable.id, gift.id));
    return res.status(201).json(CreateGiftCheckoutResponse.parse({ giftId: gift.id, checkoutUrl: session.url, status: "pending" }));
  } catch (error) {
    if (error instanceof Error && error.message.includes("VAULT_ZOMBIE_APP_URL")) return res.status(503).json({ error: error.message });
    return next(error);
  }
});

giftRouter.get("/gifts/:code/card", async (req, res, next) => {
  try {
    const { code: value } = GetGiftCardParams.parse(req.params);
    const [gift] = await db.select().from(giftsTable).where(eq(giftsTable.code, normalized(value))).limit(1);
    if (!gift || (gift.status !== "purchased" && gift.status !== "disputed")) return res.status(404).json({ error: "Gift card not found." });
    return res.json(giftCard(gift));
  } catch (error) {
    if (error instanceof Error && error.message.includes("VAULT_ZOMBIE_APP_URL")) return res.status(503).json({ error: error.message });
    return next(error);
  }
});

giftRouter.get("/gifts/checkout/sessions/:checkoutSessionId/card", async (req, res, next) => {
  try {
    const { checkoutSessionId } = GetGiftCardByCheckoutSessionParams.parse(req.params);
    const [gift] = await db.select().from(giftsTable)
      .where(eq(giftsTable.stripeCheckoutSessionId, checkoutSessionId)).limit(1);
    if (!gift || (gift.status !== "purchased" && gift.status !== "disputed")) {
      return res.status(404).json({ error: "Purchased gift card not found." });
    }
    return res.json(giftCard(gift));
  } catch (error) {
    if (error instanceof Error && error.message.includes("VAULT_ZOMBIE_APP_URL")) {
      return res.status(503).json({ error: error.message });
    }
    return next(error);
  }
});

giftRouter.post("/operator/gifts/redeem", requireOperator, async (req, res, next) => {
  try {
    const input = RedeemGiftBody.parse(req.body); const giftCode = normalized(input.code);
    if (limited(`gift-code:${giftCode}`, 120) || limited(`gift-source:${req.ip}`, 8)) {
      return res.status(429).json({ error: "Too many attempts. Try again later." });
    }
    const result = await db.transaction(async (tx) => {
      const [gift] = await tx.select().from(giftsTable).where(eq(giftsTable.code, giftCode)).limit(1).for("update");
      if (!gift) return { kind: "missing" as const };
      if (gift.status !== "purchased" && gift.status !== "disputed") return { kind: "unavailable" as const };
      const [vault] = await tx.select().from(vaultsTable).where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, req.account!.id))).limit(1).for("update");
      if (!vault) return { kind: "vault-missing" as const };
      if (vault.status !== "draft" || TIER_ORDER[gift.targetTier] <= TIER_ORDER[vault.entitledPlanTier]) return { kind: "invalid-vault" as const };
      const [billing] = await tx.insert(billingRecordsTable).values({
        vaultId: vault.id, operatorId: req.account!.id, fromTier: vault.entitledPlanTier,
        targetTier: gift.targetTier, amountCents: gift.amountCents, currency: gift.currency,
        status: "paid", source: "gift", giftCode: gift.code,
      }).returning();
      await tx.update(vaultsTable).set({ entitledPlanTier: gift.targetTier }).where(eq(vaultsTable.id, vault.id));
      await tx.update(giftsTable).set({ status: "redeemed", redeemedAt: new Date(), redeemedVaultId: vault.id, redeemedBillingRecordId: billing.id }).where(eq(giftsTable.id, gift.id));
      return { kind: "ok" as const, billing };
    });
    if (result.kind === "missing" || result.kind === "vault-missing") return res.status(404).json({ error: "Gift or vault not found." });
    if (result.kind === "unavailable") return res.status(409).json({ error: "This gift is no longer redeemable." });
    if (result.kind === "invalid-vault") return res.status(400).json({ error: "Choose an owned draft vault below the gift tier." });
    return res.json(RedeemGiftResponse.parse({ vaultId: input.vaultId, billingRecordId: result.billing.id, tier: result.billing.targetTier }));
  } catch (error) { return next(error); }
});

export default giftRouter;