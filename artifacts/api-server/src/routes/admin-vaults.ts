import { and, count, countDistinct, desc, eq, inArray, isNotNull, isNull, ne } from "drizzle-orm";
import { Router, type IRouter, type Request } from "express";
import {
  accountsTable,
  answersTable,
  auditEventsTable,
  db,
  guestsTable,
  revealSlotsTable,
  readUnlockedAnswers,
  restoreDeletedVault,
  runSensitiveAdminAction,
  setGuestEmailSubscription,
  submissionsTable,
  vaultTypesTable,
  vaultsTable,
} from "@workspace/db";
import { requireAdmin, requireOperator, sensitiveAdminGuards } from "../middlewares/auth";
import { sendManualUnlockEmails } from "../lib/mail";

async function referralCount(vaultRowId: string) {
  const [row] = await db.select({ count: count(accountsTable.id) }).from(accountsTable)
    .where(eq(accountsTable.referredByVaultId, vaultRowId));
  return Number(row?.count ?? 0);
}

const adminVaultsRouter: IRouter = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function vaultId(value: unknown) {
  if (typeof value !== "string" || !uuid.test(value)) throw new Error("A valid vault ID is required.");
  return value;
}

async function resolveScope(
  executor: Pick<typeof db, "select">,
  id: string,
  scope: "reveal_slot" | "milestone" | "entire_vault",
  revealSlotId?: string,
) {
  if (scope === "entire_vault") return null;
  const slotId = scope === "reveal_slot" ? revealSlotId : undefined;
  if (scope === "reveal_slot" && (!slotId || !uuid.test(slotId))) throw new Error("A reveal slot is required.");
  const rows = await executor.select({ id: revealSlotsTable.id, label: revealSlotsTable.label })
    .from(revealSlotsTable)
    .where(scope === "milestone"
      ? and(eq(revealSlotsTable.vaultId, id), eq(revealSlotsTable.kind, "milestone"))
      : and(eq(revealSlotsTable.vaultId, id), eq(revealSlotsTable.id, slotId!)))
    .limit(2);
  if (rows.length !== 1) throw new Error(scope === "milestone" ? "This vault has no unique Deep Vault milestone." : "Reveal slot not found.");
  return rows[0];
}

async function preview(executor: Pick<typeof db, "select">, id: string, revealSlotId: string | null) {
  const conditions = [eq(submissionsTable.vaultId, id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)];
  if (revealSlotId) conditions.push(eq(answersTable.revealSlotId, revealSlotId));
  const [row] = await executor.select({
    answerCount: count(answersTable.id),
    predictionCount: countDistinct(answersTable.submissionId),
    guestCount: countDistinct(submissionsTable.guestId),
  }).from(answersTable).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(...conditions));
  return { answerCount: Number(row?.answerCount ?? 0), predictionCount: Number(row?.predictionCount ?? 0), guestCount: Number(row?.guestCount ?? 0) };
}

async function scopePreviews(executor: Pick<typeof db, "select">, id: string, slots: Array<{ id: string; kind: string; label: string }>) {
  const scopes: Array<{ scope: "reveal_slot" | "milestone" | "entire_vault"; revealSlotId: string | null; label: string }> = [
    { scope: "entire_vault", revealSlotId: null, label: "Entire vault" },
  ];
  const milestones = slots.filter((slot) => slot.kind === "milestone");
  for (const slot of slots) {
    if (slot.kind !== "milestone") scopes.push({ scope: "reveal_slot", revealSlotId: slot.id, label: slot.label });
  }
  if (milestones.length === 1) scopes.push({ scope: "milestone", revealSlotId: milestones[0].id, label: milestones[0].label });
  return Promise.all(scopes.map(async (scope) => {
    const counts = await preview(executor, id, scope.revealSlotId);
    const conditions = [
      eq(submissionsTable.vaultId, id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt),
      isNull(submissionsTable.culledAt), isNotNull(answersTable.unlockOverrideAt),
    ];
    if (scope.revealSlotId) conditions.push(eq(answersTable.revealSlotId, scope.revealSlotId));
    const [overrides] = await executor.select({ count: count(answersTable.id) }).from(answersTable)
      .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(...conditions));
    return { ...scope, ...counts, overrideAnswerCount: Number(overrides?.count ?? 0), resealAvailable: Number(overrides?.count ?? 0) > 0 };
  }));
}

async function listVaultsByDeletionState(req: Request, excludeDeleted: boolean) {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100).toLowerCase() : "";
  const rows = await db.select({
    id: vaultsTable.id, name: vaultsTable.name, status: vaultsTable.status, planTier: vaultsTable.entitledPlanTier,
    createdAt: vaultsTable.createdAt, sealedAt: vaultsTable.sealedAt, operatorName: accountsTable.displayName,
    vaultTypeName: vaultTypesTable.name,
  }).from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
    .innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id))
    .where(excludeDeleted ? ne(vaultsTable.status, "deleted") : eq(vaultsTable.status, "deleted"));
  const filtered = rows.filter((row) => !query || [row.id, row.name, row.operatorName, row.vaultTypeName].some((value) => value.toLowerCase().includes(query)));
  return Promise.all(filtered.map(async (row) => ({ ...row, referralCount: await referralCount(row.id) })));
}

adminVaultsRouter.get("/admin/vaults", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    // Search only non-sensitive metadata. Deleted vaults live in the separate archive view.
    return res.json({ vaults: await listVaultsByDeletionState(req, true) });
  } catch (error) { return next(error); }
});

adminVaultsRouter.get("/admin/vaults/archive", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    return res.json({ vaults: await listVaultsByDeletionState(req, false) });
  } catch (error) { return next(error); }
});

adminVaultsRouter.post("/admin/vaults/:vaultId/restore", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId);
    const { reason } = req.body ?? {};
    if (typeof reason !== "string") throw new Error("A reason is required.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "vault_restoration", targetType: "vault", targetId: id, reason }, async (tx) => {
      return restoreDeletedVault(id, tx);
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && (error.message === "Vault not found." || error.message === "Vault is not deleted.")) {
      return res.status(error.message === "Vault not found." ? 404 : 400).json({ error: error.message });
    }
    return next(error);
  }
});

adminVaultsRouter.get("/admin/vaults/:vaultId", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId);
    const [vault] = await db.select({
      id: vaultsTable.id, name: vaultsTable.name, status: vaultsTable.status, planTier: vaultsTable.entitledPlanTier,
      createdAt: vaultsTable.createdAt, sealedAt: vaultsTable.sealedAt, operatorName: accountsTable.displayName, operatorId: accountsTable.id,
      vaultTypeName: vaultTypesTable.name,
    }).from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id))
      .innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id)).where(eq(vaultsTable.id, id)).limit(1);
    if (!vault) return res.status(404).json({ error: "Vault not found." });
    const [totals] = await db.select({ guestCount: countDistinct(submissionsTable.guestId), predictionCount: countDistinct(submissionsTable.id), answerCount: count(answersTable.id) })
      .from(submissionsTable).leftJoin(answersTable, eq(answersTable.submissionId, submissionsTable.id))
      .where(and(eq(submissionsTable.vaultId, id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
    const slots = await db.select({ id: revealSlotsTable.id, kind: revealSlotsTable.kind, label: revealSlotsTable.label, revealDate: revealSlotsTable.revealDate })
      .from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, id));
    const unlockedAnswerCount = (await readUnlockedAnswers({ vaultId: id })).length;
    return res.json({ vault, totals: { guestCount: Number(totals?.guestCount ?? 0), predictionCount: Number(totals?.predictionCount ?? 0), answerCount: Number(totals?.answerCount ?? 0) }, unlockedAnswerCount, revealSlots: slots, scopePreviews: await scopePreviews(db, id, slots), referralCount: await referralCount(id) });
  } catch (error) { return next(error); }
});

/** Per-guest email subscription status for a vault (spec 7.3). Never exposes a guest's answers. */
adminVaultsRouter.get("/admin/vaults/:vaultId/guests", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId);
    const rows = await db.select({ id: guestsTable.id, displayName: guestsTable.displayName, hasEmail: isNotNull(guestsTable.email), emailOptedOut: guestsTable.emailOptedOut })
      .from(guestsTable).where(eq(guestsTable.vaultId, id)).orderBy(guestsTable.createdAt);
    return res.json({ guests: rows.map((row) => ({ id: row.id, displayName: row.displayName, hasEmail: Boolean(row.hasEmail), emailOptedOut: row.emailOptedOut })) });
  } catch (error) { return next(error); }
});

adminVaultsRouter.post("/admin/vaults/:vaultId/guests/:guestId/email-subscription", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId);
    const guestIdParam = vaultId(req.params.guestId);
    const { subscribed } = req.body ?? {};
    if (typeof subscribed !== "boolean") throw new Error("A boolean subscribed value is required.");
    const [guest] = await db.select({ id: guestsTable.id, email: guestsTable.email }).from(guestsTable)
      .where(and(eq(guestsTable.id, guestIdParam), eq(guestsTable.vaultId, id))).limit(1);
    if (!guest) return res.status(404).json({ error: "Guest not found." });
    if (!guest.email) return res.status(400).json({ error: "This guest has no email on file." });
    await setGuestEmailSubscription(guest.id, subscribed);
    return res.json({ id: guest.id, emailOptedOut: !subscribed });
  } catch (error) { return next(error); }
});

adminVaultsRouter.post("/admin/vaults/:vaultId/unlock", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId);
    const { scope, revealSlotId, reason, confirmation, sendEmails = false } = req.body ?? {};
    if (!["reveal_slot", "milestone", "entire_vault"].includes(scope) || typeof reason !== "string" || typeof confirmation !== "string" || typeof sendEmails !== "boolean") throw new Error("Invalid unlock request.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "manual_unlock", targetType: "vault", targetId: id, reason, details: { scope, revealSlotId: revealSlotId ?? null, emailsSent: sendEmails } }, async (tx) => {
      const [vault] = await tx.select({ id: vaultsTable.id, name: vaultsTable.name, operatorEmail: accountsTable.email }).from(vaultsTable).innerJoin(accountsTable, eq(vaultsTable.operatorId, accountsTable.id)).where(eq(vaultsTable.id, id)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found.");
      if (confirmation !== vault.id && confirmation !== vault.name) throw new Error("Type the exact vault name or ID to confirm.");
      const slot = await resolveScope(tx, id, scope, revealSlotId);
      const counts = await preview(tx, id, slot?.id ?? null);
      const answerConditions = [eq(answersTable.submissionId, submissionsTable.id), eq(submissionsTable.vaultId, id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)];
      if (slot) answerConditions.push(eq(answersTable.revealSlotId, slot.id));
      const ids = await tx.select({ id: answersTable.id }).from(answersTable).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(...answerConditions));
      if (ids.length) await tx.update(answersTable).set({ unlockOverrideAt: new Date() }).where(inArray(answersTable.id, ids.map((row) => row.id)));
      // No guest unlock email exists (spec 9). The admin's checkbox governs whether the
      // recurring email-evaluator later sends the host reveal email (H5), the guest
      // results email (G2), and the unmarked-reveal nudge (H6) for this early reveal;
      // it never sends anything itself.
      const affectedSlotIds = slot ? [slot.id] : (await tx.select({ id: revealSlotsTable.id }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, id))).map((row) => row.id);
      if (affectedSlotIds.length) await tx.update(revealSlotsTable).set({ manualUnlockEmailsEnabled: sendEmails }).where(inArray(revealSlotsTable.id, affectedSlotIds));
      return { scope, revealSlotId: slot?.id ?? null, ...counts, emailsEnabled: sendEmails, affectedSlotIds };
    });
    // H5 (reveal ready) and, for any guest already eligible, G2 (results) — the unlock
    // transaction above has committed, so send immediately for each newly-opted-in slot
    // (build brief addendum 2, section 6.2).
    if (sendEmails) for (const slotId of result.affectedSlotIds) void sendManualUnlockEmails(slotId);
    const { affectedSlotIds: _unused, ...response } = result;
    res.json(response);
  } catch (error) { next(error); }
});

adminVaultsRouter.post("/admin/vaults/:vaultId/reseal", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const id = vaultId(req.params.vaultId); const { scope, revealSlotId, reason, confirmation } = req.body ?? {};
    if (!["reveal_slot", "milestone", "entire_vault"].includes(scope) || typeof reason !== "string" || typeof confirmation !== "string") throw new Error("Invalid reseal request.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "reseal", targetType: "vault", targetId: id, reason, details: { scope, revealSlotId: revealSlotId ?? null, emailsSent: false } }, async (tx) => {
      const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, id)).limit(1).for("update");
      if (!vault) throw new Error("Vault not found."); if (confirmation !== vault.id && confirmation !== vault.name) throw new Error("Type the exact vault name or ID to confirm.");
      const slot = await resolveScope(tx, id, scope, revealSlotId); const counts = await preview(tx, id, slot?.id ?? null);
      const ids = await tx.select({ id: answersTable.id }).from(answersTable).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(eq(submissionsTable.vaultId, id), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt), ...(slot ? [eq(answersTable.revealSlotId, slot.id)] : [])));
      if (ids.length) await tx.update(answersTable).set({ unlockOverrideAt: null }).where(inArray(answersTable.id, ids.map((row) => row.id)));
      return { scope, revealSlotId: slot?.id ?? null, ...counts };
    });
    res.json(result);
  } catch (error) { next(error); }
});

adminVaultsRouter.get("/admin/audit", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const events = await db.select({ id: auditEventsTable.id, action: auditEventsTable.action, targetType: auditEventsTable.targetType, targetId: auditEventsTable.targetId, reason: auditEventsTable.reason, details: auditEventsTable.details, occurredAt: auditEventsTable.occurredAt, adminName: accountsTable.displayName })
      .from(auditEventsTable).innerJoin(accountsTable, eq(auditEventsTable.actorAccountId, accountsTable.id)).orderBy(desc(auditEventsTable.occurredAt));
    const action = typeof req.query.action === "string" ? req.query.action : "";
    const admin = typeof req.query.admin === "string" ? req.query.admin.toLowerCase() : "";
    const target = typeof req.query.target === "string" ? req.query.target.toLowerCase() : "";
    const from = typeof req.query.from === "string" ? Date.parse(req.query.from) : NaN;
    const to = typeof req.query.to === "string" ? Date.parse(req.query.to) : NaN;
    const limitInput = typeof req.query.limit === "string" ? Number(req.query.limit) : 100;
    const limit = Number.isInteger(limitInput) ? Math.min(Math.max(limitInput, 1), 250) : 100;
    const offsetInput = typeof req.query.offset === "string" ? Number(req.query.offset) : 0;
    const offset = Number.isInteger(offsetInput) && offsetInput >= 0 ? offsetInput : 0;
    const filtered = events.filter((event) => (!action || event.action === action) && (!admin || event.adminName.toLowerCase().includes(admin)) && (!target || `${event.targetType}:${event.targetId}`.toLowerCase().includes(target)) && (Number.isNaN(from) || event.occurredAt.valueOf() >= from) && (Number.isNaN(to) || event.occurredAt.valueOf() <= to));
    res.json({ events: filtered.slice(offset, offset + limit), total: filtered.length, limit, offset });
  } catch (error) { next(error); }
});

export default adminVaultsRouter;