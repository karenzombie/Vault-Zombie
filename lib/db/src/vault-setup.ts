import { and, asc, eq } from "drizzle-orm";
import { db } from "./index";
import { buildRevealSlots, isPlanTierWithinEntitlement, PLAN_POLICY, type PlanTier, type RevealSchedule } from "./schedule";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";

export async function updateDraftVaultSetup(input: {
  vaultId: string;
  operatorId: string;
  planTier: PlanTier;
  revealSchedule: RevealSchedule;
  anchorDate?: string | null;
  milestoneDate?: string | null;
  milestoneLabel?: string | null;
}) {
  if (!PLAN_POLICY[input.planTier].schedules.includes(input.revealSchedule)) {
    throw new Error("That reveal schedule is not available on this plan.");
  }
  const [updated] = await db
    .update(vaultsTable)
    .set({
      planTier: input.planTier,
      revealSchedule: input.revealSchedule,
      anchorDate: input.anchorDate ?? null,
      milestoneDate: input.milestoneDate ?? null,
      milestoneLabel: input.milestoneLabel?.trim() || null,
    })
    .where(and(
      eq(vaultsTable.id, input.vaultId),
      eq(vaultsTable.operatorId, input.operatorId),
      eq(vaultsTable.status, "draft"),
    ))
    .returning();
  if (!updated) throw new Error("Only an unsealed vault can change setup.");
  return updated;
}

export async function previewVaultSchedule(input: {
  anchorDate?: string | null;
  proposedSealDate: string;
  planTier: PlanTier;
  schedule: RevealSchedule;
  milestoneDate?: string | null;
  milestoneLabel?: string | null;
}) {
  return buildRevealSlots({
    anchorDate: input.anchorDate ?? input.proposedSealDate,
    sealDate: input.proposedSealDate,
    planTier: input.planTier,
    schedule: input.schedule,
    milestoneDate: input.milestoneDate,
    milestoneLabel: input.milestoneLabel,
  });
}

export async function sealVault(input: {
  vaultId: string;
  operatorId: string;
  sealDate: string;
  sealedAt?: Date;
}) {
  return db.transaction(async (transaction) => {
    const [vault] = await transaction
      .select()
      .from(vaultsTable)
      .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)))
      .limit(1)
      .for("update");
    if (!vault || vault.status !== "draft") throw new Error("Vault is missing or already sealed.");
    if (!isPlanTierWithinEntitlement(vault.planTier, vault.entitledPlanTier)) {
      throw new Error("Complete payment before sealing a vault configured above its current entitlement.");
    }

    const enabledPrompts = await transaction
      .select({ id: vaultQuestionsTable.id })
      .from(vaultQuestionsTable)
      .where(and(eq(vaultQuestionsTable.vaultId, vault.id), eq(vaultQuestionsTable.enabled, true)))
      .limit(1);
    if (!enabledPrompts.length) throw new Error("Select at least one prompt before sealing.");

    const anchorDate = vault.anchorDate ?? input.sealDate;
    const slots = buildRevealSlots({
      anchorDate,
      sealDate: input.sealDate,
      planTier: vault.planTier,
      schedule: vault.revealSchedule,
      milestoneDate: vault.milestoneDate,
      milestoneLabel: vault.milestoneLabel,
    });
    await transaction.delete(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id));
    await transaction.insert(revealSlotsTable).values(slots.map((slot, index) => ({
      vaultId: vault.id,
      kind: slot.kind,
      label: slot.label,
      revealDate: slot.revealDate,
      displayOrder: index,
    })));
    const [sealed] = await transaction.update(vaultsTable).set({
      anchorDate,
      status: "sealed",
      sealedAt: input.sealedAt ?? new Date(),
    }).where(eq(vaultsTable.id, vault.id)).returning();
    return { vault: sealed, revealSlots: slots };
  });
}

export async function listGuestTimingChoices(vaultId: string) {
  return db.select().from(revealSlotsTable)
    .where(eq(revealSlotsTable.vaultId, vaultId))
    .orderBy(asc(revealSlotsTable.displayOrder));
}

export async function resolveAnswerUnlockAt(vaultId: string, revealSlotId: string) {
  const [slot] = await db.select({ revealDate: revealSlotsTable.revealDate })
    .from(revealSlotsTable)
    .where(and(eq(revealSlotsTable.id, revealSlotId), eq(revealSlotsTable.vaultId, vaultId)))
    .limit(1);
  if (!slot) throw new Error("The selected reveal timing is not valid for this vault.");
  return new Date(`${slot.revealDate}T00:00:00.000Z`);
}