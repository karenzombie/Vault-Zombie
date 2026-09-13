import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./index";
import { enqueueEmail } from "./email";
import { buildRevealSlots, isPlanTierWithinEntitlement, PLAN_POLICY, type PlanTier, type RevealSchedule } from "./schedule";
import { accountsTable } from "./schema/accounts";
import { billingRecordsTable } from "./schema/billing";
import { questionsTable, subcategoriesTable, vaultTypesTable } from "./schema/content";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";

const tokenHash = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

const STARTER_SET_SIZE = 20;

/**
 * The starter set for a vault type: walk its sub-categories in display order, taking
 * one prompt from each in turn (in bank display order within the sub-category), cycling
 * through the sub-categories until 20 prompts are picked or the bank runs out. Purely a
 * function of the vault type's bank content and display orders, so it is deterministic
 * and produces the same result every time for a given vault type (VaultZombie-Flow1-
 * Build-Stages.md, 3.4, decision 5).
 */
/**
 * The full bank selection for a new vault: the starter set (as before, unchanged), plus
 * every other non-retired bank question for the vault type, so vault creation can seed a
 * vault_questions row for the complete bank (VaultZombie correction, "GIVE EVERY VAULT ITS
 * FULL QUESTION BANK"). The starter set keeps its existing round-robin order. The rest
 * follow it in sub-category display order, then bank display order within each
 * sub-category, which is their natural order with the starter picks removed. This is a
 * display-order placement choice, not a product decision: the rest arrive disabled, so
 * their position in display order only matters until a host turns one on, at which point
 * it renders inside its own sub-category group regardless of its numeric position.
 */
async function pickBankSelection(dbClient: Pick<typeof db, "select">, vaultTypeId: string) {
  const subcategories = await dbClient.select({ id: subcategoriesTable.id })
    .from(subcategoriesTable)
    .where(and(eq(subcategoriesTable.vaultTypeId, vaultTypeId), eq(subcategoriesTable.isRetired, false)))
    .orderBy(asc(subcategoriesTable.displayOrder));
  if (!subcategories.length) return { starter: [], rest: [] };
  const questions = await dbClient.select({ id: questionsTable.id, prompt: questionsTable.prompt, subcategoryId: questionsTable.subcategoryId })
    .from(questionsTable)
    .where(and(inArray(questionsTable.subcategoryId, subcategories.map((row) => row.id)), eq(questionsTable.isRetired, false)))
    .orderBy(asc(questionsTable.displayOrder));
  const queueBySubcategory = new Map(subcategories.map((row) => [row.id, questions.filter((q) => q.subcategoryId === row.id)]));
  const starter: { id: string; prompt: string }[] = [];
  let exhausted = false;
  while (starter.length < STARTER_SET_SIZE && !exhausted) {
    exhausted = true;
    for (const subcategory of subcategories) {
      if (starter.length >= STARTER_SET_SIZE) break;
      const queue = queueBySubcategory.get(subcategory.id)!;
      const next = queue.shift();
      if (next) {
        starter.push({ id: next.id, prompt: next.prompt });
        exhausted = false;
      }
    }
  }
  const rest: { id: string; prompt: string }[] = [];
  for (const subcategory of subcategories) {
    for (const question of queueBySubcategory.get(subcategory.id)!) {
      rest.push({ id: question.id, prompt: question.prompt });
    }
  }
  return { starter, rest };
}

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
  // Seed the complete bank for the vault type, not only the starter set, so the host can
  // browse and toggle every prompt (VaultZombie-Flow1-Build-Stages.md, 3.4; corrected in
  // the "GIVE EVERY VAULT ITS FULL QUESTION BANK" follow-up). The starter set arrives
  // enabled, in its existing round-robin order. Everything else arrives disabled, right
  // after it in display order (see pickBankSelection).
  const { starter, rest } = await pickBankSelection(dbClient, input.vaultTypeId);
  const bankRows = [
    ...starter.map((question) => ({ question, enabled: true })),
    ...rest.map((question) => ({ question, enabled: false })),
  ];
  if (bankRows.length) {
    await dbClient.insert(vaultQuestionsTable).values(bankRows.map(({ question, enabled }, index) => ({
      vaultId: vault.id,
      questionId: question.id,
      promptSnapshot: question.prompt,
      enabled,
      displayOrder: index,
      isCustom: false,
    })));
  }
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

export async function getVaultSetupDetail(vaultId: string, operatorId: string) {
  const [row] = await db.select({
    id: vaultsTable.id,
    name: vaultsTable.name,
    status: vaultsTable.status,
    planTier: vaultsTable.planTier,
    entitledPlanTier: vaultsTable.entitledPlanTier,
    vaultTypeId: vaultsTable.vaultTypeId,
    vaultTypeName: vaultTypesTable.name,
    vaultTypeSlug: vaultTypesTable.slug,
    revealSchedule: vaultsTable.revealSchedule,
    anchorDate: vaultsTable.anchorDate,
    milestoneDate: vaultsTable.milestoneDate,
    milestoneLabel: vaultsTable.milestoneLabel,
    coverObjectKey: vaultsTable.coverObjectKey,
    guestLayout: vaultsTable.guestLayout,
    // Raw guest token (Stage 5.1): only ever read here, behind requireOperator plus the
    // operatorId match above, so only this vault's own host can ever see it. Never
    // selected by any guest-facing or unauthenticated read.
    guestToken: vaultsTable.guestToken,
  }).from(vaultsTable)
    .innerJoin(vaultTypesTable, eq(vaultsTable.vaultTypeId, vaultTypesTable.id))
    .where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId)))
    .limit(1);
  if (!row) throw new Error("Vault not found.");
  return row;
}

/**
 * Stage 5.3: everything the "Seal this vault" button needs to decide whether it can
 * seal, why not if it cannot, and what to show in the pre-seal confirmation box. Mirrors
 * sealVault's own checks exactly (entitlement, reveal schedule, Deep Vault milestone, at
 * least one enabled prompt) plus subject names, which sealVault does not check itself
 * (subject names are enforced at vault creation, so they are always present in practice,
 * but this button still accounts for them). Reveal dates are a preview only, computed
 * against today's date the same way the schedule preview endpoint does; the real seal
 * date is fixed at the moment sealVault actually runs.
 */
export async function getSealReadiness(vaultId: string, operatorId: string) {
  const [vault] = await db.select({
    status: vaultsTable.status,
    planTier: vaultsTable.planTier,
    entitledPlanTier: vaultsTable.entitledPlanTier,
    revealSchedule: vaultsTable.revealSchedule,
    anchorDate: vaultsTable.anchorDate,
    milestoneDate: vaultsTable.milestoneDate,
    milestoneLabel: vaultsTable.milestoneLabel,
    subjectValues: vaultsTable.subjectValues,
    vaultTypeId: vaultsTable.vaultTypeId,
  }).from(vaultsTable)
    .where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId)))
    .limit(1);
  if (!vault) throw new Error("Vault not found.");

  const [vaultType] = await db.select({ requiredSubjectTokens: vaultTypesTable.requiredSubjectTokens })
    .from(vaultTypesTable).where(eq(vaultTypesTable.id, vault.vaultTypeId)).limit(1);

  const enabledPrompts = await db.select({ id: vaultQuestionsTable.id }).from(vaultQuestionsTable)
    .where(and(eq(vaultQuestionsTable.vaultId, vaultId), eq(vaultQuestionsTable.enabled, true)));

  const reasons: string[] = [];
  if (vault.status !== "draft") reasons.push("This vault is already sealed.");
  if (!isPlanTierWithinEntitlement(vault.planTier, vault.entitledPlanTier)) {
    reasons.push("Complete payment before sealing a vault configured above its current entitlement.");
  }
  if (!vault.revealSchedule) reasons.push("Choose a reveal schedule before sealing.");
  if (vault.planTier === "deep_vault" && (!vault.milestoneDate || !vault.milestoneLabel)) {
    reasons.push("Set a milestone date and label before sealing a Deep Vault.");
  }
  if (!enabledPrompts.length) reasons.push("Select at least one prompt before sealing.");
  const missingSubjects = (vaultType?.requiredSubjectTokens ?? [])
    .some((token) => !vault.subjectValues?.[token]?.trim());
  if (missingSubjects) reasons.push("Fill in every subject name before sealing.");

  let firstRevealDate: string | null = null;
  let lastRevealDate: string | null = null;
  if (vault.revealSchedule) {
    const today = new Date().toISOString().slice(0, 10);
    const preview = buildRevealSlots({
      anchorDate: vault.anchorDate ?? today,
      sealDate: today,
      planTier: vault.planTier,
      schedule: vault.revealSchedule,
      milestoneDate: vault.milestoneDate,
      milestoneLabel: vault.milestoneLabel,
    });
    if (preview.length) {
      firstRevealDate = preview[0].revealDate;
      lastRevealDate = preview[preview.length - 1].revealDate;
    }
  }

  return {
    ready: reasons.length === 0,
    reasons,
    promptCount: enabledPrompts.length,
    scheduleName: vault.revealSchedule,
    tierName: vault.planTier,
    firstRevealDate,
    lastRevealDate,
  };
}

/**
 * Sets or replaces a vault's uploaded cover photo (Stage 4.1). Lockbox never
 * gets an upload control in the UI, but this is enforced here too so the
 * restriction cannot be bypassed by calling the endpoint directly. Returns
 * the previous coverObjectKey so the caller can delete that object from
 * storage after the database write commits; the cover is not sealed content,
 * so this is allowed at any vault status, not just draft.
 */
export async function setVaultCover(input: { vaultId: string; operatorId: string; coverObjectKey: string }) {
  const [vault] = await db.select({ planTier: vaultsTable.planTier, coverObjectKey: vaultsTable.coverObjectKey })
    .from(vaultsTable)
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)))
    .limit(1);
  if (!vault) throw new Error("Vault not found.");
  if (vault.planTier === "lockbox") throw new Error("Lockbox vaults cannot upload a cover photo.");
  const previousObjectKey = vault.coverObjectKey;
  await db.update(vaultsTable).set({ coverObjectKey: input.coverObjectKey })
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)));
  return { previousObjectKey };
}

/** Removes a vault's uploaded cover photo, reverting to the vault type's silhouette (Stage 4.1). */
export async function removeVaultCover(input: { vaultId: string; operatorId: string }) {
  const [vault] = await db.select({ coverObjectKey: vaultsTable.coverObjectKey })
    .from(vaultsTable)
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)))
    .limit(1);
  if (!vault) throw new Error("Vault not found.");
  const previousObjectKey = vault.coverObjectKey;
  await db.update(vaultsTable).set({ coverObjectKey: null })
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)));
  return { previousObjectKey };
}

/**
 * Changes how guests see the prompt list (Stage 4.2). Unlike the rest of
 * setup, this is not draft-only: the build brief requires it changeable at
 * any time, including after the vault is sealed, so there is no status
 * check here.
 */
export async function setVaultGuestLayout(input: { vaultId: string; operatorId: string; guestLayout: "one_at_a_time" | "all_prompts" }) {
  const [updated] = await db.update(vaultsTable).set({ guestLayout: input.guestLayout })
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)))
    .returning({ guestLayout: vaultsTable.guestLayout });
  if (!updated) throw new Error("Vault not found.");
  return updated;
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
    if (vault.planTier === "deep_vault" && (!vault.milestoneDate || !vault.milestoneLabel)) {
      throw new Error("Set a milestone date and label before sealing a Deep Vault.");
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

export async function listVaultPrompts(vaultId: string, operatorId: string) {
  const [vault] = await db.select({ id: vaultsTable.id }).from(vaultsTable)
    .where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId))).limit(1);
  if (!vault) throw new Error("Vault not found.");
  return db.select({
    id: vaultQuestionsTable.id,
    prompt: vaultQuestionsTable.promptSnapshot,
    enabled: vaultQuestionsTable.enabled,
    displayOrder: vaultQuestionsTable.displayOrder,
    isCustom: vaultQuestionsTable.isCustom,
    customFreeTextMode: vaultQuestionsTable.customFreeTextMode,
    answerType: sql<string>`coalesce(${questionsTable.answerType}, 'free_text')`,
    freeTextMode: sql<string | null>`coalesce(${questionsTable.freeTextMode}, ${vaultQuestionsTable.customFreeTextMode})`,
    subcategoryId: subcategoriesTable.id,
    subcategoryName: subcategoriesTable.name,
    subcategoryDisplayOrder: subcategoriesTable.displayOrder,
  }).from(vaultQuestionsTable)
    .leftJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
    .leftJoin(subcategoriesTable, eq(questionsTable.subcategoryId, subcategoriesTable.id))
    .where(eq(vaultQuestionsTable.vaultId, vaultId))
    .orderBy(asc(vaultQuestionsTable.displayOrder));
}

export async function addCustomPrompt(input: {
  vaultId: string;
  operatorId: string;
  prompt: string;
  freeTextMode: "scoreable" | "keepsake";
}) {
  const prompt = input.prompt.trim();
  if (!prompt) throw new Error("A prompt is required.");
  if (prompt.length > 140) throw new Error("A prompt must be 140 characters or fewer.");
  return db.transaction(async (tx) => {
    const [vault] = await tx.select({ id: vaultsTable.id, status: vaultsTable.status }).from(vaultsTable)
      .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId))).limit(1).for("update");
    if (!vault || vault.status !== "draft") throw new Error("Only a draft vault can add prompts.");
    // Custom prompts sit in their own group at the top of the list, ahead of the
    // bank groups (VaultZombie-Flow1-Build-Stages.md, 3.4). New ones insert right
    // after any existing custom prompts and before the bank, shifting the bank's
    // display order down to make room rather than appending at the end.
    const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${vaultQuestionsTable.displayOrder}), -1) + 1` })
      .from(vaultQuestionsTable).where(and(eq(vaultQuestionsTable.vaultId, input.vaultId), eq(vaultQuestionsTable.isCustom, true)));
    const toShift = await tx.select({ id: vaultQuestionsTable.id, displayOrder: vaultQuestionsTable.displayOrder })
      .from(vaultQuestionsTable)
      .where(and(eq(vaultQuestionsTable.vaultId, input.vaultId), sql`${vaultQuestionsTable.displayOrder} >= ${next}`));
    // Shift via a negative staging range first: the unique (vault_id, display_order)
    // index is checked per row on a bulk update, so a direct +1 on an ascending range
    // collides with the not-yet-updated neighbor. Same two-phase pattern as reorderVaultPrompts.
    for (const row of toShift) {
      await tx.update(vaultQuestionsTable).set({ displayOrder: -(row.displayOrder + 1) })
        .where(eq(vaultQuestionsTable.id, row.id));
    }
    for (const row of toShift) {
      await tx.update(vaultQuestionsTable).set({ displayOrder: row.displayOrder + 1 })
        .where(eq(vaultQuestionsTable.id, row.id));
    }
    const [row] = await tx.insert(vaultQuestionsTable).values({
      vaultId: input.vaultId,
      questionId: null,
      promptSnapshot: prompt,
      customFreeTextMode: input.freeTextMode,
      enabled: true,
      displayOrder: next,
      isCustom: true,
    }).returning();
    return row;
  });
}

export async function toggleVaultPrompt(input: { vaultId: string; operatorId: string; vaultQuestionId: string; enabled: boolean }) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select({ id: vaultsTable.id, status: vaultsTable.status }).from(vaultsTable)
      .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId))).limit(1).for("update");
    if (!vault || vault.status !== "draft") throw new Error("Only a draft vault can change its prompts.");
    const [row] = await tx.update(vaultQuestionsTable).set({ enabled: input.enabled })
      .where(and(eq(vaultQuestionsTable.id, input.vaultQuestionId), eq(vaultQuestionsTable.vaultId, input.vaultId)))
      .returning();
    if (!row) throw new Error("Prompt not found.");
    return row;
  });
}

/**
 * Reorders a vault's prompts to the exact sequence of vaultQuestionIds given. Identity
 * (the row's id) never changes, only displayOrder, so answers stay attached correctly.
 * Writes negative placeholders first to avoid colliding with the unique
 * (vaultId, displayOrder) constraint mid-update.
 */
export async function reorderVaultPrompts(input: { vaultId: string; operatorId: string; orderedVaultQuestionIds: string[] }) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select({ id: vaultsTable.id, status: vaultsTable.status }).from(vaultsTable)
      .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId))).limit(1).for("update");
    if (!vault || vault.status !== "draft") throw new Error("Only a draft vault can reorder its prompts.");
    const existing = await tx.select({ id: vaultQuestionsTable.id }).from(vaultQuestionsTable)
      .where(eq(vaultQuestionsTable.vaultId, input.vaultId));
    const existingIds = new Set(existing.map((row) => row.id));
    if (input.orderedVaultQuestionIds.length !== existing.length || !input.orderedVaultQuestionIds.every((id) => existingIds.has(id))) {
      throw new Error("The reorder list must contain exactly this vault's prompts.");
    }
    for (const [index, id] of input.orderedVaultQuestionIds.entries()) {
      await tx.update(vaultQuestionsTable).set({ displayOrder: -(index + 1) })
        .where(eq(vaultQuestionsTable.id, id));
    }
    for (const [index, id] of input.orderedVaultQuestionIds.entries()) {
      await tx.update(vaultQuestionsTable).set({ displayOrder: index })
        .where(eq(vaultQuestionsTable.id, id));
    }
    return listVaultPrompts(input.vaultId, input.operatorId);
  });
}

/**
 * Changes a sealed vault's event date (3.5). Rebuilds every reveal that has not
 * happened yet from the new date. Refuses a date that would push any reveal into
 * the past or today, naming the broken reveal. Once any reveal has opened, the
 * date is locked for good; callers must check that before invoking this.
 */
export async function changeSealedVaultEventDate(input: {
  vaultId: string;
  operatorId: string;
  newAnchorDate: string;
}) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select().from(vaultsTable)
      .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId)))
      .limit(1).for("update");
    if (!vault || vault.status === "draft" || vault.status === "deleted") throw new Error("Vault not found or not sealed.");
    if (!vault.revealSchedule) throw new Error("This vault has no reveal schedule to recalculate.");

    const today = new Date().toISOString().slice(0, 10);
    const existingSlots = await tx.select().from(revealSlotsTable)
      .where(eq(revealSlotsTable.vaultId, vault.id)).orderBy(asc(revealSlotsTable.displayOrder));
    const openedAlready = existingSlots.some((slot) => slot.revealDate <= today);
    if (openedAlready) {
      throw new Error("Your first reveal has opened, so the date is set from here on.");
    }

    const sealDate = vault.sealedAt ? vault.sealedAt.toISOString().slice(0, 10) : today;
    const newSlots = buildRevealSlots({
      anchorDate: input.newAnchorDate,
      sealDate,
      planTier: vault.planTier,
      schedule: vault.revealSchedule,
      milestoneDate: vault.milestoneDate,
      milestoneLabel: vault.milestoneLabel,
    });
    const broken = newSlots.find((slot) => slot.revealDate <= today);
    if (broken) {
      throw new Error(`That date would push "${broken.label}" into the past or today. Choose a later date.`);
    }

    await tx.delete(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id));
    await tx.insert(revealSlotsTable).values(newSlots.map((slot, index) => ({
      vaultId: vault.id,
      kind: slot.kind,
      label: slot.label,
      revealDate: slot.revealDate,
      displayOrder: index,
    })));
    const [updated] = await tx.update(vaultsTable).set({ anchorDate: input.newAnchorDate })
      .where(eq(vaultsTable.id, vault.id)).returning();
    return { vault: updated, revealSlots: newSlots };
  });
}

/** Read-only status for the 3.5 sealed-vault date control: current date, schedule, and lock state. */
export async function getSealedVaultDateInfo(vaultId: string, operatorId: string) {
  const [vault] = await db.select({
    anchorDate: vaultsTable.anchorDate,
    revealSchedule: vaultsTable.revealSchedule,
    status: vaultsTable.status,
  }).from(vaultsTable)
    .where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId))).limit(1);
  if (!vault || vault.status === "draft" || vault.status === "deleted") throw new Error("Vault not found or not sealed.");
  const today = new Date().toISOString().slice(0, 10);
  const slots = await db.select({ revealDate: revealSlotsTable.revealDate }).from(revealSlotsTable)
    .where(eq(revealSlotsTable.vaultId, vaultId));
  const locked = slots.some((slot) => slot.revealDate <= today);
  return { anchorDate: vault.anchorDate, revealSchedule: vault.revealSchedule, locked };
}

/**
 * Previews the recalculated reveal dates for a sealed vault's event date change,
 * without applying anything. The host must see and confirm this before
 * changeSealedVaultEventDate is called.
 */
export async function previewSealedVaultEventDateChange(input: {
  vaultId: string;
  operatorId: string;
  newAnchorDate: string;
}) {
  const [vault] = await db.select().from(vaultsTable)
    .where(and(eq(vaultsTable.id, input.vaultId), eq(vaultsTable.operatorId, input.operatorId))).limit(1);
  if (!vault || vault.status === "draft" || vault.status === "deleted") throw new Error("Vault not found or not sealed.");
  if (!vault.revealSchedule) throw new Error("This vault has no reveal schedule to recalculate.");

  const today = new Date().toISOString().slice(0, 10);
  const existingSlots = await db.select().from(revealSlotsTable)
    .where(eq(revealSlotsTable.vaultId, vault.id)).orderBy(asc(revealSlotsTable.displayOrder));
  const openedAlready = existingSlots.some((slot) => slot.revealDate <= today);
  if (openedAlready) {
    throw new Error("Your first reveal has opened, so the date is set from here on.");
  }

  const sealDate = vault.sealedAt ? vault.sealedAt.toISOString().slice(0, 10) : today;
  const newSlots = buildRevealSlots({
    anchorDate: input.newAnchorDate,
    sealDate,
    planTier: vault.planTier,
    schedule: vault.revealSchedule,
    milestoneDate: vault.milestoneDate,
    milestoneLabel: vault.milestoneLabel,
  });
  const broken = newSlots.find((slot) => slot.revealDate <= today);
  if (broken) {
    throw new Error(`That date would push "${broken.label}" into the past or today. Choose a later date.`);
  }
  return { revealSlots: newSlots, openedAlready: false };
}