import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./index";
import { readUnlockedAnswers } from "./sealed-content";
import {
  answerVerdictsTable,
  questionOutcomesTable,
} from "./schema/predictions";
import { questionOptionsTable, questionsTable } from "./schema/content";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";

export type VerdictTier = "full" | "half" | "zero";

export class RevealScoringError extends Error {
  constructor(message: string, public readonly status: 400 | 403 | 404 = 400) {
    super(message);
  }
}

/** Stable, intentionally conservative grouping key for scoreable text answers. */
export function normalizeRevealText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

async function requireOwnedVault(vaultId: string, operatorId: string) {
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) throw new RevealScoringError("Vault not found.", 404);
  if (vault.operatorId !== operatorId) {
    throw new RevealScoringError("This vault is not owned by the authenticated operator.", 403);
  }
  return vault;
}

async function questionContext(vaultId: string, revealSlotId: string, vaultQuestionId: string) {
  const [slot] = await db.select().from(revealSlotsTable)
    .where(and(eq(revealSlotsTable.id, revealSlotId), eq(revealSlotsTable.vaultId, vaultId))).limit(1);
  if (!slot) throw new RevealScoringError("Reveal slot not found.", 404);
  const [question] = await db.select({
    vaultQuestionId: vaultQuestionsTable.id,
    prompt: vaultQuestionsTable.promptSnapshot,
    questionId: questionsTable.id,
    answerType: questionsTable.answerType,
    freeTextMode: questionsTable.freeTextMode,
    numberCloseBand: questionsTable.numberCloseBand,
  }).from(vaultQuestionsTable).innerJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
    .where(and(eq(vaultQuestionsTable.id, vaultQuestionId), eq(vaultQuestionsTable.vaultId, vaultId))).limit(1);
  if (!question) throw new RevealScoringError("Vault question not found.", 404);
  return question;
}

type OutcomeInput = {
  trueTextValue?: string | null;
  trueNumberValue?: number | null;
  trueOptionId?: string | null;
  operatorNote?: string | null;
};

function assertOutcomeInput(
  question: Awaited<ReturnType<typeof questionContext>>,
  input: OutcomeInput,
) {
  if (input.operatorNote != null && input.operatorNote.length > 140) {
    throw new RevealScoringError("Operator note must be 140 characters or fewer.");
  }
  const supplied = [input.trueTextValue != null, input.trueNumberValue != null, input.trueOptionId != null]
    .filter(Boolean).length;
  if (supplied !== 1) throw new RevealScoringError("Provide exactly one true outcome value.");
  if (question.answerType === "number" && typeof input.trueNumberValue !== "number") {
    throw new RevealScoringError("Number questions require a numeric true outcome.");
  }
  if ((question.answerType === "multiple_choice" || question.answerType === "name_pick") && !input.trueOptionId) {
    throw new RevealScoringError("Choice questions require a true option ID.");
  }
  if (question.answerType === "free_text" && (!input.trueTextValue || !normalizeRevealText(input.trueTextValue))) {
    throw new RevealScoringError("Scoreable free-text questions require a non-empty true outcome.");
  }
  if (question.freeTextMode === "keepsake") {
    throw new RevealScoringError("Keepsake questions do not have outcomes or verdicts.");
  }
}

export async function listUnlockedRevealWork(vaultId: string, operatorId: string) {
  await requireOwnedVault(vaultId, operatorId);
  const answers = await readUnlockedAnswers({ vaultId });
  if (!answers.length) return { questions: [] };
  const ids = [...new Set(answers.map((answer) => answer.vaultQuestionId))];
  const contexts = await db.select({
    vaultQuestionId: vaultQuestionsTable.id, prompt: vaultQuestionsTable.promptSnapshot,
    answerType: questionsTable.answerType, freeTextMode: questionsTable.freeTextMode,
    numberCloseBand: questionsTable.numberCloseBand,
  }).from(vaultQuestionsTable).innerJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
    .where(inArray(vaultQuestionsTable.id, ids));
  const outcomes = await db.select().from(questionOutcomesTable)
    .where(inArray(questionOutcomesTable.vaultQuestionId, ids));
  const verdicts = await db.select().from(answerVerdictsTable)
    .where(inArray(answerVerdictsTable.answerId, answers.map((answer) => answer.id)));
  const outcomeByPair = new Map(outcomes.map((outcome) => [`${outcome.vaultQuestionId}:${outcome.revealSlotId}`, outcome]));
  const verdictByAnswer = new Map(verdicts.map((verdict) => [verdict.answerId, verdict]));

  return {
    questions: contexts.flatMap((context) => {
      const scoped = answers.filter((answer) => answer.vaultQuestionId === context.vaultQuestionId);
      return [...new Set(scoped.map((answer) => answer.revealSlotId))].map((revealSlotId) => {
        const grouped = scoped.filter((answer) => answer.revealSlotId === revealSlotId);
        const outcome = outcomeByPair.get(`${context.vaultQuestionId}:${revealSlotId}`);
        const clusters = context.answerType === "free_text" && context.freeTextMode === "scoreable"
          ? [...grouped.reduce((map, answer) => {
              const key = normalizeRevealText(answer.textValue!);
              const item = map.get(key) ?? { key, normalizedValue: key, answers: [] as typeof grouped };
              item.answers.push(answer); map.set(key, item); return map;
            }, new Map<string, { key: string; normalizedValue: string; answers: typeof grouped }>()).values()]
              // The typed truth controls a stable, useful review order: the exact
              // normalized match first, then lexical cluster order. We deliberately
              // do not guess semantic similarity; the operator decides it per cluster.
              .sort((a, b) => {
                const truth = outcome?.trueTextValue ? normalizeRevealText(outcome.trueTextValue) : "";
                return Number(b.key === truth) - Number(a.key === truth) || a.key.localeCompare(b.key);
              })
              .map((cluster) => {
                const rows = cluster.answers.map((answer) => verdictByAnswer.get(answer.id));
                return {
                  ...cluster, answerCount: cluster.answers.length,
                  suggestedTier: outcome ? (normalizeRevealText(outcome.trueTextValue!) === cluster.key ? "full" : "zero") : null,
                  confirmedTier: rows[0]?.wasOverridden ? rows[0].tier : null,
                };
              })
          : [];
        return {
          vaultQuestionId: context.vaultQuestionId, revealSlotId, prompt: context.prompt,
          answerType: context.answerType, freeTextMode: context.freeTextMode,
          numberCloseBand: context.numberCloseBand, trueTextValue: outcome?.trueTextValue ?? null,
          trueNumberValue: outcome?.trueNumberValue ?? null, trueOptionId: outcome?.trueOptionId ?? null,
          operatorNote: outcome?.operatorNote ?? null,
          answers: grouped.map(({ id: answerId, guestId, guestDisplayName, textValue, numberValue, optionId }) =>
            ({ answerId, guestId, guestDisplayName, textValue, numberValue, optionId })),
          clusters,
        };
      });
    }),
  };
}

export async function resolveRevealQuestionOutcome(
  vaultId: string, operatorId: string, revealSlotId: string, vaultQuestionId: string, input: OutcomeInput,
) {
  await requireOwnedVault(vaultId, operatorId);
  const question = await questionContext(vaultId, revealSlotId, vaultQuestionId);
  assertOutcomeInput(question, input);
  if (input.trueOptionId) {
    const [option] = await db.select({ id: questionOptionsTable.id }).from(questionOptionsTable)
      .where(and(eq(questionOptionsTable.id, input.trueOptionId), eq(questionOptionsTable.questionId, question.questionId))).limit(1);
    if (!option) throw new RevealScoringError("True option does not belong to this question.");
  }
  return db.transaction(async (tx) => {
    const answers = (await readUnlockedAnswers({ vaultId, revealSlotId, database: tx }))
      .filter((answer) => answer.vaultQuestionId === vaultQuestionId);
    if (!answers.length) throw new RevealScoringError("No unlocked answers exist for this reveal question.", 404);
    const now = new Date();
    const [outcome] = await tx.insert(questionOutcomesTable).values({
      vaultQuestionId, revealSlotId, trueTextValue: input.trueTextValue ?? null,
      trueNumberValue: input.trueNumberValue ?? null, trueOptionId: input.trueOptionId ?? null,
      operatorNote: input.operatorNote ?? null, resolvedAt: now,
    }).onConflictDoUpdate({
      target: [questionOutcomesTable.vaultQuestionId, questionOutcomesTable.revealSlotId],
      set: { trueTextValue: input.trueTextValue ?? null, trueNumberValue: input.trueNumberValue ?? null,
        trueOptionId: input.trueOptionId ?? null, operatorNote: input.operatorNote ?? null, resolvedAt: now },
    }).returning();
    const trueText = input.trueTextValue ? normalizeRevealText(input.trueTextValue) : "";
    const rows = answers.map((answer) => {
      const tier: VerdictTier = question.answerType === "number"
        ? (answer.numberValue === input.trueNumberValue ? "full" :
          Math.abs(answer.numberValue! - input.trueNumberValue!) <= question.numberCloseBand! ? "half" : "zero")
        : question.answerType === "free_text"
          ? (normalizeRevealText(answer.textValue!) === trueText ? "full" : "zero")
          : answer.optionId === input.trueOptionId ? "full" : "zero";
      return { answerId: answer.id, questionOutcomeId: outcome.id, tier, wasOverridden: false,
        clusterKey: question.answerType === "free_text" ? normalizeRevealText(answer.textValue!) : null };
    });
    await tx.insert(answerVerdictsTable).values(rows).onConflictDoUpdate({
      target: answerVerdictsTable.answerId,
      set: {
        questionOutcomeId: outcome.id,
        tier: sql`case when ${answerVerdictsTable.wasOverridden} then ${answerVerdictsTable.tier} else excluded.tier end`,
        wasOverridden: answerVerdictsTable.wasOverridden,
        clusterKey: sql`case when ${answerVerdictsTable.wasOverridden} then ${answerVerdictsTable.clusterKey} else excluded.cluster_key end`,
      },
    });
    return { outcomeId: outcome.id, vaultQuestionId, revealSlotId, verdictCount: rows.length };
  });
}

export async function overrideRevealTextClusterVerdict(
  vaultId: string, operatorId: string, revealSlotId: string, vaultQuestionId: string, clusterKey: string, tier: VerdictTier,
) {
  await requireOwnedVault(vaultId, operatorId);
  const question = await questionContext(vaultId, revealSlotId, vaultQuestionId);
  if (question.answerType !== "free_text" || question.freeTextMode !== "scoreable") {
    throw new RevealScoringError("Only scoreable free-text clusters can be confirmed or overridden.");
  }
  const normalizedKey = normalizeRevealText(clusterKey);
  if (!normalizedKey) throw new RevealScoringError("Cluster key is invalid.");
  return db.transaction(async (tx) => {
    const answers = (await readUnlockedAnswers({ vaultId, revealSlotId, database: tx }))
      .filter((answer) => answer.vaultQuestionId === vaultQuestionId && normalizeRevealText(answer.textValue!) === normalizedKey);
    const [outcome] = await tx.select().from(questionOutcomesTable).where(and(
      eq(questionOutcomesTable.vaultQuestionId, vaultQuestionId), eq(questionOutcomesTable.revealSlotId, revealSlotId),
    )).limit(1);
    if (!outcome || !answers.length) throw new RevealScoringError("Resolved unlocked text cluster not found.", 404);
    await tx.update(answerVerdictsTable).set({ tier, wasOverridden: true })
      .where(and(eq(answerVerdictsTable.questionOutcomeId, outcome.id), inArray(answerVerdictsTable.answerId, answers.map((answer) => answer.id))));
    return { clusterKey: normalizedKey, tier, affectedAnswers: answers.length };
  });
}

export async function getOperatorScoreboard(vaultId: string, operatorId: string) {
  const vault = await requireOwnedVault(vaultId, operatorId);
  if (vault.entitledPlanTier === "lockbox") {
    throw new RevealScoringError("The scoreboard requires a paid vault plan.", 403);
  }
  const answers = await readUnlockedAnswers({ vaultId });
  if (!answers.length) return { entries: [] };
  const verdicts = await db.select().from(answerVerdictsTable).where(inArray(answerVerdictsTable.answerId, answers.map((answer) => answer.id)));
  const verdictByAnswer = new Map(verdicts.map((verdict) => [verdict.answerId, verdict]));
  const contexts = await db.select({ id: vaultQuestionsTable.id, freeTextMode: questionsTable.freeTextMode })
    .from(vaultQuestionsTable).innerJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
    .where(inArray(vaultQuestionsTable.id, [...new Set(answers.map((answer) => answer.vaultQuestionId))]));
  const modeByQuestion = new Map(contexts.map((context) => [context.id, context.freeTextMode]));
  const scores = new Map<string, { guestId: string; displayName: string; full: number; half: number; zero: number }>();
  for (const answer of answers) {
    if (modeByQuestion.get(answer.vaultQuestionId) === "keepsake") continue;
    const verdict = verdictByAnswer.get(answer.id); if (!verdict) continue;
    const row = scores.get(answer.guestId) ?? { guestId: answer.guestId, displayName: answer.guestDisplayName, full: 0, half: 0, zero: 0 };
    row[verdict.tier]++; scores.set(answer.guestId, row);
  }
  return { entries: [...scores.values()].map((row) => ({ ...row, total: row.full + row.half * .5 }))
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName) || a.guestId.localeCompare(b.guestId)) };
}