import { and, count, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { db } from "./index";
import { readUnlockedAnswers } from "./sealed-content";
import { answerVerdictsTable, answersTable, guestsTable, questionOutcomesTable, submissionsTable } from "./schema/predictions";
import { questionOptionsTable, questionsTable, subcategoriesTable } from "./schema/content";
import { revealSlotsTable, vaultQuestionsTable, vaultsTable } from "./schema/vaults";
import { accountsTable } from "./schema/accounts";

export class ReportError extends Error {
  constructor(message: string, public readonly status: 403 | 404 = 404) {
    super(message);
  }
}

type Unlocked = Awaited<ReturnType<typeof readUnlockedAnswers>>[number];
type Context = { id: string; questionId: string; prompt: string; answerType: string; freeTextMode: "scoreable" | "keepsake" | null; numberUnit: string | null; subcategoryId: string; subcategoryName: string; iconKey: string };

async function owned(vaultId: string, operatorId: string) {
  const [vault] = await db.select().from(vaultsTable).where(eq(vaultsTable.id, vaultId)).limit(1);
  if (!vault) throw new ReportError("Vault not found.");
  if (vault.operatorId !== operatorId) throw new ReportError("This vault is not owned by the authenticated operator.", 403);
  return vault;
}
function counts(tiers: Array<string | null | undefined>) {
  const full = tiers.filter((tier) => tier === "full").length;
  const half = tiers.filter((tier) => tier === "half").length;
  const zero = tiers.filter((tier) => tier === "zero").length;
  return { full, half, zero, scored: full + half + zero };
}
function outcomeForPair(
  outcomes: Array<{ vaultQuestionId: string; revealSlotId: string; operatorNote: string | null }>,
  vaultQuestionId: string,
  revealSlotId: string,
) {
  return outcomes.find((outcome) => outcome.vaultQuestionId === vaultQuestionId && outcome.revealSlotId === revealSlotId);
}
async function reportData(vaultId: string, operatorId: string) {
  const vault = await owned(vaultId, operatorId);
  const answers = await readUnlockedAnswers({ vaultId });
  const ids = [...new Set(answers.map((a) => a.vaultQuestionId))];
  const contexts: Context[] = ids.length ? await db.select({
    id: vaultQuestionsTable.id, questionId: questionsTable.id, prompt: vaultQuestionsTable.promptSnapshot, answerType: questionsTable.answerType, freeTextMode: questionsTable.freeTextMode,
    numberUnit: questionsTable.numberUnit, subcategoryId: subcategoriesTable.id, subcategoryName: subcategoriesTable.name, iconKey: subcategoriesTable.iconKey,
  }).from(vaultQuestionsTable).innerJoin(questionsTable, eq(vaultQuestionsTable.questionId, questionsTable.id))
    .innerJoin(subcategoriesTable, eq(questionsTable.subcategoryId, subcategoriesTable.id))
    .where(inArray(vaultQuestionsTable.id, ids)) : [];
  // Option labels are metadata for the unlocked question contexts only. Answer
  // values themselves remain exclusively sourced by readUnlockedAnswers above.
  const options = contexts.length ? await db.select({ id: questionOptionsTable.id, questionId: questionOptionsTable.questionId, label: questionOptionsTable.label })
    .from(questionOptionsTable).where(inArray(questionOptionsTable.questionId, contexts.map((context) => context.questionId))) : [];
  const outcomes = ids.length ? await db.select().from(questionOutcomesTable)
    .where(inArray(questionOutcomesTable.vaultQuestionId, ids)) : [];
  const verdicts = answers.length ? await db.select().from(answerVerdictsTable)
    .where(inArray(answerVerdictsTable.answerId, answers.map((a) => a.id))) : [];
  const slots = await db.select().from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vaultId)).orderBy(revealSlotsTable.displayOrder);
  return { vault, answers, contexts, options, outcomes, slots, verdictByAnswer: new Map(verdicts.map((v) => [v.answerId, v])) };
}
function questionDto(context: Context, answers: Unlocked[], options: Array<{ id: string; questionId: string; label: string }>, outcomes: Awaited<ReturnType<typeof reportData>>["outcomes"], verdicts: Map<string, { tier: "full" | "half" | "zero" }>) {
  const scoped = answers.filter((a) => a.vaultQuestionId === context.id);
  const questionOptions = options.filter((option) => option.questionId === context.questionId);
  const labelByOption = new Map(questionOptions.map((option) => [option.id, option.label]));
  const pairs = new Set(scoped.map((a) => `${a.vaultQuestionId}:${a.revealSlotId}`));
  const allowedOutcomes = outcomes.filter((o) => pairs.has(`${o.vaultQuestionId}:${o.revealSlotId}`));
  const resolvedPairs = new Set(allowedOutcomes.map((outcome) => `${outcome.vaultQuestionId}:${outcome.revealSlotId}`));
  const optionCounts = [...scoped.reduce((m, a) => {
    if (a.optionId) m.set(a.optionId, (m.get(a.optionId) ?? 0) + 1);
    return m;
  }, new Map<string, number>()).entries()].map(([optionId, count]) => ({ optionId, label: labelByOption.get(optionId)!, count }));
  return {
    vaultQuestionId: context.id, prompt: context.prompt, answerType: context.answerType, freeTextMode: context.freeTextMode,
    answers: scoped.map((a) => ({ answerId: a.id, guestId: a.guestId, guestDisplayName: a.guestDisplayName,
      textValue: a.textValue, numberValue: a.numberValue, optionId: a.optionId, optionLabel: a.optionId ? labelByOption.get(a.optionId) ?? null : null, revealSlotId: a.revealSlotId,
      outcomeTier: context.freeTextMode === "keepsake" ? null : (resolvedPairs.has(`${a.vaultQuestionId}:${a.revealSlotId}`) ? verdicts.get(a.id)?.tier ?? null : null) })),
    options: questionOptions.map(({ id, label }) => ({ id, label })), optionCounts,
    outcomes: allowedOutcomes.map((o) => ({ revealSlotId: o.revealSlotId, trueTextValue: o.trueTextValue,
      trueNumberValue: o.trueNumberValue, trueOptionId: o.trueOptionId, trueOptionLabel: o.trueOptionId ? labelByOption.get(o.trueOptionId) ?? null : null, operatorNote: o.operatorNote })),
  };
}
function assertPaid(planTier: string) {
  if (planTier === "lockbox") throw new ReportError("This report requires a paid vault plan.", 403);
}
function scoreable(data: Awaited<ReturnType<typeof reportData>>) {
  return data.answers.filter((answer) => data.contexts.find((question) => question.id === answer.vaultQuestionId)?.freeTextMode !== "keepsake");
}
function scoreboardFromData(data: Awaited<ReturnType<typeof reportData>>) {
  const rows = new Map<string, { guestId: string; displayName: string; full: number; half: number; zero: number }>();
  for (const answer of scoreable(data)) {
    const verdict = data.verdictByAnswer.get(answer.id);
    if (!verdict) continue;
    const row = rows.get(answer.guestId) ?? { guestId: answer.guestId, displayName: answer.guestDisplayName, full: 0, half: 0, zero: 0 };
    row[verdict.tier] += 1;
    rows.set(answer.guestId, row);
  }
  return [...rows.values()].map((row) => ({ ...row, total: row.full + row.half * .5 }))
    .sort((a, b) => b.total - a.total || a.displayName.localeCompare(b.displayName) || a.guestId.localeCompare(b.guestId));
}
function areasFromData(data: Awaited<ReturnType<typeof reportData>>) {
  return { areas: [...new Map(data.contexts.map((question) => [question.subcategoryId, question])).values()].map((area) => ({
    id: area.subcategoryId, name: area.subcategoryName, iconKey: area.iconKey,
    outcomes: counts(scoreable(data).filter((answer) => data.contexts.find((question) => question.id === answer.vaultQuestionId)?.subcategoryId === area.subcategoryId)
      .map((answer) => data.verdictByAnswer.get(answer.id)?.tier)),
  })) };
}
function timelineFromData(data: Awaited<ReturnType<typeof reportData>>) {
  return { reveals: data.slots.map((slot) => ({ revealSlotId: slot.id, label: slot.label, revealDate: slot.revealDate,
    outcomes: counts(scoreable(data).filter((answer) => answer.revealSlotId === slot.id).map((answer) => data.verdictByAnswer.get(answer.id)?.tier)),
  })) };
}

export async function getVaultHealthReport(vaultId: string, operatorId: string) {
  const vault = await owned(vaultId, operatorId);
  const [predictions] = await db.select({ value: count() }).from(answersTable)
    .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
  const [guests] = await db.select({ value: count() }).from(guestsTable).innerJoin(submissionsTable, eq(submissionsTable.guestId, guestsTable.id)).where(and(eq(guestsTable.vaultId, vaultId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
  const slots = await db.select({ id: revealSlotsTable.id, label: revealSlotsTable.label, revealDate: revealSlotsTable.revealDate })
    .from(revealSlotsTable).where(eq(revealSlotsTable.vaultId, vaultId)).orderBy(revealSlotsTable.displayOrder);
  const today = new Date().toISOString().slice(0, 10);
  const referralCount = vault.entitledPlanTier === "lockbox" ? null : Number((await db.select({ value: count() }).from(accountsTable).where(eq(accountsTable.referredByVaultId, vaultId)))[0]?.value ?? 0);
  return { vaultId, planTier: vault.entitledPlanTier, status: vault.status, predictionCount: Number(predictions.value),
    guestCount: Number(guests.value), revealSlots: slots, completedRevealCount: slots.filter((s) => s.revealDate <= today).length,
    nextRevealDate: slots.find((s) => s.revealDate > today)?.revealDate ?? null, referralCount };
}
export async function getQuestionReport(vaultId: string, operatorId: string, questionId: string) {
  const data = await reportData(vaultId, operatorId);
  const context = data.contexts.find((q) => q.id === questionId);
  if (!context) throw new ReportError("Unlocked question not found.");
  return questionDto(context, data.answers, data.options, data.outcomes, data.verdictByAnswer);
}
export async function getRevealReport(vaultId: string, operatorId: string, slotId: string) {
  const data = await reportData(vaultId, operatorId);
  const [slot] = await db.select({ id: revealSlotsTable.id, label: revealSlotsTable.label, revealDate: revealSlotsTable.revealDate })
    .from(revealSlotsTable).where(and(eq(revealSlotsTable.id, slotId), eq(revealSlotsTable.vaultId, vaultId))).limit(1);
  if (!slot) throw new ReportError("Reveal slot not found.");
  if (!data.answers.some((answer) => answer.revealSlotId === slotId)) throw new ReportError("No unlocked answers exist for this reveal slot.");
  return { revealSlotId: slot.id, label: slot.label, revealDate: slot.revealDate,
    questions: data.contexts.filter((q) => data.answers.some((a) => a.vaultQuestionId === q.id && a.revealSlotId === slotId))
      .map((q) => questionDto(q, data.answers.filter((a) => a.revealSlotId === slotId), data.options, data.outcomes, data.verdictByAnswer)) };
}
export async function getAreaReport(vaultId: string, operatorId: string) {
  const data = await reportData(vaultId, operatorId); assertPaid(data.vault.entitledPlanTier);
  return areasFromData(data);
}
export async function getTimelineReport(vaultId: string, operatorId: string) {
  const data = await reportData(vaultId, operatorId); assertPaid(data.vault.entitledPlanTier);
  return timelineFromData(data);
}
export async function getAnswersArchive(vaultId: string, operatorId: string) {
  const data = await reportData(vaultId, operatorId); assertPaid(data.vault.entitledPlanTier);
  return { questions: data.contexts.map((q) => questionDto(q, data.answers, data.options, data.outcomes, data.verdictByAnswer)) };
}
export async function getGuestPersonalReport(vaultId: string, operatorId: string, guestId: string) {
  const data = await reportData(vaultId, operatorId);
  // Eligibility checks email without ever selecting or returning the address.
  const [guest] = await db.select({ id: guestsTable.id, displayName: guestsTable.displayName }).from(guestsTable)
    .where(and(eq(guestsTable.id, guestId), eq(guestsTable.vaultId, vaultId), isNotNull(guestsTable.email))).limit(1);
  if (!guest) throw new ReportError("Guest personal report is unavailable.");
  const own = data.answers.filter((a) => a.guestId === guestId);
  const score = counts(own.filter((a) => data.contexts.find((q) => q.id === a.vaultQuestionId)?.freeTextMode !== "keepsake").map((a) => data.verdictByAnswer.get(a.id)?.tier));
  const scores = new Map<string, number>();
  for (const answer of data.answers) {
    if (data.contexts.find((q) => q.id === answer.vaultQuestionId)?.freeTextMode === "keepsake") continue;
    const verdict = data.verdictByAnswer.get(answer.id);
    if (!verdict) continue;
    scores.set(answer.guestId, (scores.get(answer.guestId) ?? 0) + ({ full: 1, half: .5, zero: 0 }[verdict.tier]));
  }
  const rank = score.scored ? [...scores.entries()].sort((a, b) => b[1] - a[1]).findIndex(([id]) => id === guestId) + 1 : null;
  return { guestId, displayName: guest.displayName, rank, guestCount: scores.size, score, answers: own.map((a) => ({ answerId: a.id, guestId: a.guestId,
    guestDisplayName: a.guestDisplayName, textValue: a.textValue, numberValue: a.numberValue, optionId: a.optionId,
    optionLabel: a.optionId ? data.options.find((option) => option.id === a.optionId)?.label ?? null : null,
    numberUnit: data.contexts.find((question) => question.id === a.vaultQuestionId)!.numberUnit,
    revealSlotId: a.revealSlotId, outcomeTier: data.contexts.find((question) => question.id === a.vaultQuestionId)!.freeTextMode === "keepsake" ? null : (outcomeForPair(data.outcomes, a.vaultQuestionId, a.revealSlotId) ? data.verdictByAnswer.get(a.id)?.tier ?? null : null),
    prompt: data.contexts.find((question) => question.id === a.vaultQuestionId)!.prompt,
    operatorNote: outcomeForPair(data.outcomes, a.vaultQuestionId, a.revealSlotId)?.operatorNote ?? null,
    freeTextMode: data.contexts.find((question) => question.id === a.vaultQuestionId)!.freeTextMode })) };
}
/** Email eligibility is intentionally derived from the same unlocked report DTO. */
export async function getGuestRevealReportEligibility(vaultId: string, operatorId: string, guestId: string, revealSlotId: string) {
  const report = await getGuestPersonalReport(vaultId, operatorId, guestId);
  const answers = report.answers.filter((answer) => answer.revealSlotId === revealSlotId);
  return {
    eligible: answers.length > 0 && answers.every((answer) => answer.freeTextMode === "keepsake" || answer.outcomeTier !== null),
    report,
    answers,
  };
}
export async function getVaultResultsSummary(vaultId: string, operatorId: string) {
  const data = await reportData(vaultId, operatorId);
  const scoreableAnswers = data.answers.filter((answer) => data.contexts.find((question) => question.id === answer.vaultQuestionId)?.freeTextMode !== "keepsake");
  const outcomes = counts(scoreableAnswers.map((a) => data.verdictByAnswer.get(a.id)?.tier));
  const outcomeByPair = new Map(data.outcomes.map((outcome) => [`${outcome.vaultQuestionId}:${outcome.revealSlotId}`, outcome]));
  const questions = data.contexts.map((question) => ({
    vaultQuestionId: question.id, prompt: question.prompt, answerType: question.answerType, freeTextMode: question.freeTextMode,
    outcomes: data.answers.filter((answer) => answer.vaultQuestionId === question.id)
      .map((answer) => outcomeByPair.get(`${answer.vaultQuestionId}:${answer.revealSlotId}`))
      .filter((outcome): outcome is NonNullable<typeof outcome> => Boolean(outcome))
      .filter((outcome, index, values) => values.findIndex((value) => value.revealSlotId === outcome.revealSlotId) === index)
      .map((outcome) => ({ revealSlotId: outcome.revealSlotId, operatorNote: outcome.operatorNote })),
  }));
  const standout = (tier: "full" | "zero") => {
    const answer = scoreableAnswers.find((item) => data.verdictByAnswer.get(item.id)?.tier === tier);
    if (!answer) return null;
    const question = data.contexts.find((item) => item.id === answer.vaultQuestionId);
    const outcome = outcomeByPair.get(`${answer.vaultQuestionId}:${answer.revealSlotId}`);
    return question && outcome ? { vaultQuestionId: question.id, prompt: question.prompt, outcomeTier: tier, operatorNote: outcome.operatorNote } : null;
  };
  const base = { vaultId, planTier: data.vault.entitledPlanTier, vault: { name: data.vault.name, subjectValues: data.vault.subjectValues,
    status: data.vault.status, sealedAt: data.vault.sealedAt?.toISOString() ?? null }, outcomes, questions,
    standouts: [standout("full"), standout("zero")].filter((item): item is NonNullable<typeof item> => Boolean(item)) };
  // Deliberately exact Lockbox payload: masthead metadata, outcome callouts,
  // outcome-tagged standouts/notes, and drill-in question metadata only.
  if (data.vault.entitledPlanTier === "lockbox") return { ...base, depth: "trimmed" as const };
  const [areas, timeline] = await Promise.all([getAreaReport(vaultId, operatorId), getTimelineReport(vaultId, operatorId)]);
  const { getOperatorScoreboard } = await import("./reveal-scoring");
  return { ...base, depth: "full" as const, areas: areas.areas, timeline: timeline.reveals,
    scoreboard: (await getOperatorScoreboard(vaultId, operatorId)).entries };
}
export async function getFinaleReport(vaultId: string, operatorId: string) {
  const data = await reportData(vaultId, operatorId); assertPaid(data.vault.entitledPlanTier);
  // The archive is constructed from this single unlocked data set; no raw answer
  // table reads are permitted for report content.
  const archive = { questions: data.contexts.map((question) => questionDto(question, data.answers, data.options, data.outcomes, data.verdictByAnswer)) };
  const scoreableAnswers = scoreable(data);
  const outcomeByPair = new Map(data.outcomes.map((outcome) => [`${outcome.vaultQuestionId}:${outcome.revealSlotId}`, outcome]));
  const standout = (tier: "full" | "zero") => {
    const answer = scoreableAnswers.find((item) => data.verdictByAnswer.get(item.id)?.tier === tier);
    if (!answer) return null;
    const question = data.contexts.find((item) => item.id === answer.vaultQuestionId);
    const outcome = outcomeByPair.get(`${answer.vaultQuestionId}:${answer.revealSlotId}`);
    return question && outcome ? { vaultQuestionId: question.id, prompt: question.prompt, outcomeTier: tier, operatorNote: outcome.operatorNote } : null;
  };
  const scoreboard = scoreboardFromData(data);
  const [allAnswers] = await db.select({ value: count() }).from(answersTable)
    .innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id))
    .where(and(eq(submissionsTable.vaultId, vaultId), isNull(submissionsTable.heldAt), isNull(submissionsTable.archivedAt), isNull(submissionsTable.culledAt)));
  // Compare answer metadata counts with the canonical unlocked-content read so
  // manual unlock overrides and scheduled unlocks use exactly the same boundary.
  const totalAnswerCount = Number(allAnswers.value);
  const allAnswersUnlocked = totalAnswerCount > 0 && totalAnswerCount === data.answers.length;
  const allResolved = scoreableAnswers.every((answer) => outcomeByPair.has(`${answer.vaultQuestionId}:${answer.revealSlotId}`));
  return { vaultId, planTier: data.vault.entitledPlanTier, outcomeCounts: counts(scoreableAnswers.map((answer) => data.verdictByAnswer.get(answer.id)?.tier)),
    certificate: data.vault.entitledPlanTier === "deep_vault", scoreboard, winner: scoreboard[0] ?? null,
    areas: areasFromData(data), timeline: timelineFromData(data),
    standouts: [standout("full"), standout("zero")].filter((item): item is NonNullable<typeof item> => Boolean(item)),
    guestCount: new Set(data.answers.map((answer) => answer.guestId)).size, predictionCount: data.answers.length,
    completionReady: allAnswersUnlocked && allResolved, ...archive };
}
/** Printable uses precisely the same paid, unlocked archive DTO; rendering is a client concern. */
export async function getPrintArchive(vaultId: string, operatorId: string) {
  return getFinaleReport(vaultId, operatorId);
}