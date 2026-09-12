import { and, eq, ne } from "drizzle-orm";
import { db } from "./index";
import { revealSlotsTable, vaultsTable } from "./schema/vaults";
import { vaultTypesTable } from "./schema/content";

export type OperatorVaultCardStatus = "draft" | "sealed" | "partially_unlocked" | "fully_unlocked" | "completed";

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
    const slots = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id));
    const today = new Date().toISOString().slice(0, 10);
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

  const withLabels = await Promise.all(rows.map(async (row) => ({ ...row, cardStatus: await operatorVaultCardStatus(row) })));

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
