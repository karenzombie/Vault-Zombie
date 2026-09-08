import { createHash } from "node:crypto";
import { and, asc, count, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./index";
import { PLAN_POLICY } from "./schedule";
import { questionOptionsTable, questionsTable } from "./schema/content";
import { overageEventsTable } from "./schema/billing";
import { answersTable, guestsTable, submissionsTable } from "./schema/predictions";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";

export type GuestAnswerDraft = {
  vaultQuestionId: string;
  revealSlotId: string;
  answerType: "free_text" | "number" | "multiple_choice" | "name_pick";
  textValue?: string | null;
  numberValue?: number | null;
  optionId?: string | null;
};

const tokenHash = (token: string) =>
  createHash("sha256").update(token, "utf8").digest("hex");

async function findPublicVault(token: string) {
  const [vault] = await db.select().from(vaultsTable).where(and(
    eq(vaultsTable.guestTokenHash, tokenHash(token)),
    eq(vaultsTable.status, "sealed"),
  )).limit(1);
  return vault;
}

export async function readGuestForm(token: string) {
  const vault = await findPublicVault(token);
  if (!vault) return null;
  const questionRows = await db.select({
    id: vaultQuestionsTable.id,
    sourceQuestionId: vaultQuestionsTable.questionId,
    prompt: vaultQuestionsTable.promptSnapshot,
    displayOrder: vaultQuestionsTable.displayOrder,
    answerType: questionsTable.answerType,
    numberUnit: questionsTable.numberUnit,
    numberMinimum: questionsTable.numberMinimum,
    numberMaximum: questionsTable.numberMaximum,
  }).from(vaultQuestionsTable).innerJoin(
    questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id),
  ).where(and(eq(vaultQuestionsTable.vaultId, vault.id), eq(vaultQuestionsTable.enabled, true)))
    .orderBy(asc(vaultQuestionsTable.displayOrder));
  const questionIds = questionRows.map((row) => row.sourceQuestionId);
  const optionRows = questionIds.length ? await db.select({
    questionId: questionOptionsTable.questionId,
    id: questionOptionsTable.id,
    label: questionOptionsTable.label,
  }).from(questionOptionsTable).where(eq(questionOptionsTable.isRetired, false)) : [];
  const timings = await db.select({
    id: revealSlotsTable.id,
    label: revealSlotsTable.label,
    revealDate: revealSlotsTable.revealDate,
  }).from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vault.id))
    .orderBy(asc(revealSlotsTable.displayOrder));
  return {
    name: vault.name,
    subjectValues: vault.subjectValues,
    layout: vault.guestLayout,
    referrerCode: vault.referrerCode,
    questions: questionRows.map((question) => ({
      id: question.id,
      prompt: question.prompt,
      displayOrder: question.displayOrder,
      answerType: question.answerType,
      numberUnit: question.numberUnit,
      numberMinimum: question.numberMinimum,
      numberMaximum: question.numberMaximum,
      options: optionRows.filter((option) => option.questionId === question.sourceQuestionId)
        .map(({ id, label }) => ({ id, label })),
    })),
    timings,
  };
}

export async function submitGuestAnswers(token: string, input: {
  displayName: string;
  email?: string | null;
  emailOptedOut: boolean;
  answers: GuestAnswerDraft[];
}) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select().from(vaultsTable).where(and(
      eq(vaultsTable.guestTokenHash, tokenHash(token)),
      eq(vaultsTable.status, "sealed"),
    )).limit(1).for("update");
    if (!vault) throw new Error("Guest link not found.");

    const [{ value: existingCount }] = await tx.select({ value: count() })
      .from(submissionsTable).where(and(
        eq(submissionsTable.vaultId, vault.id),
        isNull(submissionsTable.culledAt),
        isNull(submissionsTable.archivedAt),
      ));
    const cap = PLAN_POLICY[vault.entitledPlanTier].guestCap;

    const questionRows = await tx.select({
      id: vaultQuestionsTable.id,
      sourceQuestionId: vaultQuestionsTable.questionId,
      answerType: questionsTable.answerType,
      numberMinimum: questionsTable.numberMinimum,
      numberMaximum: questionsTable.numberMaximum,
    }).from(vaultQuestionsTable).innerJoin(
      questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id),
    ).where(and(
      eq(vaultQuestionsTable.vaultId, vault.id),
      eq(vaultQuestionsTable.enabled, true),
      inArray(vaultQuestionsTable.id, input.answers.map((a) => a.vaultQuestionId)),
    ));
    const slots = await tx.select().from(revealSlotsTable)
      .where(and(eq(revealSlotsTable.vaultId, vault.id), inArray(
        revealSlotsTable.id, input.answers.map((a) => a.revealSlotId),
      )));
    if (questionRows.length !== input.answers.length || slots.length === 0) {
      throw new Error("Submission contains an invalid prompt or reveal timing.");
    }

    const [guest] = await tx.insert(guestsTable).values({
      vaultId: vault.id,
      displayName: input.displayName.trim(),
      email: input.emailOptedOut ? null : input.email,
      emailOptedOut: input.emailOptedOut,
    }).returning();
    const held = existingCount >= cap;
    const [submission] = await tx.insert(submissionsTable).values({
      vaultId: vault.id,
      guestId: guest.id,
      overGuestCap: held,
      heldAt: held ? new Date() : null,
    }).returning();
    if (held) {
      const [openEvent] = await tx.select({ id: overageEventsTable.id }).from(overageEventsTable)
        .where(and(eq(overageEventsTable.vaultId, vault.id), isNull(overageEventsTable.resolvedAt))).limit(1);
      if (!openEvent) await tx.insert(overageEventsTable).values({
        vaultId: vault.id, guestCap: cap, submissionCount: Number(existingCount) + 1,
      });
    }

    for (const answer of input.answers) {
      const question = questionRows.find((row) => row.id === answer.vaultQuestionId)!;
      const slot = slots.find((row) => row.id === answer.revealSlotId);
      if (!slot || question.answerType !== answer.answerType) throw new Error("Answer type or timing mismatch.");
      if (answer.answerType === "free_text" && (!answer.textValue || answer.textValue.length > 140)) {
        throw new Error("Free-text answers must contain 1 to 140 characters.");
      }
      if (answer.answerType === "number" && (
        answer.numberValue == null ||
        question.numberMinimum == null ||
        question.numberMaximum == null ||
        answer.numberValue < question.numberMinimum ||
        answer.numberValue > question.numberMaximum
      )) throw new Error("Number answer is outside the allowed range.");
      if ((answer.answerType === "multiple_choice" || answer.answerType === "name_pick") && !answer.optionId) {
        throw new Error("Select an answer option.");
      }
      if (answer.optionId) {
        const [validOption] = await tx.select({ id: questionOptionsTable.id })
          .from(questionOptionsTable)
          .where(and(
            eq(questionOptionsTable.id, answer.optionId),
            eq(questionOptionsTable.questionId, question.sourceQuestionId),
            eq(questionOptionsTable.isRetired, false),
          )).limit(1);
        if (!validOption) throw new Error("Select a valid answer option.");
      }
      await tx.insert(answersTable).values({
        submissionId: submission.id,
        vaultQuestionId: answer.vaultQuestionId,
        revealSlotId: slot.id,
        answerType: answer.answerType,
        textValue: answer.answerType === "free_text" ? answer.textValue : null,
        numberValue: answer.answerType === "number" ? answer.numberValue : null,
        optionId: answer.answerType === "multiple_choice" || answer.answerType === "name_pick" ? answer.optionId : null,
        unlockAt: new Date(`${slot.revealDate}T00:00:00.000Z`),
      });
    }
    return { submissionId: submission.id, referrerCode: vault.referrerCode, vaultId: vault.id, vaultName: vault.name, guestId: guest.id, guestEmail: guest.email };
  });
}

/** Operator decline: preserve answers but archive newest whole submissions. */
export async function declineGuestOverage(vaultId: string, operatorId: string) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select().from(vaultsTable).where(and(eq(vaultsTable.id, vaultId), eq(vaultsTable.operatorId, operatorId))).limit(1).for("update");
    if (!vault) throw new Error("Vault not found.");
    const cap = PLAN_POLICY[vault.entitledPlanTier].guestCap;
    const submissions = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
      .where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)))
      .orderBy(asc(submissionsTable.submittedAt));
    const ids = submissions.slice(cap).map((row) => row.id);
    if (ids.length) await tx.update(submissionsTable).set({ archivedAt: new Date(), heldAt: null, culledAt: new Date() }).where(inArray(submissionsTable.id, ids));
    await tx.update(overageEventsTable).set({ outcome: "declined", resolvedAt: new Date() })
      .where(and(eq(overageEventsTable.vaultId, vaultId), isNull(overageEventsTable.resolvedAt)));
    return ids.length;
  });
}

export async function releaseHeldSubmissions(vaultId: string) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1).for("update");
    if (!vault) throw new Error("Vault not found.");
    const cap = PLAN_POLICY[vault.entitledPlanTier].guestCap;
    const active = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
      .where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)))
      .orderBy(asc(submissionsTable.submittedAt));
    const release = active.slice(0, cap).map((row) => row.id);
    if (release.length) await tx.update(submissionsTable).set({ heldAt: null }).where(inArray(submissionsTable.id, release));
    await tx.update(overageEventsTable).set({ outcome: "upgraded", resolvedAt: new Date() })
      .where(and(eq(overageEventsTable.vaultId, vaultId), isNull(overageEventsTable.resolvedAt)));
  });
}

export async function cullGuestOverage(vaultId: string) {
  return db.transaction(async (tx) => {
    const [vault] = await tx.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1).for("update");
    if (!vault) throw new Error("Vault not found.");
    const cap = PLAN_POLICY[vault.entitledPlanTier].guestCap;
    const excess = await tx.select({ id: submissionsTable.id }).from(submissionsTable)
       .where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.culledAt), isNull(submissionsTable.archivedAt)))
      .orderBy(asc(submissionsTable.submittedAt));
    const remove = excess.slice(cap);
    if (remove.length) {
      const submissionIds = remove.map((row) => row.id);
      await tx.update(submissionsTable).set({ culledAt: new Date(), archivedAt: new Date(), heldAt: null })
        .where(inArray(submissionsTable.id, submissionIds));
    }
    return remove.length;
  });
}