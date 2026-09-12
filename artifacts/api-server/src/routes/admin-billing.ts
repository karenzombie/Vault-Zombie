import { and, asc, count, countDistinct, desc, eq, gte, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetOperatorOverageStatusParams, GetOperatorOverageStatusResponse, GrantVaultCompBody, GrantVaultCompParams,
  RefundGiftBody, RefundGiftParams, RefundGiftResponse,
  GetAdminDashboardResponse, GetAdminEmailDeliveryParams, GetAdminEmailDeliveryResponse, GetAdminGiftParams, GetAdminGiftResponse,
  GetAdminOperatorParams, GetAdminOperatorQueryParams, GetAdminOperatorResponse, GetAdminRevenueReportQueryParams, GetAdminRevenueReportResponse,
  GetAdminVaultSupportDetailParams, GetAdminVaultSupportDetailResponse, ListAdminBillingResponse, ListAdminEmailDeliveriesQueryParams,
  ListAdminGiftsResponse, ListAdminOperatorsQueryParams, ListAdminOperatorsResponse, ListAdminOveragesResponse, RefundBillingRecordBody, RefundBillingRecordParams,
  RefundBillingRecordResponse, GrantVaultCompResponse,
} from "@workspace/api-zod";
import {
  accountsTable, answersTable, billingRecordsTable, db, declineGuestOverage, findUnresolvedRefundReservation, PLAN_POLICY, readUnlockedAnswers, refundAttemptsTable, runSensitiveAdminAction, UNRESOLVED_REFUND_STATUSES,
  giftsTable, guestsTable, overageEventsTable, revealSlotsTable, submissionsTable, vaultTypesTable, vaultsTable, emailDeliveriesTable,
} from "@workspace/db";
import { ListAdminEmailDeliveriesResponse, RetryAdminEmailDeliveryParams, RetryAdminEmailDeliveryBody, RetryAdminEmailDeliveryResponse, ResendAdminGiftParams, ResendAdminGiftBody, ResendAdminGiftResponse } from "@workspace/api-zod";
import { getStripeClient, TIER_ORDER, type PaidTier } from "../lib/stripe";
import { requireAdmin, requireOperator, sensitiveAdminGuards } from "../middlewares/auth";

const adminBillingRouter: IRouter = Router();
const emailFields = {
  id: emailDeliveriesTable.id, dedupeKey: emailDeliveriesTable.dedupeKey, eventType: emailDeliveriesTable.eventType,
  recipientEmail: emailDeliveriesTable.recipientEmail, status: emailDeliveriesTable.status, attempts: emailDeliveriesTable.attempts,
  providerId: emailDeliveriesTable.providerId, lastError: emailDeliveriesTable.lastError, createdAt: emailDeliveriesTable.createdAt,
  updatedAt: emailDeliveriesTable.updatedAt, sentAt: emailDeliveriesTable.sentAt,
};
const billingFields = {
  id: billingRecordsTable.id, vaultId: billingRecordsTable.vaultId, operatorId: billingRecordsTable.operatorId, targetTier: billingRecordsTable.targetTier,
  amountCents: billingRecordsTable.amountCents, currency: billingRecordsTable.currency, status: billingRecordsTable.status, source: billingRecordsTable.source,
  stripeRefundId: billingRecordsTable.stripeRefundId, createdAt: billingRecordsTable.createdAt,
};
function page(value: unknown, fallback: number, maximum: number) {
  const number = typeof value === "number" ? value : fallback;
  return Number.isInteger(number) ? Math.min(Math.max(number, 1), maximum) : fallback;
}
const mutableRefundAttempt = (id: string) => and(
  eq(refundAttemptsTable.id, id),
  isNull(refundAttemptsTable.completedAt),
  inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
);
type RefundAttempt = typeof refundAttemptsTable.$inferSelect;
interface BillingRefundReservation {
  attempt: RefundAttempt;
  paymentIntentId: string | null;
  vaultId: string;
  completed: boolean;
  created: boolean;
}
interface GiftRefundReservation {
  attempt: RefundAttempt;
  paymentIntentId: string | null;
  completed: boolean;
  created: boolean;
}
interface BillingRefundCompletion {
  billingRecordId: string;
  vaultId: string;
  status: "refunded";
  currentTier: "lockbox";
  requestId: string;
  refundAttemptStatus: "completed";
  completedNow: boolean;
}
interface GiftRefundCompletion {
  giftId: string;
  status: "refunded";
  stripeRefundId: string;
  requestId: string;
  refundAttemptStatus: "completed";
  completedNow: boolean;
}

adminBillingRouter.get("/admin/dashboard", requireOperator, requireAdmin, async (_req, res, next) => {
  try {
    const [accounts, vaults, guests, submissions, slots, answers, overages, allOverages, emails] = await Promise.all([
      db.select({ id: accountsTable.id }).from(accountsTable).where(eq(accountsTable.role, "operator")),
      db.select({ status: vaultsTable.status, tier: vaultsTable.entitledPlanTier, type: vaultTypesTable.name }).from(vaultsTable).innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id)),
      db.select({ id: guestsTable.id }).from(guestsTable), db.select({ id: submissionsTable.id }).from(submissionsTable),
      db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable), db.select({ revealDate: revealSlotsTable.revealDate, unlockOverrideAt: answersTable.unlockOverrideAt }).from(answersTable).innerJoin(revealSlotsTable, eq(answersTable.revealSlotId, revealSlotsTable.id)),
      db.select({ id: overageEventsTable.id }).from(overageEventsTable).where(isNull(overageEventsTable.resolvedAt)),
      db.select({ id: overageEventsTable.id }).from(overageEventsTable),
      db.select({ id: emailDeliveriesTable.id }).from(emailDeliveriesTable).where(eq(emailDeliveriesTable.status, "failed")),
    ]);
    const buckets = (values: string[]) => Object.entries(values.reduce<Record<string, number>>((all, value) => ({ ...all, [value]: (all[value] ?? 0) + 1 }), {})).map(([key, count]) => ({ key, count }));
    const now = new Date();
    return res.json(GetAdminDashboardResponse.parse({
      operatorCount: accounts.length, vaultCount: vaults.length, guestCount: guests.length, submissionCount: submissions.length,
      vaultsByState: buckets(vaults.map((row) => row.status)), vaultsByType: buckets(vaults.map((row) => row.type)), vaultsByTier: buckets(vaults.map((row) => row.tier)),
      revealProgress: { slotsTotal: slots.length, slotsLanded: slots.filter((row) => row.revealDate <= now.toISOString().slice(0, 10)).length, answersTotal: answers.length, answersUnlocked: answers.filter((row) => row.unlockOverrideAt ? row.unlockOverrideAt <= now : row.revealDate <= now.toISOString().slice(0, 10)).length },
      guestMetrics: { averageGuestsPerVault: vaults.length ? guests.length / vaults.length : 0, capExceededEventCount: allOverages.length },
      unresolvedOverageCount: overages.length, failedEmailCount: emails.length,
    }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/reports/revenue", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const query = GetAdminRevenueReportQueryParams.parse(req.query);
    const from = query.from; const to = query.to;
    if (to <= from || to.valueOf() - from.valueOf() > 366 * 24 * 60 * 60 * 1000) throw new Error("Period must be positive and no longer than 366 days.");
    const [records, gifts] = await Promise.all([db.select().from(billingRecordsTable), db.select().from(giftsTable)]);
    const selected = records.filter((row) => row.createdAt >= from && row.createdAt <= to && (!query.source || row.source === query.source) && (!query.tier || row.targetTier === query.tier) && (!query.status || row.status === query.status));
    const amount = (predicate: (row: typeof selected[number]) => boolean) => selected.filter(predicate).reduce((total, row) => total + row.amountCents, 0);
    const periodGifts = gifts.filter((row) => row.createdAt >= from && row.createdAt <= to);
    return res.json(GetAdminRevenueReportResponse.parse({ from, to, filters: { source: query.source ?? null, tier: query.tier ?? null, status: query.status ?? null },
      grossConfirmedAmountCents: amount((row) => row.status === "paid"), refundedAmountCents: amount((row) => row.status === "refunded"), disputedAmountCents: amount((row) => row.status === "disputed"), compAmountCents: amount((row) => row.status === "comped"),
      giftIssuedAmountCents: periodGifts.filter((row) => ["purchased", "redeemed"].includes(row.status)).reduce((total, row) => total + row.amountCents, 0), giftRedeemedAmountCents: periodGifts.filter((row) => row.status === "redeemed").reduce((total, row) => total + row.amountCents, 0),
      recordCount: selected.length, reconciliation: { feesAvailable: false, netAvailable: false, payoutsAvailable: false, message: "Stripe fees, net amounts, and payout reconciliation are not stored locally." },
    }));
  } catch (error) { return next(error); }
});

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
    const attempts = records.length
      ? await db.select().from(refundAttemptsTable).where(inArray(refundAttemptsTable.billingRecordId, records.map((record) => record.id))).orderBy(desc(refundAttemptsTable.createdAt))
      : [];
    return res.json(ListAdminBillingResponse.parse({ records: records.map((record) => {
      const attempt = attempts.find((candidate) => candidate.billingRecordId === record.id);
      return { ...record, refundRequestId: attempt?.id ?? null, refundAttemptStatus: attempt?.status ?? null };
    }) }));
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
    const attempts = gifts.length
      ? await db.select().from(refundAttemptsTable).where(inArray(refundAttemptsTable.giftId, gifts.map((gift) => gift.id))).orderBy(desc(refundAttemptsTable.createdAt))
      : [];
    const deliveries = gifts.length ? await db.select({ giftId: emailDeliveriesTable.giftId, status: emailDeliveriesTable.status, lastError: emailDeliveriesTable.lastError, createdAt: emailDeliveriesTable.createdAt })
      .from(emailDeliveriesTable).where(inArray(emailDeliveriesTable.giftId, gifts.map((gift) => gift.id))).orderBy(desc(emailDeliveriesTable.createdAt)) : [];
    return res.json(ListAdminGiftsResponse.parse({ gifts: gifts.map((gift) => {
      const attempt = attempts.find((candidate) => candidate.giftId === gift.id);
      return {
        ...gift, refundRequestId: attempt?.id ?? null, refundAttemptStatus: attempt?.status ?? null,
        latestDeliveryStatus: deliveries.find((delivery) => delivery.giftId === gift.id)?.status ?? null,
        latestDeliveryError: deliveries.find((delivery) => delivery.giftId === gift.id)?.lastError ?? null,
        refundableNow: !attempt && gift.status === "purchased" && !gift.redeemedAt && !gift.refundedAt &&
          !gift.stripeRefundId && Boolean(gift.stripePaymentIntentId) &&
          now - gift.createdAt.valueOf() <= 90 * 24 * 60 * 60 * 1000,
      };
    }) }));
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
    const query = ListAdminEmailDeliveriesQueryParams.parse(_req.query);
    const limit = page(query.limit, 100, 250); const offset = typeof query.offset === "number" && query.offset >= 0 ? query.offset : 0;
    const rows = await db.select().from(emailDeliveriesTable).orderBy(desc(emailDeliveriesTable.createdAt));
    const filtered = rows.filter((row) => (!query.status || row.status === query.status) && (!query.eventType || row.eventType === query.eventType) && (!query.q || `${row.recipientEmail} ${row.dedupeKey}`.toLowerCase().includes(query.q.toLowerCase())));
    return res.json(ListAdminEmailDeliveriesResponse.parse({ deliveries: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/email-deliveries/:emailDeliveryId", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const { emailDeliveryId } = GetAdminEmailDeliveryParams.parse(req.params);
    const [delivery] = await db.select(emailFields).from(emailDeliveriesTable).where(eq(emailDeliveriesTable.id, emailDeliveryId)).limit(1);
    if (!delivery) return res.status(404).json({ error: "Email delivery not found." });
    return res.json(GetAdminEmailDeliveryResponse.parse({ delivery }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/operators", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const query = ListAdminOperatorsQueryParams.parse(req.query); const limit = page(query.limit, 50, 100); const offset = typeof query.offset === "number" && query.offset >= 0 ? query.offset : 0;
    const accounts = await db.select().from(accountsTable).where(eq(accountsTable.role, "operator"));
    const vaults = await db.select({ operatorId: vaultsTable.operatorId }).from(vaultsTable);
    const q = query.q?.toLowerCase();
    const operators = accounts.filter((row) => !q || `${row.id} ${row.displayName} ${row.email}`.toLowerCase().includes(q)).map((row) => ({ id: row.id, displayName: row.displayName, email: row.email, status: row.status, createdAt: row.createdAt, vaultCount: vaults.filter((vault) => vault.operatorId === row.id).length }));
    return res.json(ListAdminOperatorsResponse.parse({ operators: operators.slice(offset, offset + limit), total: operators.length, limit, offset }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/operators/:accountId", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const { accountId } = GetAdminOperatorParams.parse(req.params); const query = GetAdminOperatorQueryParams.parse(req.query); const limit = page(query.limit, 50, 100); const offset = typeof query.offset === "number" && query.offset >= 0 ? query.offset : 0;
    const [operator] = await db.select().from(accountsTable).where(and(eq(accountsTable.id, accountId), eq(accountsTable.role, "operator"))).limit(1);
    if (!operator) return res.status(404).json({ error: "Operator not found." });
    const vaults = await db.select({ id: vaultsTable.id, name: vaultsTable.name, status: vaultsTable.status, planTier: vaultsTable.entitledPlanTier, createdAt: vaultsTable.createdAt, sealedAt: vaultsTable.sealedAt, operatorName: accountsTable.displayName, vaultTypeName: vaultTypesTable.name }).from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id)).innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id)).where(eq(vaultsTable.operatorId, accountId));
    const records = await db.select(billingFields).from(billingRecordsTable).where(eq(billingRecordsTable.operatorId, accountId)).orderBy(desc(billingRecordsTable.createdAt));
    const attempts = records.length ? await db.select().from(refundAttemptsTable).where(inArray(refundAttemptsTable.billingRecordId, records.map((record) => record.id))).orderBy(desc(refundAttemptsTable.createdAt)) : [];
    const billingRecords = records.map((record) => {
      const attempt = attempts.find((candidate) => candidate.billingRecordId === record.id);
      return { ...record, refundRequestId: attempt?.id ?? null, refundAttemptStatus: attempt?.status ?? null };
    });
    return res.json(GetAdminOperatorResponse.parse({ operator: { id: operator.id, displayName: operator.displayName, email: operator.email, status: operator.status, createdAt: operator.createdAt, vaultCount: vaults.length }, vaults, billingRecords: billingRecords.slice(offset, offset + limit), totalBillingRecords: records.length, limit, offset }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/gifts/:giftId", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const { giftId } = GetAdminGiftParams.parse(req.params); const [gift] = await db.select().from(giftsTable).where(eq(giftsTable.id, giftId)).limit(1);
    if (!gift) return res.status(404).json({ error: "Gift not found." });
    const deliveries = await db.select(emailFields).from(emailDeliveriesTable).where(eq(emailDeliveriesTable.giftId, gift.id)).orderBy(desc(emailDeliveriesTable.createdAt));
    const [attempt] = await db.select().from(refundAttemptsTable).where(eq(refundAttemptsTable.giftId, gift.id)).orderBy(desc(refundAttemptsTable.createdAt)).limit(1);
    const latest = deliveries[0];
    return res.json(GetAdminGiftResponse.parse({ gift: { ...gift, refundRequestId: attempt?.id ?? null, refundAttemptStatus: attempt?.status ?? null, refundableNow: !attempt && gift.status === "purchased" && !gift.redeemedAt && !gift.refundedAt && !gift.stripeRefundId && Boolean(gift.stripePaymentIntentId) && Date.now() - gift.createdAt.valueOf() <= 90 * 24 * 60 * 60 * 1000, latestDeliveryStatus: latest?.status ?? null, latestDeliveryError: latest?.lastError ?? null }, deliveries }));
  } catch (error) { return next(error); }
});

adminBillingRouter.get("/admin/vaults/:vaultId/support", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const { vaultId } = GetAdminVaultSupportDetailParams.parse(req.params);
    const [vault] = await db.select({
      id: vaultsTable.id, name: vaultsTable.name, status: vaultsTable.status, planTier: vaultsTable.entitledPlanTier, createdAt: vaultsTable.createdAt, sealedAt: vaultsTable.sealedAt,
      operatorName: accountsTable.displayName, vaultTypeName: vaultTypesTable.name,
    }).from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id)).innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id)).where(eq(vaultsTable.id, vaultId)).limit(1);
    if (!vault) return res.status(404).json({ error: "Vault not found." });
    const [submissionRows, slots, rawRecords, overageEvents, emailDeliveries] = await Promise.all([
      db.select({ id: submissionsTable.id, guestId: submissionsTable.guestId }).from(submissionsTable).where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt))),
      db.select({ id: revealSlotsTable.id, kind: revealSlotsTable.kind, label: revealSlotsTable.label, revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vaultId)),
      db.select(billingFields).from(billingRecordsTable).where(eq(billingRecordsTable.vaultId, vaultId)).orderBy(desc(billingRecordsTable.createdAt)),
      db.select().from(overageEventsTable).where(eq(overageEventsTable.vaultId, vaultId)).orderBy(desc(overageEventsTable.createdAt)).limit(100),
      db.select(emailFields).from(emailDeliveriesTable).where(eq(emailDeliveriesTable.vaultId, vaultId)).orderBy(desc(emailDeliveriesTable.createdAt)).limit(100),
    ]);
    const refundAttempts = rawRecords.length ? await db.select().from(refundAttemptsTable).where(inArray(refundAttemptsTable.billingRecordId, rawRecords.map((record) => record.id))).orderBy(desc(refundAttemptsTable.createdAt)) : [];
    const records = rawRecords.map((record) => {
      const attempt = refundAttempts.find((candidate) => candidate.billingRecordId === record.id);
      return { ...record, refundRequestId: attempt?.id ?? null, refundAttemptStatus: attempt?.status ?? null };
    });
    const answerCount = submissionRows.length ? (await db.select({ id: answersTable.id }).from(answersTable).where(inArray(answersTable.submissionId, submissionRows.map((row) => row.id)))).length : 0;
    const milestones = slots.filter((slot) => slot.kind === "milestone");
    const scopeInputs = [
      { scope: "entire_vault" as const, revealSlotId: null, label: "Entire vault" },
      ...slots.filter((slot) => slot.kind !== "milestone").map((slot) => ({ scope: "reveal_slot" as const, revealSlotId: slot.id, label: slot.label })),
      ...(milestones.length === 1 ? [{ scope: "milestone" as const, revealSlotId: milestones[0].id, label: milestones[0].label }] : []),
    ];
    const previewRows = await Promise.all(scopeInputs.map(async (scope) => {
      const conditions = [eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)];
      if (scope.revealSlotId) conditions.push(eq(answersTable.revealSlotId, scope.revealSlotId));
      const [counts] = await db.select({ answerCount: count(answersTable.id), predictionCount: countDistinct(answersTable.submissionId), guestCount: countDistinct(submissionsTable.guestId), overrideAnswerCount: count(answersTable.unlockOverrideAt) }).from(answersTable).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(...conditions));
      return { ...scope, answerCount: Number(counts?.answerCount ?? 0), predictionCount: Number(counts?.predictionCount ?? 0), guestCount: Number(counts?.guestCount ?? 0), overrideAnswerCount: Number(counts?.overrideAnswerCount ?? 0), resealAvailable: Number(counts?.overrideAnswerCount ?? 0) > 0 };
    }));
    const unlockedAnswerCount = (await readUnlockedAnswers({ vaultId })).length;
    return res.json(GetAdminVaultSupportDetailResponse.parse({ vault: { vault, totals: { guestCount: new Set(submissionRows.map((row) => row.guestId)).size, predictionCount: submissionRows.length, answerCount }, unlockedAnswerCount, revealSlots: slots, scopePreviews: previewRows }, billingRecords: records, overageEvents, emailDeliveries }));
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
    const { reason, requestId } = RefundBillingRecordBody.parse(req.body);
    const reservation = await runSensitiveAdminAction<BillingRefundReservation>({ actor: req.account!, action: "refund", targetType: "billing_record", targetId: billingRecordId, reason, details: { phase: "intent", requestId }, shouldAudit: (result) => result.created }, async (tx) => {
      const [located] = await tx.select({ vaultId: billingRecordsTable.vaultId }).from(billingRecordsTable).where(eq(billingRecordsTable.id, billingRecordId)).limit(1);
      if (!located?.vaultId) throw new Error("This billing record cannot be refunded.");
      // Global ordering for entitlement/refund serialization:
      // vault -> billing record -> refund attempt.
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, located.vaultId)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      const [target] = await tx.select().from(billingRecordsTable).where(eq(billingRecordsTable.id, billingRecordId)).limit(1).for("update");
      if (!target) throw new Error("This billing record cannot be refunded.");
      const [existing] = await tx.select().from(refundAttemptsTable).where(and(
        eq(refundAttemptsTable.billingRecordId, billingRecordId),
        inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
      )).limit(1).for("update");
      if (existing) {
        return { attempt: existing, paymentIntentId: target.stripePaymentIntentId, vaultId: vault.id, completed: false, created: false };
      }
      const [requestCollision] = await tx.select().from(refundAttemptsTable).where(eq(refundAttemptsTable.id, requestId)).limit(1).for("update");
      if (requestCollision?.billingRecordId === billingRecordId && requestCollision.status === "completed") {
        return { attempt: requestCollision, paymentIntentId: target.stripePaymentIntentId, vaultId: vault.id, completed: true, created: false };
      }
      if (requestCollision) throw new Error("Refund action ID belongs to a different or terminal request.");
      if (
        target.status !== "paid" ||
        target.source !== "stripe" ||
        target.amountCents <= 0 ||
        !target.vaultId ||
        !target.stripePaymentIntentId ||
        target.stripeRefundId ||
        Date.now() - target.createdAt.valueOf() > 90 * 24 * 60 * 60 * 1000
      ) throw new Error("This billing record is not eligible for refund.");
      if (vault.entitledPlanTier !== target.targetTier) {
        throw new Error("A later entitlement change prevents refunding this billing record.");
      }
      const [attempt] = await tx.insert(refundAttemptsTable).values({
        id: requestId, targetType: "billing_record", billingRecordId,
        actorAccountId: req.account!.id, reason,
        idempotencyKey: `vault-zombie-refund:${requestId}`, status: "reserved",
      }).returning();
      return { attempt, paymentIntentId: target.stripePaymentIntentId, vaultId: vault.id, completed: false, created: true };
    });
    const { attempt } = reservation;
    if (reservation.completed) return res.json(RefundBillingRecordResponse.parse({
      billingRecordId, vaultId: (await db.select({ vaultId: billingRecordsTable.vaultId }).from(billingRecordsTable).where(eq(billingRecordsTable.id, billingRecordId)).limit(1))[0]?.vaultId,
      status: "refunded", currentTier: "lockbox", requestId: attempt.id, refundAttemptStatus: attempt.status,
    }));
    let stripeRefund;
    try {
      stripeRefund = attempt.stripeRefundId
        ? await getStripeClient().refunds.retrieve(attempt.stripeRefundId)
        : await getStripeClient().refunds.create({ payment_intent: reservation.paymentIntentId! }, { idempotencyKey: attempt.idempotencyKey });
    } catch (error) {
      await db.update(refundAttemptsTable).set({ status: attempt.stripeRefundId ? attempt.status : "unknown", stripeStatus: attempt.stripeRefundId ? attempt.stripeStatus : "unknown", attemptedAt: new Date(), lastError: error instanceof Error ? error.message.slice(0, 1000) : "Stripe refund outcome is unknown." })
        .where(mutableRefundAttempt(attempt.id));
      const retryable = new Error("Stripe refund outcome is unknown; retry this refund to reconcile it.");
      (retryable as Error & { status?: number }).status = 503;
      throw retryable;
    }
    if (!stripeRefund.id) throw new Error("Stripe refund was not confirmed.");
    if (attempt.status === "stripe_succeeded" && stripeRefund.status !== "succeeded") {
      throw new Error("Persisted Stripe success cannot be downgraded during reconciliation.");
    }
    if (stripeRefund.status === "failed" || stripeRefund.status === "canceled") {
      await db.update(refundAttemptsTable).set({ status: stripeRefund.status, stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: `Stripe refund ${stripeRefund.status}.` })
        .where(mutableRefundAttempt(attempt.id));
      throw new Error(`Stripe refund ${stripeRefund.status}; it cannot be finalized.`);
    }
    if (stripeRefund.status !== "succeeded" && stripeRefund.status !== "pending") throw new Error(`Unsupported Stripe refund status: ${stripeRefund.status}.`);
    try {
      await db.update(refundAttemptsTable).set({ status: stripeRefund.status === "pending" ? "stripe_pending" : "stripe_succeeded", stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: null })
        .where(mutableRefundAttempt(attempt.id));
    } catch (error) {
      await db.update(refundAttemptsTable).set({ status: "stripe_succeeded", stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: error instanceof Error ? error.message.slice(0, 1000) : "Local refund completion is pending." })
        .where(mutableRefundAttempt(attempt.id));
      throw new Error("Stripe refund succeeded but local completion is pending; retry this refund.");
    }
    if (stripeRefund.status === "pending") throw new Error("Stripe refund is pending; retry later to reconcile it.");
    const result = await runSensitiveAdminAction<BillingRefundCompletion>({ actor: req.account!, action: "refund", targetType: "billing_record", targetId: billingRecordId, reason: attempt.reason, details: { phase: "completion", requestId: attempt.id, stripeRefundId: stripeRefund.id, status: stripeRefund.status }, shouldAudit: (result) => result.completedNow }, async (tx) => {
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, reservation.vaultId)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      const [locked] = await tx.select().from(billingRecordsTable).where(eq(billingRecordsTable.id, billingRecordId)).limit(1).for("update");
      if (!locked) throw new Error("This billing record cannot be refunded.");
      const [lockedAttempt] = await tx.select().from(refundAttemptsTable).where(eq(refundAttemptsTable.id, attempt.id)).limit(1).for("update");
      if (!lockedAttempt) throw new Error("Refund reservation was not found.");
      if (lockedAttempt.completedAt || lockedAttempt.status === "completed") {
        if (!locked.vaultId || locked.stripeRefundId !== lockedAttempt.stripeRefundId) throw new Error("Completed refund state is inconsistent.");
        return { billingRecordId: locked.id, vaultId: locked.vaultId, status: "refunded" as const, currentTier: "lockbox" as const, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: false };
      }
      if (locked.status === "refunded" || locked.stripeRefundId) {
        if (locked.status !== "refunded" || locked.stripeRefundId !== stripeRefund.id || !locked.vaultId) throw new Error("This billing record cannot be reconciled to this refund.");
        const [completed] = await tx.update(refundAttemptsTable).set({ status: "completed", completedAt: new Date(), stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, lastError: null }).where(mutableRefundAttempt(attempt.id)).returning();
        if (!completed) throw new Error("Refund completion raced with another reconciliation.");
        return { billingRecordId: locked.id, vaultId: locked.vaultId, status: "refunded" as const, currentTier: "lockbox" as const, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: true };
      }
      if (!locked.vaultId) throw new Error("Refunded billing target no longer has its vault.");
      const rows = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
        .where(and(eq(submissionsTable.vaultId, vault.id), isNull(submissionsTable.culledAt))).orderBy(asc(submissionsTable.submittedAt));
      const keep = rows.slice(0, PLAN_POLICY.lockbox.guestCap).map((row) => row.id);
      const archive = rows.slice(PLAN_POLICY.lockbox.guestCap).map((row) => row.id);
      if (keep.length) await tx.update(submissionsTable).set({ archivedAt: null, heldAt: null }).where(inArray(submissionsTable.id, keep));
      if (archive.length) await tx.update(submissionsTable).set({ archivedAt: new Date(), heldAt: null }).where(inArray(submissionsTable.id, archive));
      await tx.update(vaultsTable).set({ entitledPlanTier: "lockbox" }).where(eq(vaultsTable.id, vault.id));
      await tx.update(billingRecordsTable).set({ status: "refunded", stripeRefundId: stripeRefund.id }).where(eq(billingRecordsTable.id, locked.id));
      const [completed] = await tx.update(refundAttemptsTable).set({ status: "completed", completedAt: new Date(), stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, lastError: null }).where(mutableRefundAttempt(lockedAttempt.id)).returning();
      if (!completed) throw new Error("Refund completion raced with another reconciliation.");
      return { billingRecordId: locked.id, vaultId: vault.id, status: "refunded" as const, currentTier: "lockbox" as const, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: true };
    });
    return res.json(RefundBillingRecordResponse.parse(result));
  } catch (error) {
    if (error instanceof Error && (error.message.includes("outcome is unknown") || error.message.includes("local completion is pending"))) return res.status(503).json({ error: error.message, code: "REFUND_RECONCILIATION_REQUIRED", retryable: true });
    if (error instanceof Error && error.message.includes("refund is pending")) return res.status(503).json({ error: error.message, code: "REFUND_PENDING", retryable: true });
    return next(error);
  }
});

adminBillingRouter.post("/admin/gifts/:giftId/refund", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { giftId } = RefundGiftParams.parse(req.params);
    const { reason, requestId } = RefundGiftBody.parse(req.body);
    const reservation = await runSensitiveAdminAction<GiftRefundReservation>({ actor: req.account!, action: "refund", targetType: "gift", targetId: giftId, reason, details: { phase: "intent", requestId }, shouldAudit: (result) => result.created }, async (tx) => {
      const [target] = await tx.select().from(giftsTable).where(eq(giftsTable.id, giftId)).limit(1).for("update");
      if (!target) throw new Error("This gift cannot be refunded.");
      const [existing] = await tx.select().from(refundAttemptsTable).where(and(
        eq(refundAttemptsTable.giftId, giftId),
        inArray(refundAttemptsTable.status, [...UNRESOLVED_REFUND_STATUSES]),
      )).limit(1).for("update");
      if (existing) {
        return { attempt: existing, paymentIntentId: target.stripePaymentIntentId, completed: false, created: false };
      }
      const [requestCollision] = await tx.select().from(refundAttemptsTable).where(eq(refundAttemptsTable.id, requestId)).limit(1).for("update");
      if (requestCollision?.giftId === giftId && requestCollision.status === "completed") {
        return { attempt: requestCollision, paymentIntentId: target.stripePaymentIntentId, completed: true, created: false };
      }
      if (requestCollision) throw new Error("Refund action ID belongs to a different or terminal request.");
      if (
        target.status !== "purchased" || target.amountCents <= 0 ||
        target.redeemedAt || target.redeemedVaultId || target.redeemedBillingRecordId ||
        target.refundedAt || target.stripeRefundId || !target.stripePaymentIntentId ||
        Date.now() - target.createdAt.valueOf() > 90 * 24 * 60 * 60 * 1000
      ) throw new Error("This gift is not eligible for refund.");
      const [attempt] = await tx.insert(refundAttemptsTable).values({
        id: requestId, targetType: "gift", giftId, actorAccountId: req.account!.id,
        reason, idempotencyKey: `vault-zombie-gift-refund:${requestId}`, status: "reserved",
      }).returning();
      return { attempt, paymentIntentId: target.stripePaymentIntentId, completed: false, created: true };
    });
    const { attempt } = reservation;
    if (reservation.completed) return res.json(RefundGiftResponse.parse({ giftId, status: "refunded", stripeRefundId: attempt.stripeRefundId!, requestId: attempt.id, refundAttemptStatus: attempt.status }));
    let stripeRefund;
    try {
      stripeRefund = attempt.stripeRefundId
        ? await getStripeClient().refunds.retrieve(attempt.stripeRefundId)
        : await getStripeClient().refunds.create({ payment_intent: reservation.paymentIntentId! }, { idempotencyKey: attempt.idempotencyKey });
    } catch (error) {
      await db.update(refundAttemptsTable).set({ status: attempt.stripeRefundId ? attempt.status : "unknown", stripeStatus: attempt.stripeRefundId ? attempt.stripeStatus : "unknown", attemptedAt: new Date(), lastError: error instanceof Error ? error.message.slice(0, 1000) : "Stripe refund outcome is unknown." })
        .where(mutableRefundAttempt(attempt.id));
      const retryable = new Error("Stripe refund outcome is unknown; retry this refund to reconcile it.");
      (retryable as Error & { status?: number }).status = 503;
      throw retryable;
    }
    if (!stripeRefund.id) throw new Error("Stripe refund was not confirmed.");
    if (attempt.status === "stripe_succeeded" && stripeRefund.status !== "succeeded") {
      throw new Error("Persisted Stripe success cannot be downgraded during reconciliation.");
    }
    if (stripeRefund.status === "failed" || stripeRefund.status === "canceled") {
      await db.update(refundAttemptsTable).set({ status: stripeRefund.status, stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: `Stripe refund ${stripeRefund.status}.` })
        .where(mutableRefundAttempt(attempt.id));
      throw new Error(`Stripe refund ${stripeRefund.status}; it cannot be finalized.`);
    }
    if (stripeRefund.status !== "succeeded" && stripeRefund.status !== "pending") throw new Error(`Unsupported Stripe refund status: ${stripeRefund.status}.`);
    try {
      await db.update(refundAttemptsTable).set({ status: stripeRefund.status === "pending" ? "stripe_pending" : "stripe_succeeded", stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: null })
        .where(mutableRefundAttempt(attempt.id));
    } catch (error) {
      await db.update(refundAttemptsTable).set({ status: "stripe_succeeded", stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, attemptedAt: new Date(), lastError: error instanceof Error ? error.message.slice(0, 1000) : "Local refund completion is pending." })
        .where(mutableRefundAttempt(attempt.id));
      throw new Error("Stripe refund succeeded but local completion is pending; retry this refund.");
    }
    if (stripeRefund.status === "pending") throw new Error("Stripe refund is pending; retry later to reconcile it.");
    const result = await runSensitiveAdminAction<GiftRefundCompletion>({ actor: req.account!, action: "refund", targetType: "gift", targetId: giftId, reason: attempt.reason, details: { phase: "completion", requestId: attempt.id, stripeRefundId: stripeRefund.id, status: stripeRefund.status }, shouldAudit: (result) => result.completedNow }, async (tx) => {
      const [locked] = await tx.select().from(giftsTable).where(eq(giftsTable.id, giftId)).limit(1).for("update");
      if (!locked) throw new Error("This gift can no longer be refunded.");
      const [lockedAttempt] = await tx.select().from(refundAttemptsTable).where(eq(refundAttemptsTable.id, attempt.id)).limit(1).for("update");
      if (!lockedAttempt) throw new Error("Refund reservation was not found.");
      if (lockedAttempt.completedAt || lockedAttempt.status === "completed") {
        if (locked.stripeRefundId !== lockedAttempt.stripeRefundId) throw new Error("Completed refund state is inconsistent.");
        return { giftId: locked.id, status: "refunded" as const, stripeRefundId: lockedAttempt.stripeRefundId!, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: false };
      }
      if (locked.status === "refunded" || locked.refundedAt || locked.stripeRefundId) {
        if (locked.status !== "refunded" || locked.stripeRefundId !== stripeRefund.id) throw new Error("This gift cannot be reconciled to this refund.");
        const [completed] = await tx.update(refundAttemptsTable).set({ status: "completed", completedAt: new Date(), stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, lastError: null }).where(mutableRefundAttempt(attempt.id)).returning();
        if (!completed) throw new Error("Refund completion raced with another reconciliation.");
        return { giftId: locked.id, status: "refunded" as const, stripeRefundId: stripeRefund.id, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: true };
      }
      if (locked.status !== "purchased" || locked.redeemedAt || locked.redeemedVaultId || locked.redeemedBillingRecordId) {
        throw new Error("Gift redemption conflicted with the reserved succeeded refund.");
      }
      await tx.update(giftsTable).set({ status: "refunded", refundedAt: new Date(), stripeRefundId: stripeRefund.id }).where(eq(giftsTable.id, locked.id));
      const [completed] = await tx.update(refundAttemptsTable).set({ status: "completed", completedAt: new Date(), stripeRefundId: stripeRefund.id, stripeStatus: stripeRefund.status, lastError: null }).where(mutableRefundAttempt(lockedAttempt.id)).returning();
      if (!completed) throw new Error("Refund completion raced with another reconciliation.");
      return { giftId: locked.id, status: "refunded" as const, stripeRefundId: stripeRefund.id, requestId: lockedAttempt.id, refundAttemptStatus: "completed" as const, completedNow: true };
    });
    return res.json(RefundGiftResponse.parse(result));
  } catch (error) {
    if (error instanceof Error && (error.message.includes("outcome is unknown") || error.message.includes("local completion is pending"))) return res.status(503).json({ error: error.message, code: "REFUND_RECONCILIATION_REQUIRED", retryable: true });
    if (error instanceof Error && error.message.includes("refund is pending")) return res.status(503).json({ error: error.message, code: "REFUND_PENDING", retryable: true });
    return next(error);
  }
});

adminBillingRouter.post("/admin/vaults/:vaultId/comp-grant", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { vaultId } = GrantVaultCompParams.parse(req.params); const { targetTier, reason } = GrantVaultCompBody.parse(req.body);
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "comp_grant", targetType: "vault", targetId: vaultId, reason, details: { targetTier } }, async (tx) => {
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      const refundReservation = await findUnresolvedRefundReservation(tx, { vaultId });
      if (refundReservation) throw new Error("A billing refund is in progress for this vault.");
      if (TIER_ORDER[targetTier as PaidTier] <= TIER_ORDER[vault.entitledPlanTier]) throw new Error("Comp grants must raise entitlement.");
      const [billing] = await tx.insert(billingRecordsTable).values({ vaultId, operatorId: vault.operatorId, fromTier: vault.entitledPlanTier, targetTier, amountCents: 0, currency: "usd", status: "comped", source: "comp", appliedAt: new Date() }).returning();
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