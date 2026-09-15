import { and, eq, ne } from "drizzle-orm";
import { db } from "./index";
import { isVaultFullyResolved } from "./reports";
import { revealSlotsTable, vaultsTable } from "./schema/vaults";
import { vaultTypesTable } from "./schema/content";
import { todayInTimeZone } from "./timezone";

export type OperatorVaultCardStatus = "draft" | "sealed" | "partially_unlocked" | "fully_unlocked" | "completed";

/**
 * Advances a sealed vault to active once its first reveal date has passed, and an
 * active vault to completed once every reveal is open and every scoreable prediction
 * has a recorded outcome (Flow1 Addendum 1, section A4: "these happen on their own,
 * with no host action"). Worked out from the vault's existing reveal slots and scoring
 * data (isVaultFullyResolved); no new columns. There is no background job for this:
 * it runs lazily wherever a host's vault list or vault detail is read (listOperatorVaults,
 * getVaultHealthReport), so the stored status is always caught up to date by the time a
 * host sees it, without them ever needing to click anything. Returns the vault's status
 * after any transition, for the caller to use immediately.
 */
export async function syncVaultLifecycleStatus(vault: { id: string; status: string; operatorId: string }): Promise<string> {
  if (vault.status !== "sealed" && vault.status !== "active") return vault.status;
  let status = vault.status;
  if (status === "sealed") {
    const [row] = await db.select({ timeZone: vaultsTable.timeZone }).from(vaultsTable).where(eq(vaultsTable.id, vault.id)).limit(1);
    const slots = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id));
    // "Today" for a sealed vault is always its own time zone (section 7.8).
    const today = todayInTimeZone(new Date(), row?.timeZone ?? null);
    if (slots.some((slot) => slot.revealDate <= today)) {
      await db.update(vaultsTable).set({ status: "active" }).where(and(eq(vaultsTable.id, vault.id), eq(vaultsTable.status, "sealed")));
      status = "active";
    }
  }
  if (status === "active") {
    if (await isVaultFullyResolved(vault.id, vault.operatorId)) {
      await db.update(vaultsTable).set({ status: "completed" }).where(and(eq(vaultsTable.id, vault.id), eq(vaultsTable.status, "active")));
      status = "completed";
    }
  }
  return status;
}

/**
 * Maps a stored vault status to the label a host sees on their dashboard, per
 * VaultZombie-Flow1-Addendum-1.md section A1. "active" splits into two display
 * labels worked out from whether every reveal slot's date has passed; neither is a
 * stored value. "completed" is trusted as stored, since stage 5 (not yet built) is
 * responsible for setting it only once every reveal is open and scored.
 */
export async function operatorVaultCardStatus(vault: { id: string; status: string }): Promise<OperatorVaultCardStatus> {
  if (vault.status === "draft") return "draft";
  if (vault.status === "sealed") return "sealed";
  if (vault.status === "completed") return "completed";
  if (vault.status === "active") {
    const [row] = await db.select({ timeZone: vaultsTable.timeZone }).from(vaultsTable).where(eq(vaultsTable.id, vault.id)).limit(1);
    const slots = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id));
    const today = todayInTimeZone(new Date(), row?.timeZone ?? null);
    const allOpen = slots.length > 0 && slots.every((slot) => slot.revealDate <= today);
    return allOpen ? "fully_unlocked" : "partially_unlocked";
  }
  throw new Error(`Vault ${vault.id} has an unexpected status for dashboard display: ${vault.status}`);
}

/**
 * The signed-in host's own vaults for the dashboard (Flow1 stage 1 section 1.4).
 * Deleted vaults are never included. Never returns prediction content.
 */
export async function listOperatorVaults(operatorId: string) {
  const rows = await db.select({
    id: vaultsTable.id,
    name: vaultsTable.name,
    status: vaultsTable.status,
    createdAt: vaultsTable.createdAt,
    vaultTypeName: vaultTypesTable.name,
    vaultTypeSlug: vaultTypesTable.slug,
  }).from(vaultsTable)
    .innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id))
    .where(and(eq(vaultsTable.operatorId, operatorId), ne(vaultsTable.status, "deleted")));

  const withSyncedStatus = await Promise.all(rows.map(async (row) => ({
    ...row, status: await syncVaultLifecycleStatus({ id: row.id, status: row.status, operatorId }),
  })));
  const withLabels = await Promise.all(withSyncedStatus.map(async (row) => ({ ...row, cardStatus: await operatorVaultCardStatus(row) })));

  const groupOrder: Record<OperatorVaultCardStatus, number> = {
    draft: 0,
    sealed: 1,
    partially_unlocked: 1,
    fully_unlocked: 1,
    completed: 2,
  };
  return withLabels.sort((a, b) => {
    const groupDiff = groupOrder[a.cardStatus] - groupOrder[b.cardStatus];
    if (groupDiff !== 0) return groupDiff;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

/**
 * Host-initiated soft delete (Flow1 Addendum 1, section A2). The vault and its
 * predictions are retained; only its status changes, hiding it from the host.
 */
export async function deleteOperatorVault(vaultId: string, operatorId: string) {
  const [updated] = await db.update(vaultsTable)
    .set({ status: "deleted" })
    .where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId), ne(vaultsTable.status, "deleted")))
    .returning({ id: vaultsTable.id, status: vaultsTable.status });
  if (!updated) throw new Error("Vault not found, not owned by this host, or already deleted.");
  return updated;
}

/**
 * The status a deleted vault should return to on admin restore. Stage 1 can only ever
 * reach `deleted` from `draft` or `sealed`, since nothing yet moves a vault to `active`
 * or `completed` (that wiring is Flow1 Addendum 1 section A4, stage 5). Derived from
 * `sealedAt` rather than stored separately, per A4's "do not add new columns."
 */
export function statusBeforeDeletion(vault: { sealedAt: Date | string | null }): "draft" | "sealed" {
  return vault.sealedAt ? "sealed" : "draft";
}

/**
 * Admin restoration of a soft-deleted vault (Flow1 Addendum 1, section A2). Accepts an
 * executor (a plain db handle, or a transaction) so the caller can keep this atomic
 * with its own audit-event write, matching this codebase's sensitive-admin-action pattern.
 */
export async function restoreDeletedVault(vaultId: string, executor: Pick<typeof db, "select" | "update"> = db) {
  const [vault] = await executor.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) throw new Error("Vault not found.");
  if (vault.status !== "deleted") throw new Error("Vault is not deleted.");
  const [restored] = await executor.update(vaultsTable)
    .set({ status: statusBeforeDeletion(vault) })
    .where(eq(vaultsTable.id, vaultId))
    .returning();
  return restored;
}
