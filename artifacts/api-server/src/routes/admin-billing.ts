import { and, asc, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetOperatorOverageStatusParams, GetOperatorOverageStatusResponse, GrantVaultCompBody, GrantVaultCompParams,
  RefundGiftBody, RefundGiftParams, RefundGiftResponse,
  ListAdminBillingResponse, ListAdminGiftsResponse, ListAdminOveragesResponse, RefundBillingRecordBody, RefundBillingRecordParams,
  RefundBillingRecordResponse, GrantVaultCompResponse,
} from "@workspace/api-zod";
import {
  billingRecordsTable, db, declineGuestOverage, PLAN_POLICY, runSensitiveAdminAction,
  giftsTable, overageEventsTable, revealSlotsTable, submissionsTable, vaultsTable, emailDeliveriesTable, enqueueEmail, requeueEmail,
} from "@workspace/db";
import { ListAdminEmailDeliveriesResponse, RetryAdminEmailDeliveryParams, RetryAdminEmailDeliveryBody, RetryAdminEmailDeliveryResponse, ResendAdminGiftParams, ResendAdminGiftBody, ResendAdminGiftResponse } from "@workspace/api-zod";
import { getStripeClient, TIER_ORDER, type PaidTier } from "../lib/stripe";
import { requireAdmin, requireOperator, sensitiveAdminGuards } from "../middlewares/auth";

const adminBillingRouter: IRouter = Router();

adminBillingRouter.get("/operator/vaults/:vaultId/overage", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetOperatorOverageStatusParams.parse(req.params);
    const [vault] = await db.select().from(vaultsTable).where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, req.account!.id))).limit(1);
    if (!vault) return res.status(404).json({ error: "Vault not found." });
    const rows = await db.select({ id: submissionsTable.id, heldAt: submissionsTable.heldAt })
      .from(submissionsTable).where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
    const today = new Date().toISOString().slice(0, 10);
    const [nearest] = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable)
      .where(and(eq(revealSlotsTable.vaultId, vaultId), gte(revealSlotsTable.revealDate, today))).orderBy(asc(revealSlotsTable.revealDate)).limit(1);
    return res.json(GetOperatorOverageStatusResponse.parse({
      vaultId,
      heldSubmissionCount: rows.filter((row) => row.heldAt).length, unresolved: rows.some((row) => row.heldAt !== null),
      nearestRevealDate: nearest?.revealDate ?? null,
    }));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/operator/vaults/:vaultId/overage", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetOperatorOverageStatusParams.parse(req.params);
    const archivedSubmissionCount = await declineGuestOverage(vaultId, req.account!.id);
    return res.json({ archivedSubmissionCount });
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/billing", requireOperator, requireAdmin, async (_req, res, next) => {
  try {
    const records = await db.select({
      id: billingRecordsTable.id, vaultId: billingRecordsTable.vaultId, operatorId: billingRecordsTable.operatorId,
      targetTier: billingRecordsTable.targetTier, amountCents: billingRecordsTable.amountCents, currency: billingRecordsTable.currency,
      status: billingRecordsTable.status, source: billingRecordsTable.source, stripeRefundId: billingRecordsTable.stripeRefundId,
      createdAt: billingRecordsTable.createdAt,
    }).from(billingRecordsTable).orderBy(desc(billingRecordsTable.createdAt));
    return res.json(ListAdminBillingResponse.parse({ records }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/gifts", requireOperator, requireAdmin, async (_req, res, next) => {
  try {
    const now = Date.now();
    const gifts = await db.select({
      id: giftsTable.id, code: giftsTable.code, targetTier: giftsTable.targetTier, status: giftsTable.status,
      amountCents: giftsTable.amountCents, currency: giftsTable.currency, fromLine: giftsTable.fromLine,
      toLine: giftsTable.toLine, gifterEmail: giftsTable.gifterEmail, createdAt: giftsTable.createdAt,
      redeemedAt: giftsTable.redeemedAt, refundedAt: giftsTable.refundedAt, redeemedVaultId: giftsTable.redeemedVaultId,
      stripeRefundId: giftsTable.stripeRefundId, stripePaymentIntentId: giftsTable.stripePaymentIntentId,
    }).from(giftsTable).orderBy(desc(giftsTable.createdAt));
    const deliveries = gifts.length ? await db.select({ giftId: emailDeliveriesTable.giftId, status: emailDeliveriesTable.status, lastError: emailDeliveriesTable.lastError, createdAt: emailDeliveriesTable.createdAt })
      .from(emailDeliveriesTable).where(inArray(emailDeliveriesTable.giftId, gifts.map((gift) => gift.id))).orderBy(desc(emailDeliveriesTable.createdAt)) : [];
    return res.json(ListAdminGiftsResponse.parse({ gifts: gifts.map((gift) => ({
      ...gift,
      latestDeliveryStatus: deliveries.find((delivery) => delivery.giftId === gift.id)?.status ?? null,
      latestDeliveryError: deliveries.find((delivery) => delivery.giftId === gift.id)?.lastError ?? null,
      refundableNow: gift.status === "purchased" && !gift.redeemedAt && !gift.refundedAt &&
        !gift.stripeRefundId && Boolean(gift.stripePaymentIntentId) &&
        now - gift.createdAt.valueOf() <= 90 * 24 * 60 * 60 * 1000,
    })) }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/overages", requireOperator, requireAdmin, async (_req, res, next) => {
  try {
    const events = await db.select().from(overageEventsTable).orderBy(desc(overageEventsTable.createdAt));
    return res.json(ListAdminOveragesResponse.parse({ events }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/email-deliveries", requireOperator, requireAdmin, async (_req, res, next) => {
  try {
    const deliveries = await db.select().from(emailDeliveriesTable).orderBy(desc(emailDeliveriesTable.createdAt)).limit(250);
    return res.json(ListAdminEmailDeliveriesResponse.parse({ deliveries }));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/admin/email-deliveries/:emailDeliveryId/retry", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { emailDeliveryId } = RetryAdminEmailDeliveryParams.parse(req.params);
    const { reason } = RetryAdminEmailDeliveryBody.parse(req.body);
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "email_retry", targetType: "email_delivery", targetId: emailDeliveryId, reason }, async (tx) => {
      const [row] = await tx.select().from(emailDeliveriesTable).where(eq(emailDeliveriesTable.id, emailDeliveryId)).limit(1).for("update");
      if (!row || row.status !== "failed") throw new Error("Only failed email deliveries can be retried.");
      await tx.update(emailDeliveriesTable).set({ status: "queued", lastError: null, claimedAt: null, claimToken: null }).where(eq(emailDeliveriesTable.id, row.id));
      return { id: row.id, status: "queued" as const };
    });
    return res.json(RetryAdminEmailDeliveryResponse.parse(result));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/admin/gifts/:giftId/resend", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { giftId } = ResendAdminGiftParams.parse(req.params); const { reason, requestId } = ResendAdminGiftBody.parse(req.body);
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "gift_resend", targetType: "gift", targetId: giftId, reason }, async (tx) => {
      const [gift] = await tx.select().from(giftsTable).where(eq(giftsTable.id, giftId)).limit(1).for("update");
      if (!gift?.gifterEmail || (gift.status !== "purchased" && gift.status !== "redeemed")) throw new Error("This gift has no deliverable gifter email.");
      const [delivery] = await tx.insert(emailDeliveriesTable).values({ dedupeKey: `gift-resend:${gift.id}:${requestId}`, eventType: "gift_delivery", recipientEmail: gift.gifterEmail, giftId: gift.id, payload: { giftCode: gift.code } })
        .onConflictDoNothing({ target: emailDeliveriesTable.dedupeKey }).returning();
      if (delivery) return { id: delivery.id, status: "queued" as const };
      const [existing] = await tx.select({ id: emailDeliveriesTable.id }).from(emailDeliveriesTable).where(eq(emailDeliveriesTable.dedupeKey, `gift-resend:${gift.id}:${requestId}`)).limit(1);
      return { id: existing!.id, status: "queued" as const };
    });
    return res.json(ResendAdminGiftResponse.parse(result));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/admin/billing/:billingRecordId/refund", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { billingRecordId } = RefundBillingRecordParams.parse(req.params);
    const { reason } = RefundBillingRecordBody.parse(req.body);
    const result = await runSensitiveAdminAction({
      actor: req.account!, action: "refund", targetType: "billing_record", targetId: billingRecordId, reason,
    }, async (tx) => {
      const [locked] = await tx.select().from(billingRecordsTable).where(eq(billingRecordsTable.id, billingRecordId)).limit(1).for("update");
      if (!locked || locked.status === "refunded" || locked.status === "disputed" || locked.stripeRefundId) throw new Error("This billing record cannot be refunded.");
      if (!locked.vaultId || !locked.stripePaymentIntentId || locked.source !== "stripe") throw new Error("This billing record cannot be refunded.");
      const stripeRefund = await getStripeClient().refunds.create({ payment_intent: locked.stripePaymentIntentId }, { idempotencyKey: `vault-zombie-refund:${locked.id}` });
      if (!stripeRefund.id || stripeRefund.status !== "succeeded") throw new Error("Stripe refund was not confirmed.");
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, locked.vaultId!)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      const rows = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
        .where(and(eq(submissionsTable.vaultId, vault.id), isNull(submissionsTable.culledAt))).orderBy(asc(submissionsTable.submittedAt));
      const keep = rows.slice(0, PLAN_POLICY.lockbox.guestCap).map((row) => row.id);
      const archive = rows.slice(PLAN_POLICY.lockbox.guestCap).map((row) => row.id);
      if (keep.length) await tx.update(submissionsTable).set({ archivedAt: null, heldAt: null }).where(inArray(submissionsTable.id, keep));
      if (archive.length) await tx.update(submissionsTable).set({ archivedAt: new Date(), heldAt: null }).where(inArray(submissionsTable.id, archive));
      await tx.update(vaultsTable).set({ entitledPlanTier: "lockbox" }).where(eq(vaultsTable.id, vault.id));
      await tx.update(billingRecordsTable).set({ status: "refunded", stripeRefundId: stripeRefund.id }).where(eq(billingRecordsTable.id, locked.id));
      return { billingRecordId: locked.id, vaultId: vault.id, status: "refunded" as const, currentTier: "lockbox" as const };
    });
    return res.json(RefundBillingRecordResponse.parse(result));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/admin/gifts/:giftId/refund", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { giftId } = RefundGiftParams.parse(req.params);
    const { reason } = RefundGiftBody.parse(req.body);
    const result = await runSensitiveAdminAction({
      actor: req.account!, action: "refund", targetType: "gift", targetId: giftId, reason,
    }, async (tx) => {
      const [locked] = await tx.select().from(giftsTable).where(eq(giftsTable.id, giftId)).limit(1).for("update");
      if (!locked || locked.status !== "purchased" || locked.redeemedAt || locked.refundedAt || locked.stripeRefundId) throw new Error("This gift can no longer be refunded.");
      if (Date.now() - locked.createdAt.valueOf() > 90 * 24 * 60 * 60 * 1000) throw new Error("Gift refund window has closed.");
      if (!locked.stripePaymentIntentId) throw new Error("This gift cannot be refunded.");
      const stripeRefund = await getStripeClient().refunds.create({ payment_intent: locked.stripePaymentIntentId }, { idempotencyKey: `vault-zombie-gift-refund:${locked.id}` });
      if (!stripeRefund.id || stripeRefund.status !== "succeeded") throw new Error("Stripe refund was not confirmed.");
      await tx.update(giftsTable).set({ status: "refunded", refundedAt: new Date(), stripeRefundId: stripeRefund.id }).where(eq(giftsTable.id, locked.id));
      return { giftId: locked.id, status: "refunded" as const, stripeRefundId: stripeRefund.id };
    });
    return res.json(RefundGiftResponse.parse(result));
  } catch (error) { return next(error); }
});

adminBillingRouter.post("/admin/vaults/:vaultId/comp-grant", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { vaultId } = GrantVaultCompParams.parse(req.params); const { targetTier, reason } = GrantVaultCompBody.parse(req.body);
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "comp_grant", targetType: "vault", targetId: vaultId, reason, details: { targetTier } }, async (tx) => {
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      if (TIER_ORDER[targetTier as PaidTier] <= TIER_ORDER[vault.entitledPlanTier]) throw new Error("Comp grants must raise entitlement.");
      const [billing] = await tx.insert(billingRecordsTable).values({ vaultId, operatorId: vault.operatorId, fromTier: vault.entitledPlanTier, targetTier, amountCents: 0, currency: "usd", status: "comped", source: "comp" }).returning();
      await tx.update(vaultsTable).set({ entitledPlanTier: targetTier }).where(eq(vaultsTable.id, vaultId));
      const all = await tx.select({ id: submissionsTable.id }).from(submissionsTable).where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.culledAt))).orderBy(asc(submissionsTable.submittedAt));
      const cap = PLAN_POLICY[targetTier].guestCap;
      const released = all.slice(0, cap).map((row) => row.id);
      const held = all.slice(cap).map((row) => row.id);
      if (released.length) await tx.update(submissionsTable).set({ heldAt: null, archivedAt: null }).where(inArray(submissionsTable.id, released));
      if (held.length) await tx.update(submissionsTable).set({ heldAt: new Date(), archivedAt: null }).where(inArray(submissionsTable.id, held));
      await tx.update(overageEventsTable).set({ outcome: "upgraded", resolvedAt: new Date() })
        .where(and(eq(overageEventsTable.vaultId, vaultId), isNull(overageEventsTable.resolvedAt)));
      return { billingRecordId: billing.id, vaultId, status: "comped" as const, currentTier: targetTier };
    });
    return res.json(GrantVaultCompResponse.parse(result));
  } catch (error) { return next(error); }
});

export default adminBillingRouter;