import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  questionOptionsTable,
  questionsTable,
  subcategoriesTable,
  vaultTypesTable,
} from "./schema/content";
import type { SensitiveActionTransaction } from "./sensitive-action";

export interface QuestionBankImportQuestion {
  sourceKey: string;
  prompt: string;
  answerType: "free_text" | "number" | "multiple_choice" | "name_pick";
  freeTextMode?: "scoreable" | "keepsake";
  number?: {
    unit: string;
    minimum: number;
    maximum: number;
    closeBand: number;
  };
  fitTag?: "short" | "long";
  displayOrder: number;
  options: string[];
}

export interface QuestionBankImportSubcategory {
  sourceKey: string;
  name: string;
  displayOrder: number;
  iconKey?: string;
  questions: QuestionBankImportQuestion[];
}

export interface QuestionBankImport {
  vaultType: {
    slug: string;
    name: string;
    requiredSubjectTokens: string[];
    displayOrder: number;
  };
  subcategories: QuestionBankImportSubcategory[];
}

export interface ContentImportIssue {
  path: string;
  message: string;
}

export function validateQuestionBank(bank: QuestionBankImport): ContentImportIssue[] {
  const issues: ContentImportIssue[] = [];
  const add = (path: string, message: string) => issues.push({ path, message });
  if (!bank || typeof bank !== "object") return [{ path: "bank", message: "A question bank object is required." }];
  if (!bank.vaultType?.slug?.trim()) add("vaultType.slug", "A non-empty slug is required.");
  if (!bank.vaultType?.name?.trim()) add("vaultType.name", "A non-empty name is required.");
  if (!Array.isArray(bank.vaultType?.requiredSubjectTokens) || bank.vaultType.requiredSubjectTokens.some((token) => !token.trim())) add("vaultType.requiredSubjectTokens", "Subject tokens must be non-empty strings.");
  if (!Number.isInteger(bank.vaultType?.displayOrder)) add("vaultType.displayOrder", "Display order must be an integer.");
  const seenSubcategories = new Set<string>();
  const seenSubcategoryOrders = new Set<number>();
  const seenQuestions = new Set<string>();
  const subcategoryInputs = Array.isArray(bank.subcategories) ? bank.subcategories : [];
  for (const [subcategoryIndex, subcategory] of subcategoryInputs.entries()) {
    const path = `subcategories[${subcategoryIndex}]`;
    if (!subcategory || typeof subcategory !== "object") { add(path, "Subcategory must be an object."); continue; }
    if (!subcategory.sourceKey?.trim()) add(`${path}.sourceKey`, "A stable source key is required.");
    else if (seenSubcategories.has(subcategory.sourceKey)) add(`${path}.sourceKey`, "Source keys must be unique.");
    else seenSubcategories.add(subcategory.sourceKey);
    if (!subcategory.name?.trim()) add(`${path}.name`, "A non-empty name is required.");
    if (!Number.isInteger(subcategory.displayOrder)) add(`${path}.displayOrder`, "Display order must be an integer.");
    else if (seenSubcategoryOrders.has(subcategory.displayOrder)) add(`${path}.displayOrder`, "Display order must be unique within the vault type.");
    else seenSubcategoryOrders.add(subcategory.displayOrder);
    const seenQuestionOrders = new Set<number>();
    const questionInputs = Array.isArray(subcategory.questions) ? subcategory.questions : [];
    if (!Array.isArray(subcategory.questions)) add(`${path}.questions`, "Questions must be an array.");
    for (const [questionIndex, question] of questionInputs.entries()) {
      const questionPath = `${path}.questions[${questionIndex}]`;
      if (!question || typeof question !== "object") { add(questionPath, "Question must be an object."); continue; }
      if (!question.sourceKey?.trim()) add(`${questionPath}.sourceKey`, "A stable source key is required.");
      else if (seenQuestions.has(question.sourceKey)) add(`${questionPath}.sourceKey`, "Source keys must be unique.");
      else seenQuestions.add(question.sourceKey);
      if (!question.prompt?.trim()) add(`${questionPath}.prompt`, "A non-empty prompt is required.");
      if (!Number.isInteger(question.displayOrder)) add(`${questionPath}.displayOrder`, "Display order must be an integer.");
      else if (seenQuestionOrders.has(question.displayOrder)) add(`${questionPath}.displayOrder`, "Display order must be unique within the subcategory.");
      else seenQuestionOrders.add(question.displayOrder);
      try { assertQuestionMetadata(question); } catch (error) { add(questionPath, error instanceof Error ? error.message : "Invalid question metadata."); }
      if (!Array.isArray(question.options) || question.options.some((option) => !option.trim())) add(`${questionPath}.options`, "Options must be non-empty strings.");
    }
  }
  if (!Array.isArray(bank.subcategories) || bank.subcategories.length === 0) add("subcategories", "At least one subcategory is required.");
  return issues;
}

export function assertQuestionMetadata(question: QuestionBankImportQuestion): void {
  if (question.answerType === "number") {
    if (
      !question.number ||
      !question.number.unit.trim() ||
      question.number.maximum <= question.number.minimum ||
      question.number.closeBand < 0
    ) {
      throw new Error(`${question.sourceKey}: incomplete number metadata`);
    }
  } else if (question.number) {
    throw new Error(`${question.sourceKey}: number metadata on non-number question`);
  }

  if (question.answerType === "free_text") {
    if (!question.freeTextMode) {
      throw new Error(
        `${question.sourceKey}: missing scoreable/keepsake classification`,
      );
    }
  } else if (question.freeTextMode) {
    throw new Error(
      `${question.sourceKey}: free-text classification on non-free-text question`,
    );
  }

  const isChoice =
    question.answerType === "multiple_choice" ||
    question.answerType === "name_pick";
  if (isChoice && question.options.length < 2) {
    throw new Error(`${question.sourceKey}: choice question needs two options`);
  }
  if (!isChoice && question.options.length > 0) {
    throw new Error(`${question.sourceKey}: options on non-choice question`);
  }
}

/**
 * Idempotently imports one complete bank.
 *
 * Stable source keys locate existing records, so re-imports update wording and
 * display order without replacing permanent question or option UUIDs.
 */
export async function importQuestionBank(bank: QuestionBankImport) {
  return db.transaction((tx) => applyQuestionBank(tx, bank));
}

/** Applies a fully validated bank using the caller's transaction. */
export async function applyQuestionBank(
  tx: SensitiveActionTransaction,
  bank: QuestionBankImport,
) {
  const issues = validateQuestionBank(bank);
  if (issues.length) throw new Error(`Question bank has ${issues.length} unresolved validation issue(s).`);
    const [vaultType] = await tx
      .insert(vaultTypesTable)
      .values({
        slug: bank.vaultType.slug,
        name: bank.vaultType.name,
        requiredSubjectTokens: bank.vaultType.requiredSubjectTokens,
        displayOrder: bank.vaultType.displayOrder,
      })
      .onConflictDoUpdate({
        target: vaultTypesTable.slug,
        set: {
          name: bank.vaultType.name,
          requiredSubjectTokens: bank.vaultType.requiredSubjectTokens,
          displayOrder: bank.vaultType.displayOrder,
          isRetired: false,
        },
      })
      .returning();

    let questionCount = 0;
    let optionCount = 0;

    for (const subcategoryInput of bank.subcategories) {
      const [subcategory] = await tx
        .insert(subcategoriesTable)
        .values({
          vaultTypeId: vaultType.id,
          sourceKey: subcategoryInput.sourceKey,
          name: subcategoryInput.name,
          displayOrder: subcategoryInput.displayOrder,
          iconKey: subcategoryInput.iconKey ?? "target",
        })
        .onConflictDoUpdate({
          target: subcategoriesTable.sourceKey,
          set: {
            name: subcategoryInput.name,
            displayOrder: subcategoryInput.displayOrder,
            iconKey: subcategoryInput.iconKey ?? "target",
            isRetired: false,
          },
        })
        .returning();

      for (const questionInput of subcategoryInput.questions) {
        const [question] = await tx
          .insert(questionsTable)
          .values({
            subcategoryId: subcategory.id,
            sourceKey: questionInput.sourceKey,
            prompt: questionInput.prompt,
            answerType: questionInput.answerType,
            freeTextMode: questionInput.freeTextMode,
            numberUnit: questionInput.number?.unit,
            numberMinimum: questionInput.number?.minimum,
            numberMaximum: questionInput.number?.maximum,
            numberCloseBand: questionInput.number?.closeBand,
            fitTag: questionInput.fitTag,
            displayOrder: questionInput.displayOrder,
          })
          .onConflictDoUpdate({
            target: questionsTable.sourceKey,
            set: {
              subcategoryId: subcategory.id,
              prompt: questionInput.prompt,
              answerType: questionInput.answerType,
              freeTextMode: questionInput.freeTextMode ?? null,
              numberUnit: questionInput.number?.unit ?? null,
              numberMinimum: questionInput.number?.minimum ?? null,
              numberMaximum: questionInput.number?.maximum ?? null,
              numberCloseBand: questionInput.number?.closeBand ?? null,
              fitTag: questionInput.fitTag ?? null,
              displayOrder: questionInput.displayOrder,
              isRetired: false,
            },
          })
          .returning();
        questionCount += 1;

        for (const [position, label] of questionInput.options.entries()) {
          await tx
            .insert(questionOptionsTable)
            .values({
              questionId: question.id,
              sourcePosition: position,
              label,
              displayOrder: position,
            })
            .onConflictDoUpdate({
              target: [
                questionOptionsTable.questionId,
                questionOptionsTable.sourcePosition,
              ],
              set: { label, displayOrder: position, isRetired: false },
            });
          optionCount += 1;
        }

        const existingOptions = await tx
          .select({
            id: questionOptionsTable.id,
            sourcePosition: questionOptionsTable.sourcePosition,
          })
          .from(questionOptionsTable)
          .where(eq(questionOptionsTable.questionId, question.id));
        for (const existing of existingOptions) {
          if (existing.sourcePosition >= questionInput.options.length) {
            await tx
              .update(questionOptionsTable)
              .set({ isRetired: true })
              .where(eq(questionOptionsTable.id, existing.id));
          }
        }
      }
    }

    return {
      vaultTypeId: vaultType.id,
      subcategoryCount: bank.subcategories.length,
      questionCount,
      optionCount,
    };
}
