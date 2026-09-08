import { eq } from "drizzle-orm";
import type { RequestHandler } from "express";
import type Stripe from "stripe";
import {
  billingRecordsTable,
  db,
  stripeWebhookEventsTable,
  vaultsTable,
} from "@workspace/db";
import { getStripeClient, TIER_ORDER } from "../lib/stripe";

export const EXPECTED_STRIPE_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
  "payment_intent.payment_failed",
  "charge.dispute.created",
] as const;

type ExpectedStripeEvent = typeof EXPECTED_STRIPE_EVENTS[number];

function isExpectedEvent(type: string): type is ExpectedStripeEvent {
  return (EXPECTED_STRIPE_EVENTS as readonly string[]).includes(type);
}

function idFromExpandable(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id ?? null;
}

function eventReferences(event: Stripe.Event) {
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded" ||
    event.type === "checkout.session.async_payment_failed" ||
    event.type === "checkout.session.expired"
  ) {
    const session = event.data.object;
    return {
      billingRecordId: session.metadata?.billing_record_id ?? null,
      checkoutSessionId: session.id,
      paymentIntentId: idFromExpandable(session.payment_intent),
      chargeId: null,
    };
  }
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    return {
      billingRecordId: paymentIntent.metadata?.billing_record_id ?? null,
      checkoutSessionId: null,
      paymentIntentId: paymentIntent.id,
      chargeId: idFromExpandable(paymentIntent.latest_charge),
    };
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    return {
      billingRecordId: dispute.metadata?.billing_record_id ?? null,
      checkoutSessionId: null,
      paymentIntentId: idFromExpandable(dispute.payment_intent),
      chargeId: idFromExpandable(dispute.charge),
    };
  }
  return {
    billingRecordId: null,
    checkoutSessionId: null,
    paymentIntentId: null,
    chargeId: null,
  };
}

async function processVerifiedEvent(event: Stripe.Event) {
  const references = eventReferences(event);
  return db.transaction(async (tx) => {
    const [recordedEvent] = await tx.insert(stripeWebhookEventsTable).values({
      stripeEventId: event.id,
      eventType: event.type,
    }).onConflictDoNothing({
      target: stripeWebhookEventsTable.stripeEventId,
    }).returning({ id: stripeWebhookEventsTable.id });
    if (!recordedEvent) return "duplicate" as const;
    if (!isExpectedEvent(event.type)) return "ignored" as const;

    let billingRecord = references.billingRecordId
      ? (await tx.select().from(billingRecordsTable)
          .where(eq(billingRecordsTable.id, references.billingRecordId))
          .limit(1).for("update"))[0]
      : undefined;
    if (!billingRecord && references.checkoutSessionId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripeCheckoutSessionId, references.checkoutSessionId))
        .limit(1).for("update"))[0];
    }
    if (!billingRecord && references.paymentIntentId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripePaymentIntentId, references.paymentIntentId))
        .limit(1).for("update"))[0];
    }
    if (!billingRecord && references.chargeId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripeChargeId, references.chargeId))
        .limit(1).for("update"))[0];
    }
    if (!billingRecord) return "unmatched" as const;

    await tx.update(stripeWebhookEventsTable).set({
      billingRecordId: billingRecord.id,
    }).where(eq(stripeWebhookEventsTable.stripeEventId, event.id));

    const commonBillingUpdate = {
      stripeCheckoutSessionId: references.checkoutSessionId ?? billingRecord.stripeCheckoutSessionId,
      stripePaymentIntentId: references.paymentIntentId ?? billingRecord.stripePaymentIntentId,
      stripeChargeId: references.chargeId ?? billingRecord.stripeChargeId,
    };

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      const shouldActivate = event.type === "checkout.session.async_payment_succeeded"
        || event.data.object.payment_status === "paid";
      if (!shouldActivate) {
        await tx.update(billingRecordsTable).set(commonBillingUpdate)
          .where(eq(billingRecordsTable.id, billingRecord.id));
        return "pending" as const;
      }
      await tx.update(billingRecordsTable).set({
        ...commonBillingUpdate,
        status: billingRecord.status === "disputed" ? "disputed" : "paid",
      }).where(eq(billingRecordsTable.id, billingRecord.id));
      const [vault] = await tx.select({
        entitledPlanTier: vaultsTable.entitledPlanTier,
      }).from(vaultsTable)
        .where(eq(vaultsTable.id, billingRecord.vaultId))
        .limit(1).for("update");
      if (!vault) throw new Error(`Vault ${billingRecord.vaultId} was not found for paid billing record.`);
      if (TIER_ORDER[billingRecord.targetTier] > TIER_ORDER[vault.entitledPlanTier]) {
        await tx.update(vaultsTable).set({
          entitledPlanTier: billingRecord.targetTier,
        }).where(eq(vaultsTable.id, billingRecord.vaultId));
      }
      return "activated" as const;
    }

    if (event.type !== "charge.dispute.created" && billingRecord.status !== "pending") {
      return "ignored" as const;
    }
    const status = event.type === "checkout.session.expired"
      ? "expired"
      : event.type === "charge.dispute.created"
        ? "disputed"
        : "failed";
    await tx.update(billingRecordsTable).set({
      ...commonBillingUpdate,
      status,
    }).where(eq(billingRecordsTable.id, billingRecord.id));
    return status;
  });
}

export const stripeWebhookBoundary: RequestHandler = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    req.log.error("STRIPE_WEBHOOK_SECRET is not configured");
    res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is required before Stripe webhooks can be accepted." });
    return;
  }
  const signature = req.header("stripe-signature");
  if (!signature) {
    res.status(400).json({ error: "Missing Stripe-Signature header." });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    req.log.error("Stripe webhook body was not received as raw bytes");
    res.status(500).json({ error: "Stripe webhook raw body is unavailable." });
    return;
  }
  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (error) {
    req.log.warn({ err: error }, "Stripe webhook signature verification failed");
    res.status(400).json({ error: "Invalid Stripe webhook signature." });
    return;
  }
  try {
    const result = await processVerifiedEvent(event);
    if (result === "unmatched") {
      req.log.warn({ stripeEventId: event.id, stripeEventType: event.type }, "Stripe webhook did not match a billing record");
    }
    res.status(200).json({ received: true, result });
  } catch (error) {
    req.log.error({ err: error, stripeEventId: event.id }, "Stripe webhook processing failed");
    res.status(500).json({ error: "Stripe webhook processing failed." });
  }
};