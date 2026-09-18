import { and, desc, eq, isNull } from "drizzle-orm";
import { Router, type IRouter, type Response } from "express";
import {
  CreateVaultCheckoutBody,
  CreateVaultCheckoutParams,
  CreateVaultCheckoutResponse,
  GetEntitlementByCheckoutSessionParams,
  GetEntitlementByCheckoutSessionResponse,
  GetOperatorVaultBillingStatusParams,
  GetOperatorVaultBillingStatusResponse,
  StartEntitlementBody,
  StartEntitlementResponse,
} from "@workspace/api-zod";
import { billingRecordsTable, db, findUnresolvedRefundReservation, vaultsTable } from "@workspace/db";
import { findStripePrice, getStripeClient, TIER_ORDER, VALID_PRICE_TRANSITIONS, type PaidTier } from "../lib/stripe";
import { requireOperator } from "../middlewares/auth";
import { getTrustedAppUrl } from "../lib/app-url";

const billingRouter: IRouter = Router();

function billingUnavailable(error: unknown, res: Response) {
  const message = error instanceof Error ? error.message : "Stripe billing is unavailable.";
  res.status(503).json({ error: message });
}

billingRouter.get("/billing/prices", async (req, res): Promise<void> => {
  try {
    const stripe = getStripeClient();
    const prices = await Promise.all(VALID_PRICE_TRANSITIONS.map(async ({ fromTier, targetTier }) => {
      const price = await findStripePrice(stripe, fromTier, targetTier);
      if (price.unit_amount === null || price.currency !== "usd") {
        throw new Error("Configured Stripe Price must have a fixed USD amount.");
      }
      return {
        fromTier,
        targetTier,
        amountCents: price.unit_amount,
        currency: price.currency,
      };
    }));
    res.json(prices);
  } catch (error) {
    req.log.error({ err: error }, "Stripe price catalog is unavailable");
    billingUnavailable(error, res);
  }
});

billingRouter.get("/operator/vaults/:vaultId/billing", requireOperator, async (req, res): Promise<void> => {
  const params = GetOperatorVaultBillingStatusParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [vault] = await db.select({
    id: vaultsTable.id,
    entitledPlanTier: vaultsTable.entitledPlanTier,
    createdAt: vaultsTable.createdAt,
  }).from(vaultsTable).where(and(
    eq(vaultsTable.id, params.data.vaultId),
    eq(vaultsTable.operatorId, req.account!.id),
  )).limit(1);
  if (!vault) {
    res.status(404).json({ error: "Vault not found." });
    return;
  }
  const attempts = await db.select({
    id: billingRecordsTable.id,
    fromTier: billingRecordsTable.fromTier,
    targetTier: billingRecordsTable.targetTier,
    amountCents: billingRecordsTable.amountCents,
    currency: billingRecordsTable.currency,
    status: billingRecordsTable.status,
    source: billingRecordsTable.source,
    createdAt: billingRecordsTable.createdAt,
  }).from(billingRecordsTable).where(eq(billingRecordsTable.vaultId, vault.id))
    .orderBy(desc(billingRecordsTable.createdAt));
  res.json(GetOperatorVaultBillingStatusResponse.parse({
    vaultId: vault.id,
    currentTier: vault.entitledPlanTier,
    vaultCreatedAt: vault.createdAt.toISOString(),
    attempts,
  }));
});

billingRouter.post("/operator/vaults/:vaultId/checkout", requireOperator, async (req, res): Promise<void> => {
  const params = CreateVaultCheckoutParams.safeParse(req.params);
  const body = CreateVaultCheckoutBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [vault] = await db.select().from(vaultsTable).where(and(
    eq(vaultsTable.id, params.data.vaultId),
    eq(vaultsTable.operatorId, req.account!.id),
  )).limit(1);
  if (!vault) {
    res.status(404).json({ error: "Vault not found." });
    return;
  }

  const targetTier = body.data.targetTier as PaidTier;
  const fromTier = vault.entitledPlanTier;
  if (TIER_ORDER[targetTier] <= TIER_ORDER[fromTier]) {
    res.status(400).json({ error: "Choose a paid tier above the vault's current entitlement." });
    return;
  }
  let stripe;
  let billingRecordId: string | null = null;
  try {
    stripe = getStripeClient();
  } catch (error) {
    req.log.error({ err: error }, "Stripe Checkout configuration is invalid");
    billingUnavailable(error, res);
    return;
  }
  try {
    const price = await findStripePrice(stripe, fromTier, targetTier);
    if (price.unit_amount === null || price.currency !== "usd") {
      throw new Error("Configured Stripe Price must have a fixed USD amount.");
    }
    const priceAmountCents = price.unit_amount;
    let appUrl: string;
    try {
      appUrl = getTrustedAppUrl();
    } catch (error) {
      billingUnavailable(error, res);
      return;
    }
    const attempt = await db.transaction(async (tx) => {
      const [lockedVault] = await tx.select({
        id: vaultsTable.id,
        entitledPlanTier: vaultsTable.entitledPlanTier,
      }).from(vaultsTable).where(and(
        eq(vaultsTable.id, vault.id),
        eq(vaultsTable.operatorId, req.account!.id),
      )).limit(1).for("update");
      if (!lockedVault) return { kind: "missing" as const };
      const refundReservation = await findUnresolvedRefundReservation(tx, { vaultId: lockedVault.id });
      if (refundReservation) return { kind: "refund-reserved" as const };
      const [pending] = await tx.select()
        .from(billingRecordsTable)
        .where(and(
          eq(billingRecordsTable.vaultId, lockedVault.id),
          eq(billingRecordsTable.status, "pending"),
        ))
        .limit(1);
      if (pending) {
        if (pending.targetTier !== targetTier) {
          return { kind: "pending-other-tier" as const };
        }
        return { kind: "pending" as const, billingRecord: pending };
      }
      if (TIER_ORDER[targetTier] <= TIER_ORDER[lockedVault.entitledPlanTier]) {
        return { kind: "not-upward" as const };
      }
      const [billingRecord] = await tx.insert(billingRecordsTable).values({
        vaultId: lockedVault.id,
        operatorId: req.account!.id,
        fromTier: lockedVault.entitledPlanTier,
        targetTier,
        amountCents: priceAmountCents,
        currency: price.currency,
      }).returning();
      return { kind: "created" as const, billingRecord };
    });
    if (attempt.kind === "missing") {
      res.status(404).json({ error: "Vault not found." });
      return;
    }
    if (attempt.kind === "not-upward") {
      res.status(400).json({ error: "Choose a paid tier above the vault's current entitlement." });
      return;
    }
    if (attempt.kind === "pending-other-tier") {
      res.status(409).json({ error: "A Checkout attempt for another tier is already pending for this vault." });
      return;
    }
    if (attempt.kind === "refund-reserved") {
      res.status(409).json({ error: "A refund is in progress for this vault." });
      return;
    }
    const { billingRecord } = attempt;
    billingRecordId = billingRecord.id;
    const session = billingRecord.stripeCheckoutSessionId
      ? await stripe.checkout.sessions.retrieve(billingRecord.stripeCheckoutSessionId)
      : await stripe.checkout.sessions.create({
          mode: "payment",
          line_items: [{ price: price.id, quantity: 1 }],
          success_url: `${appUrl.replace(/\/$/, "")}/billing/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${appUrl.replace(/\/$/, "")}/billing/checkout/cancelled`,
          metadata: { billing_record_id: billingRecord.id, vault_id: vault.id },
           payment_intent_data: {
             metadata: { billing_record_id: billingRecord.id, vault_id: vault.id },
           },
          managed_payments: { enabled: false },
        }, { idempotencyKey: billingRecord.id });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    await db.update(billingRecordsTable).set({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    }).where(eq(billingRecordsTable.id, billingRecord.id));
    res.status(201).json(CreateVaultCheckoutResponse.parse({
      billingRecordId: billingRecord.id,
      checkoutUrl: session.url,
      status: "pending",
    }));
  } catch (error) {
    req.log.error({ err: error, billingRecordId }, "Stripe Checkout creation failed");
    res.status(503).json({ error: "Unable to create Stripe Checkout. Please try again." });
  }
});

billingRouter.post("/operator/entitlements", requireOperator, async (req, res): Promise<void> => {
  const body = StartEntitlementBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const operatorId = req.account!.id;
  const targetTier = body.data.targetTier;

  if (targetTier === "lockbox") {
    const [billingRecord] = await db.insert(billingRecordsTable).values({
      operatorId,
      vaultId: null,
      fromTier: "lockbox",
      targetTier: "lockbox",
      amountCents: 0,
      currency: "usd",
      status: "paid",
      source: "lockbox",
    }).returning();
    res.status(201).json(StartEntitlementResponse.parse({
      status: "ready",
      billingRecordId: billingRecord.id,
      targetTier: "lockbox",
      checkoutUrl: null,
    }));
    return;
  }

  const paidTargetTier = targetTier as PaidTier;
  const [existing] = await db.select().from(billingRecordsTable).where(and(
    eq(billingRecordsTable.operatorId, operatorId),
    eq(billingRecordsTable.targetTier, paidTargetTier),
    eq(billingRecordsTable.status, "paid"),
    isNull(billingRecordsTable.vaultId),
    isNull(billingRecordsTable.appliedAt),
  )).limit(1);
  if (existing) {
    res.status(201).json(StartEntitlementResponse.parse({
      status: "ready",
      billingRecordId: existing.id,
      targetTier: paidTargetTier,
      checkoutUrl: null,
    }));
    return;
  }

  let stripe;
  let billingRecordId: string | null = null;
  try {
    stripe = getStripeClient();
  } catch (error) {
    req.log.error({ err: error }, "Stripe Checkout configuration is invalid");
    billingUnavailable(error, res);
    return;
  }
  try {
    const price = await findStripePrice(stripe, "lockbox", paidTargetTier);
    if (price.unit_amount === null || price.currency !== "usd") {
      throw new Error("Configured Stripe Price must have a fixed USD amount.");
    }
    let appUrl: string;
    try {
      appUrl = getTrustedAppUrl();
    } catch (error) {
      billingUnavailable(error, res);
      return;
    }
    const [billingRecord] = await db.insert(billingRecordsTable).values({
      operatorId,
      vaultId: null,
      fromTier: "lockbox",
      targetTier: paidTargetTier,
      amountCents: price.unit_amount,
      currency: price.currency,
    }).returning();
    billingRecordId = billingRecord.id;
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: `${appUrl.replace(/\/$/, "")}/operator/vaults/new?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl.replace(/\/$/, "")}/operator/vaults/new?checkout_cancelled=1`,
      metadata: { billing_record_id: billingRecord.id },
      payment_intent_data: {
        metadata: { billing_record_id: billingRecord.id },
      },
      managed_payments: { enabled: false },
    }, { idempotencyKey: billingRecord.id });
    if (!session.url) throw new Error("Stripe did not return a Checkout URL.");
    await db.update(billingRecordsTable).set({
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
    }).where(eq(billingRecordsTable.id, billingRecord.id));
    res.status(201).json(StartEntitlementResponse.parse({
      status: "checkout",
      billingRecordId: billingRecord.id,
      targetTier: paidTargetTier,
      checkoutUrl: session.url,
    }));
  } catch (error) {
    req.log.error({ err: error, billingRecordId }, "Stripe Checkout creation failed");
    res.status(503).json({ error: "Unable to create Stripe Checkout. Please try again." });
  }
});

billingRouter.get("/operator/entitlements/sessions/:checkoutSessionId", requireOperator, async (req, res): Promise<void> => {
  const params = GetEntitlementByCheckoutSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [billingRecord] = await db.select().from(billingRecordsTable).where(and(
    eq(billingRecordsTable.stripeCheckoutSessionId, params.data.checkoutSessionId),
    eq(billingRecordsTable.operatorId, req.account!.id),
  )).limit(1);
  if (!billingRecord) {
    res.status(404).json({ error: "Entitlement not found." });
    return;
  }
  res.json(GetEntitlementByCheckoutSessionResponse.parse({
    billingRecordId: billingRecord.id,
    targetTier: billingRecord.targetTier,
    status: billingRecord.status,
  }));
});

export default billingRouter;