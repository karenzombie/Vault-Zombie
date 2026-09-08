import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
  doublePrecision,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { answerTypeEnum, verdictTierEnum } from "./enums";
import { questionOptionsTable } from "./content";
import {
  revealSlotsTable,
  vaultQuestionsTable,
  vaultsTable,
} from "./vaults";

export const guestsTable = pgTable(
  "guests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaultsTable.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    email: text("email"),
    emailOptedOut: boolean("email_opted_out").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("guests_vault_idx").on(table.vaultId)],
);

export const submissionsTable = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaultsTable.id, { onDelete: "cascade" }),
    guestId: uuid("guest_id")
      .notNull()
      .references(() => guestsTable.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("submissions_vault_idx").on(table.vaultId),
    index("submissions_guest_idx").on(table.guestId),
  ],
);

/**
 * Internal write model. Product code must read prediction content through
 * readUnlockedAnswers() in sealed-content.ts.
 */
export const answersTable = pgTable(
  "answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissionsTable.id, { onDelete: "cascade" }),
    vaultQuestionId: uuid("vault_question_id")
      .notNull()
      .references(() => vaultQuestionsTable.id, { onDelete: "cascade" }),
    revealSlotId: uuid("reveal_slot_id")
      .notNull()
      .references(() => revealSlotsTable.id),
    answerType: answerTypeEnum("answer_type").notNull(),
    textValue: varchar("text_value", { length: 140 }),
    numberValue: doublePrecision("number_value"),
    optionId: uuid("option_id").references(() => questionOptionsTable.id),
    unlockAt: timestamp("unlock_at", { withTimezone: true }).notNull(),
    unlockOverrideAt: timestamp("unlock_override_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("answers_one_per_submission_question_unique").on(
      table.submissionId,
      table.vaultQuestionId,
    ),
    index("answers_unlock_idx").on(table.unlockAt),
    index("answers_override_idx").on(table.unlockOverrideAt),
    index("answers_question_idx").on(table.vaultQuestionId),
    check(
      "answers_value_matches_type_check",
      sql`(
        (${table.answerType} = 'free_text' AND ${table.textValue} IS NOT NULL
          AND ${table.numberValue} IS NULL AND ${table.optionId} IS NULL)
        OR
        (${table.answerType} = 'number' AND ${table.textValue} IS NULL
          AND ${table.numberValue} IS NOT NULL AND ${table.optionId} IS NULL)
        OR
        (${table.answerType} IN ('multiple_choice', 'name_pick')
          AND ${table.textValue} IS NULL AND ${table.numberValue} IS NULL
          AND ${table.optionId} IS NOT NULL)
      )`,
    ),
  ],
);

export const questionOutcomesTable = pgTable(
  "question_outcomes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultQuestionId: uuid("vault_question_id")
      .notNull()
      .references(() => vaultQuestionsTable.id, { onDelete: "cascade" }),
    revealSlotId: uuid("reveal_slot_id")
      .notNull()
      .references(() => revealSlotsTable.id),
    trueTextValue: varchar("true_text_value", { length: 140 }),
    trueNumberValue: doublePrecision("true_number_value"),
    trueOptionId: uuid("true_option_id").references(
      () => questionOptionsTable.id,
    ),
    operatorNote: varchar("operator_note", { length: 140 }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("question_outcomes_question_slot_unique").on(
      table.vaultQuestionId,
      table.revealSlotId,
    ),
  ],
);

export const answerVerdictsTable = pgTable(
  "answer_verdicts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    answerId: uuid("answer_id")
      .notNull()
      .references(() => answersTable.id, { onDelete: "cascade" }),
    questionOutcomeId: uuid("question_outcome_id")
      .notNull()
      .references(() => questionOutcomesTable.id, { onDelete: "cascade" }),
    tier: verdictTierEnum("tier").notNull(),
    wasOverridden: boolean("was_overridden").notNull().default(false),
    clusterKey: text("cluster_key"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("answer_verdicts_answer_unique").on(table.answerId),
    index("answer_verdicts_outcome_idx").on(table.questionOutcomeId),
  ],
);

export const guestRelations = relations(guestsTable, ({ one, many }) => ({
  vault: one(vaultsTable, {
    fields: [guestsTable.vaultId],
    references: [vaultsTable.id],
  }),
  submissions: many(submissionsTable),
}));
export const submissionRelations = relations(
  submissionsTable,
  ({ one, many }) => ({
    vault: one(vaultsTable, {
      fields: [submissionsTable.vaultId],
      references: [vaultsTable.id],
    }),
    guest: one(guestsTable, {
      fields: [submissionsTable.guestId],
      references: [guestsTable.id],
    }),
    answers: many(answersTable),
  }),
);

export const insertGuestSchema = createInsertSchema(guestsTable).omit({
  id: true,
  createdAt: true,
});
export const insertSubmissionSchema = createInsertSchema(
  submissionsTable,
).omit({ id: true, submittedAt: true });
export const insertAnswerSchema = createInsertSchema(answersTable).omit({
  id: true,
  createdAt: true,
  unlockOverrideAt: true,
});
export const insertQuestionOutcomeSchema = createInsertSchema(
  questionOutcomesTable,
).omit({ id: true, createdAt: true });
export type Guest = typeof guestsTable.$inferSelect;
export type Answer = typeof answersTable.$inferSelect;
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
