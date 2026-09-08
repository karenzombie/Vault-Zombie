import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  questionOptionsTable,
  questionsTable,
  subcategoriesTable,
  vaultTypesTable,
} from "./schema/content";

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

function assertQuestionMetadata(question: QuestionBankImportQuestion): void {
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
  for (const subcategory of bank.subcategories) {
    for (const question of subcategory.questions) {
      assertQuestionMetadata(question);
    }
  }

  return db.transaction(async (tx) => {
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

        if (questionInput.options.length === 0) {
          continue;
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
  });
}
