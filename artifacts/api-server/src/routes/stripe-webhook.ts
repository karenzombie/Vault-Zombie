import { and, asc, eq, gt, inArray, isNull } from "drizzle-orm";
import type { RequestHandler } from "express";
import type Stripe from "stripe";
import {
  billingRecordsTable,
  db,
  findUnresolvedRefundReservation,
  giftsTable,
  enqueueEmail,
  overageEventsTable,
  stripeWebhookEventsTable,
  submissionsTable,
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
      giftId: session.metadata?.gift_id ?? null,
      checkoutSessionId: session.id,
      paymentIntentId: idFromExpandable(session.payment_intent),
      chargeId: null,
    };
  }
  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    return {
      billingRecordId: paymentIntent.metadata?.billing_record_id ?? null,
      giftId: paymentIntent.metadata?.gift_id ?? null,
      checkoutSessionId: null,
      paymentIntentId: paymentIntent.id,
      chargeId: idFromExpandable(paymentIntent.latest_charge),
    };
  }
  if (event.type === "charge.dispute.created") {
    const dispute = event.data.object;
    return {
      billingRecordId: dispute.metadata?.billing_record_id ?? null,
      giftId: dispute.metadata?.gift_id ?? null,
      checkoutSessionId: null,
      paymentIntentId: idFromExpandable(dispute.payment_intent),
      chargeId: idFromExpandable(dispute.charge),
    };
  }
  return {
    billingRecordId: null,
    giftId: null,
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
    let gift = references.giftId
      ? (await tx.select().from(giftsTable).where(eq(giftsTable.id, references.giftId)).limit(1).for("update"))[0]
      : undefined;
    if (!gift && references.checkoutSessionId) {
      gift = (await tx.select().from(giftsTable).where(eq(giftsTable.stripeCheckoutSessionId, references.checkoutSessionId)).limit(1).for("update"))[0];
    }
    if (!gift && references.paymentIntentId) {
      gift = (await tx.select().from(giftsTable).where(eq(giftsTable.stripePaymentIntentId, references.paymentIntentId)).limit(1).for("update"))[0];
    }
    if (gift) {
      const refundReservation = await findUnresolvedRefundReservation(tx, { giftId: gift.id });
      if (refundReservation) {
        throw new Error("Gift refund reservation is unresolved; retry webhook later.");
      }
      const paymentSucceeded = event.type === "checkout.session.async_payment_succeeded"
        || (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid");
      if (paymentSucceeded && (gift.status === "pending" || gift.status === "failed" || gift.status === "expired")) {
        await tx.update(giftsTable).set({
          status: "purchased",
          stripeCheckoutSessionId: references.checkoutSessionId ?? gift.stripeCheckoutSessionId,
          stripePaymentIntentId: references.paymentIntentId ?? gift.stripePaymentIntentId,
          stripeChargeId: references.chargeId ?? gift.stripeChargeId,
        }).where(eq(giftsTable.id, gift.id));
        return { result: "activated" as const, giftId: gift.id };
      }
      if ((event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed" || event.type === "payment_intent.payment_failed") && gift.status === "pending") {
        await tx.update(giftsTable).set({
          status: event.type === "checkout.session.expired" ? "expired" : "failed",
          stripeCheckoutSessionId: references.checkoutSessionId ?? gift.stripeCheckoutSessionId,
          stripePaymentIntentId: references.paymentIntentId ?? gift.stripePaymentIntentId,
          stripeChargeId: references.chargeId ?? gift.stripeChargeId,
        }).where(eq(giftsTable.id, gift.id));
        return "failed" as const;
      }
      if (event.type === "charge.dispute.created" && gift.status === "purchased") {
        await tx.update(giftsTable).set({ status: "disputed" }).where(eq(giftsTable.id, gift.id));
        return "disputed" as const;
      }
      return "ignored" as const;
    }

    let billingRecord = references.billingRecordId
      ? (await tx.select().from(billingRecordsTable)
          .where(eq(billingRecordsTable.id, references.billingRecordId))
          .limit(1))[0]
      : undefined;
    if (!billingRecord && references.checkoutSessionId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripeCheckoutSessionId, references.checkoutSessionId))
        .limit(1))[0];
    }
    if (!billingRecord && references.paymentIntentId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripePaymentIntentId, references.paymentIntentId))
        .limit(1))[0];
    }
    if (!billingRecord && references.chargeId) {
      billingRecord = (await tx.select().from(billingRecordsTable)
        .where(eq(billingRecordsTable.stripeChargeId, references.chargeId))
        .limit(1))[0];
    }
    // Do not consume an otherwise valid event that arrived before its local
    // Checkout correlation write; Stripe can retry it after correlation exists.
    if (!billingRecord) throw new Error("Unmatched Stripe event; retry required.");
    if (!billingRecord.vaultId) throw new Error(`Billing record ${billingRecord.id} has no vault.`);
    // One lock order is shared with refund creation/finalization:
    // vault -> billing record -> refund attempt.
    const [lockedVault] = await tx.select().from(vaultsTable)
      .where(eq(vaultsTable.id, billingRecord.vaultId)).limit(1).for("update");
    if (!lockedVault) throw new Error(`Vault ${billingRecord.vaultId} was not found for billing record.`);
    [billingRecord] = await tx.select().from(billingRecordsTable)
      .where(eq(billingRecordsTable.id, billingRecord.id)).limit(1).for("update");
    if (!billingRecord) throw new Error("Billing record disappeared while acquiring its lock.");
    const refundReservation = await findUnresolvedRefundReservation(tx, { billingRecordId: billingRecord.id });
    const vaultRefundReservation = await findUnresolvedRefundReservation(tx, { vaultId: lockedVault.id });
    if (refundReservation || vaultRefundReservation) {
      throw new Error("Billing refund reservation is unresolved; retry webhook later.");
    }

    await tx.update(stripeWebhookEventsTable).set({
      billingRecordId: billingRecord.id,
    }).where(eq(stripeWebhookEventsTable.stripeEventId, event.id));

    const commonBillingUpdate = {
      stripeCheckoutSessionId: references.checkoutSessionId ?? billingRecord.stripeCheckoutSessionId,
      stripePaymentIntentId: references.paymentIntentId ?? billingRecord.stripePaymentIntentId,
      stripeChargeId: references.chargeId ?? billingRecord.stripeChargeId,
    };
    if (billingRecord.status === "refunded") return "ignored" as const;

    if (
      event.type === "checkout.session.completed" ||
      event.type === "checkout.session.async_payment_succeeded"
    ) {
      if (billingRecord.status === "disputed") {
        return "ignored" as const;
      }
      const shouldActivate = event.type === "checkout.session.async_payment_succeeded"
        || event.data.object.payment_status === "paid";
      if (!shouldActivate) {
        await tx.update(billingRecordsTable).set(commonBillingUpdate)
          .where(eq(billingRecordsTable.id, billingRecord.id));
        return "pending" as const;
      }
      if (billingRecord.appliedAt || billingRecord.status === "paid") {
        await tx.update(billingRecordsTable).set({
          ...commonBillingUpdate,
          appliedAt: billingRecord.appliedAt ?? new Date(),
        }).where(eq(billingRecordsTable.id, billingRecord.id));
        return "ignored" as const;
      }
      await tx.update(billingRecordsTable).set({
        ...commonBillingUpdate,
        status: "paid",
        appliedAt: new Date(),
      }).where(eq(billingRecordsTable.id, billingRecord.id));
      const [newerAppliedRecord] = await tx.select({ id: billingRecordsTable.id }).from(billingRecordsTable).where(and(
        eq(billingRecordsTable.vaultId, lockedVault.id),
        gt(billingRecordsTable.createdAt, billingRecord.createdAt),
        inArray(billingRecordsTable.status, ["paid", "refunded", "disputed", "comped"]),
      )).limit(1);
      if (newerAppliedRecord) return "activated" as const;
      if (TIER_ORDER[billingRecord.targetTier] > TIER_ORDER[lockedVault.entitledPlanTier]) {
        await tx.update(vaultsTable).set({
          entitledPlanTier: billingRecord.targetTier,
        }).where(eq(vaultsTable.id, lockedVault.id));
        // Release only submissions now within the new entitlement; content remains
        // held if a repeat overage still exists.
        const cap = { lockbox: 10, safe: 50, vault: 100, deep_vault: 250 }[billingRecord.targetTier];
        const active = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
          .where(and(eq(submissionsTable.vaultId, lockedVault.id), isNull(submissionsTable.culledAt)))
          .orderBy(asc(submissionsTable.submittedAt));
        const ids = active.slice(0, cap).map((row) => row.id);
        if (ids.length) await tx.update(submissionsTable).set({ heldAt: null, archivedAt: null }).where(inArray(submissionsTable.id, ids));
        const held = active.slice(cap).map((row) => row.id);
        if (held.length) await tx.update(submissionsTable).set({ heldAt: new Date(), archivedAt: null }).where(inArray(submissionsTable.id, held));
        await tx.update(overageEventsTable).set({ outcome: "upgraded", resolvedAt: new Date() })
          .where(and(eq(overageEventsTable.vaultId, lockedVault.id), isNull(overageEventsTable.resolvedAt)));
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
    // The Stripe state transition above is committed before this durable enqueue.
    // A notification problem must never make Stripe retry an already-completed payment.
    if (typeof result === "object" && result.result === "activated") {
      try {
        const [gift] = await db.select().from(giftsTable).where(eq(giftsTable.id, result.giftId)).limit(1);
        if (gift?.gifterEmail) await enqueueEmail({
          dedupeKey: `gift-delivery:${gift.id}`, eventType: "gift_delivery", recipientEmail: gift.gifterEmail,
          giftId: gift.id, payload: { giftCode: gift.code },
        });
      } catch (error) { req.log.error({ err: error, stripeEventId: event.id }, "Gift delivery email enqueue failed"); }
    }
    res.status(200).json({ received: true, result });
  } catch (error) {
    req.log.error({ err: error, stripeEventId: event.id }, "Stripe webhook processing failed");
    res.status(500).json({ error: "Stripe webhook processing failed." });
  }
};