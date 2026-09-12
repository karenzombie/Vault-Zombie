import { and, count, countDistinct, eq, inArray, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { accountsTable, answersTable, billingRecordsTable, db, findUnresolvedRefundReservation, giftsTable, readUnlockedAnswers, runSensitiveAdminAction, submissionsTable, vaultsTable } from "@workspace/db";
import { requireAdmin, requireOperator, sensitiveAdminGuards } from "../middlewares/auth";

const router: IRouter = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const id = (value: unknown, label: string) => {
  if (typeof value !== "string" || !uuid.test(value)) throw new Error(`A valid ${label} is required.`);
  return value;
};

async function vaultPreview(executor: Pick<typeof db, "select">, vaultId: string) {
  const [vault] = await executor.select({ id: vaultsTable.id, name: vaultsTable.name, operatorId: vaultsTable.operatorId, tier: vaultsTable.entitledPlanTier }).from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) throw new Error("Vault not found.");
  const [counts] = await executor.select({ submissions: countDistinct(submissionsTable.id), answers: count(answersTable.id) }).from(submissionsTable).leftJoin(answersTable, eq(answersTable.submissionId, submissionsTable.id)).where(eq(submissionsTable.vaultId, vaultId));
  const [billing] = await executor.select({ count: count(billingRecordsTable.id) }).from(billingRecordsTable).where(eq(billingRecordsTable.vaultId, vaultId));
  const refundReservation = await findUnresolvedRefundReservation(executor, { vaultId });
  return { vault, submissions: Number(counts?.submissions ?? 0), answers: Number(counts?.answers ?? 0), billingRecordsRetained: Number(billing?.count ?? 0), refundBlocked: Boolean(refundReservation), refundRequestId: refundReservation?.id ?? null, refundAttemptStatus: refundReservation?.status ?? null };
}

router.get("/admin/vaults/:vaultId/deletion-preview", requireOperator, requireAdmin, async (req, res, next) => {
  try { return res.json(await vaultPreview(db, id(req.params.vaultId, "vault ID"))); } catch (error) { return next(error); }
});

router.post("/admin/vaults/:vaultId/delete", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const vaultId = id(req.params.vaultId, "vault ID"); const { reason, confirmation } = req.body ?? {};
    if (typeof reason !== "string" || typeof confirmation !== "string") throw new Error("Reason and typed confirmation are required.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "vault_deletion", targetType: "vault", targetId: vaultId, reason }, async (tx) => {
      const [locked] = await tx.select({ status: vaultsTable.status }).from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1).for("update");
      if (!locked) throw new Error("Vault not found.");
      if (locked.status === "deleted") throw new Error("Vault is already deleted.");
      const preview = await vaultPreview(tx, vaultId);
      if (confirmation !== preview.vault.id && confirmation !== preview.vault.name) throw new Error("Type the exact vault name or ID to confirm deletion.");
      if (preview.refundBlocked) throw new Error(`Vault deletion conflicts with unresolved refund ${preview.refundRequestId}.`);
      // Soft delete only (Flow1 Addendum 1, A2): the vault, its predictions, and its
      // billing/gift references are retained, never erased. Hidden from the host, and
      // shown in the admin archive view; an admin can restore it later.
      await tx.update(vaultsTable).set({ status: "deleted" }).where(eq(vaultsTable.id, vaultId));
      return { vaultId, status: "deleted" as const, retainedSubmissions: preview.submissions, retainedAnswers: preview.answers, retainedBillingRecords: preview.billingRecordsRetained };
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("deletion conflicts with unresolved refund")) return res.status(409).json({ error: error.message, code: "REFUND_IN_PROGRESS" });
    return next(error);
  }
});

router.get("/admin/accounts/:accountId/deletion-preview", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const accountId = id(req.params.accountId, "account ID");
    const [account] = await db.select({ id: accountsTable.id, displayName: accountsTable.displayName, role: accountsTable.role, status: accountsTable.status }).from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1);
    if (!account) return res.status(404).json({ error: "Account not found." });
    const vaults = await db.select({ id: vaultsTable.id, name: vaultsTable.name, tier: vaultsTable.entitledPlanTier }).from(vaultsTable).where(eq(vaultsTable.operatorId, accountId));
    const exportVaults = (await Promise.all(vaults.filter((vault) => vault.tier !== "lockbox").map(async (vault) => ({ id: vault.id, name: vault.name, unlockedAnswerCount: (await readUnlockedAnswers({ vaultId: vault.id })).length })))).filter((vault) => vault.unlockedAnswerCount > 0);
    const [billing] = await db.select({ count: count(billingRecordsTable.id) }).from(billingRecordsTable).where(eq(billingRecordsTable.operatorId, accountId));
    const blockedRefunds = (await Promise.all(vaults.map(async (vault) => {
      const attempt = await findUnresolvedRefundReservation(db, { vaultId: vault.id });
      return attempt ? { vaultId: vault.id, requestId: attempt.id, status: attempt.status } : null;
    }))).filter((attempt) => attempt !== null);
    return res.json({ account, vaultCount: vaults.length, retainedBillingRecords: Number(billing?.count ?? 0), typedPhrase: `DELETE ${account.id}`, exportVaults, refundBlocked: blockedRefunds.length > 0, blockedRefunds });
  } catch (error) { return next(error); }
});

router.post("/admin/accounts/:accountId/delete", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const accountId = id(req.params.accountId, "account ID"); const { reason, confirmation } = req.body ?? {};
    if (typeof reason !== "string" || confirmation !== `DELETE ${accountId}`) throw new Error("Type the required DELETE account ID phrase and supply a reason.");
    if (accountId === req.account!.id) throw new Error("Administrators cannot delete their own account from this session.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "account_deletion", targetType: "account", targetId: accountId, reason }, async (tx) => {
      const [account] = await tx.select().from(accountsTable).where(eq(accountsTable.id, accountId)).limit(1).for("update");
      if (!account || account.status === "deleted") throw new Error("Account not found or already deleted.");
      const vaultRows = await tx.select({ id: vaultsTable.id }).from(vaultsTable).where(eq(vaultsTable.operatorId, accountId));
      for (const vault of vaultRows) {
        await tx.select({ id: vaultsTable.id }).from(vaultsTable).where(eq(vaultsTable.id, vault.id)).limit(1).for("update");
        const refundReservation = await findUnresolvedRefundReservation(tx, { vaultId: vault.id });
        if (refundReservation) throw new Error(`Account deletion conflicts with unresolved refund ${refundReservation.id}.`);
        await tx.update(billingRecordsTable).set({ vaultId: null }).where(eq(billingRecordsTable.vaultId, vault.id));
        await tx.update(giftsTable).set({ redeemedVaultId: null }).where(eq(giftsTable.redeemedVaultId, vault.id));
        await tx.delete(vaultsTable).where(eq(vaultsTable.id, vault.id));
      }
      // Retain this non-login identity so immutable audit and financial foreign
      // keys survive while all personal profile/auth linkage is anonymized.
      await tx.update(accountsTable).set({ clerkSubject: null, displayName: "Deleted account", email: `deleted-${account.id}@deleted.invalid`, status: "deleted", anonymizedAt: new Date() }).where(eq(accountsTable.id, accountId));
      return { accountId, deletedVaultCount: vaultRows.length };
    });
    return res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes("deletion conflicts with unresolved refund")) return res.status(409).json({ error: error.message, code: "REFUND_IN_PROGRESS" });
    return next(error);
  }
});

router.get("/admin/vaults/:vaultId/unlocked-export", requireOperator, requireAdmin, async (req, res, next) => {
  try {
    const vaultId = id(req.params.vaultId, "vault ID");
    const [vault] = await db.select({ name: vaultsTable.name, tier: vaultsTable.entitledPlanTier }).from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
    if (!vault) return res.status(404).json({ error: "Vault not found." });
    if (vault.tier === "lockbox") return res.status(403).json({ error: "Unlocked exports are available only for paid vaults." });
    const answers = await readUnlockedAnswers({ vaultId });
    res.attachment(`vault-${vaultId}-unlocked.csv`).type("text/csv").send(["guest,answer_type,text_value,number_value,option_id,unlock_at", ...answers.map((answer) => [answer.guestDisplayName, answer.answerType, answer.textValue ?? "", answer.numberValue ?? "", answer.optionId ?? "", answer.unlockAt.toISOString()].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))].join("\n"));
  } catch (error) { return next(error); }
});

export default router;