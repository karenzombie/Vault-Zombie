import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "./index";
import { enqueueEmail } from "./email";
import { buildRevealSlots, isPlanTierWithinEntitlement, PLAN_POLICY, type PlanTier, type RevealSchedule } from "./schedule";
import { accountsTable } from "./schema/accounts";
import { billingRecordsTable } from "./schema/billing";
import { vaultTypesTable } from "./schema/content";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";

const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

/**
 * Creates the initial draft row for a new vault. This is the single insertion point for
 * `vaultsTable`, so it is where the H2 "vault created" email (spec section 6) fires.
 *
 * planTier and name are required inputs with no default or fallback: they are product
 * decisions supplied by the vault-creation flow, and this function must never invent them.
 * revealSchedule is optional; it is chosen later during setup and is only required at
 * sealing time (see sealVault). See VaultZombie-Spec-Clarifications-2026-09-08.md.
 */
export async function createDraftVault(input: {
  operatorId: string;
  vaultTypeId: string;
  name: string;
  planTier: PlanTier;
  revealSchedule?: RevealSchedule | null;
  subjectValues?: Record<string, string>;
}, dbClient: Pick<typeof db, "select" | "insert"> = db) {
  if (!input.planTier) throw new Error("planTier is required and has no default.");
  if (!input.name || !input.name.trim()) throw new Error("name is required and has no default.");
  const [vaultType] = await dbClient.select({ name: vaultTypesTable.name }).from(vaultTypesTable).where(eq(vaultTypesTable.id, input.vaultTypeId)).limit(1);
  if (!vaultType) throw new Error("Unknown vault type.");
  const guestToken = randomBytes(24).toString("base64url");
  const referrerCode = randomBytes(6).toString("base64url");
  const [vault] = await dbClient.insert(vaultsTable).values({
    operatorId: input.operatorId,
    vaultTypeId: input.vaultTypeId,
    name: input.name.trim(),
    subjectValues: input.subjectValues ?? {},
    planTier: input.planTier,
    revealSchedule: input.revealSchedule ?? null,
    guestToken,
    guestTokenHash: tokenHash(guestToken),
    referrerCode,
  }).returning();
  const [operator] = await db.select({ email: accountsTable.email }).from(accountsTable).where(eq(accountsTable.id, input.operatorId)).limit(1);
  if (operator?.email) {
    // H2's copy and checklist are built from the vault's live setup state at render time
    // (see buildH2 in render.ts), so the payload only needs to identify the vault.
    await enqueueEmail({
      dedupeKey: `vault-created:${vault.id}`, eventType: "vault_created", recipientEmail: operator.email,
      vaultId: vault.id,
      payload: { vaultId: vault.id },
    });
  }
  return { vault, guestToken };
}

/**
 * Atomically spends an unspent billing entitlement (paid, vaultId still null, appliedAt
 * still null) to create the draft vault it was purchased/granted for. This is the only
 * way an entitlement's vaultId and appliedAt are ever set. createDraftVault stays the
 * single vaultsTable insertion point; it is called here with the transaction handle so
 * the entitlement lock and the vault insert commit together.
 */
export async function spendEntitlementForNewVault(input: {
  operatorId: string;
  billingRecordId: string;
  vaultTypeId: string;
  name: string;
  subjectValues?: Record<string, string>;
}) {
  return db.transaction(async (tx) => {
    const [billingRecord] = await tx
      .select()
      .from(billingRecordsTable)
      .where(and(
        eq(billingRecordsTable.id, input.billingRecordId),
        eq(billingRecordsTable.operatorId, input.operatorId),
        eq(billingRecordsTable.status, "paid"),
        isNull(billingRecordsTable.vaultId),
        isNull(billingRecordsTable.appliedAt),
      ))
      .limit(1)
      .for("update");
    if (!billingRecord) return { kind: "unavailable" as const };
    const { vault, guestToken } = await createDraftVault({
      operatorId: input.operatorId,
      vaultTypeId: input.vaultTypeId,
      name: input.name,
      planTier: billingRecord.targetTier,
      subjectValues: input.subjectValues,
    }, tx);
    await tx.update(billingRecordsTable).set({
      vaultId: vault.id,
      appliedAt: new Date(),
    }).where(eq(billingRecordsTable.id, billingRecord.id));
    return { kind: "ok" as const, vault, guestToken };
  });
}

export async function updateDraftVaultSetup(input: {
  vaultId: string;
  operatorId: string;
  planTier: PlanTier;
  revealSchedule?: RevealSchedule | null;
  anchorDate?: string | null;
  milestoneDate?: string | null;
  milestoneLabel?: string | null;
}) {
  if (input.revealSchedule && !PLAN_POLICY[input.planTier].schedules.includes(input.revealSchedule)) {
    throw new Error("That reveal schedule is not available on this plan.");
  }
  const [updated] = await db
    .update(vaultsTable)
    .set({
      planTier: input.planTier,
      revealSchedule: input.revealSchedule ?? null,
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
    if (!vault.revealSchedule) throw new Error("Choose a reveal schedule before sealing.");

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