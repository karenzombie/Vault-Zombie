import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { answerTypeEnum, fitTagEnum, freeTextModeEnum } from "./enums";

export const vaultTypesTable = pgTable(
  "vault_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    requiredSubjectTokens: jsonb("required_subject_tokens")
      .$type<string[]>()
      .notNull(),
    displayOrder: integer("display_order").notNull(),
    isRetired: boolean("is_retired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("vault_types_slug_unique").on(table.slug),
    unique("vault_types_display_order_unique").on(table.displayOrder),
  ],
);

export const subcategoriesTable = pgTable(
  "subcategories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultTypeId: uuid("vault_type_id")
      .notNull()
      .references(() => vaultTypesTable.id),
    sourceKey: text("source_key").notNull(),
    name: text("name").notNull(),
    iconKey: text("icon_key").notNull().default("target"),
    displayOrder: integer("display_order").notNull(),
    isRetired: boolean("is_retired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("subcategories_source_key_unique").on(table.sourceKey),
    unique("subcategories_order_per_type_unique").on(
      table.vaultTypeId,
      table.displayOrder,
    ),
    index("subcategories_vault_type_idx").on(table.vaultTypeId),
  ],
);

export const questionsTable = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subcategoryId: uuid("subcategory_id")
      .notNull()
      .references(() => subcategoriesTable.id),
    sourceKey: text("source_key").notNull(),
    prompt: text("prompt").notNull(),
    answerType: answerTypeEnum("answer_type").notNull(),
    freeTextMode: freeTextModeEnum("free_text_mode"),
    numberUnit: text("number_unit"),
    numberMinimum: doublePrecision("number_minimum"),
    numberMaximum: doublePrecision("number_maximum"),
    numberCloseBand: doublePrecision("number_close_band"),
    fitTag: fitTagEnum("fit_tag"),
    displayOrder: integer("display_order").notNull(),
    isRetired: boolean("is_retired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("questions_source_key_unique").on(table.sourceKey),
    unique("questions_order_per_subcategory_unique").on(
      table.subcategoryId,
      table.displayOrder,
    ),
    index("questions_subcategory_idx").on(table.subcategoryId),
    check(
      "questions_required_metadata_check",
      sql`(
        (${table.answerType} = 'free_text' AND ${table.freeTextMode} IS NOT NULL
          AND ${table.numberUnit} IS NULL AND ${table.numberMinimum} IS NULL
          AND ${table.numberMaximum} IS NULL AND ${table.numberCloseBand} IS NULL)
        OR
        (${table.answerType} = 'number' AND ${table.freeTextMode} IS NULL
          AND ${table.numberUnit} IS NOT NULL AND ${table.numberMinimum} IS NOT NULL
          AND ${table.numberMaximum} IS NOT NULL AND ${table.numberCloseBand} IS NOT NULL
          AND ${table.numberMaximum} > ${table.numberMinimum}
          AND ${table.numberCloseBand} >= 0)
        OR
        (${table.answerType} IN ('multiple_choice', 'name_pick')
          AND ${table.freeTextMode} IS NULL AND ${table.numberUnit} IS NULL
          AND ${table.numberMinimum} IS NULL AND ${table.numberMaximum} IS NULL
          AND ${table.numberCloseBand} IS NULL)
      )`,
    ),
  ],
);

export const questionOptionsTable = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionsTable.id, { onDelete: "cascade" }),
    sourcePosition: integer("source_position").notNull(),
    label: text("label").notNull(),
    displayOrder: integer("display_order").notNull(),
    isRetired: boolean("is_retired").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique("question_options_source_position_unique").on(
      table.questionId,
      table.sourcePosition,
    ),
    index("question_options_question_idx").on(table.questionId),
  ],
);

export const vaultTypeRelations = relations(vaultTypesTable, ({ many }) => ({
  subcategories: many(subcategoriesTable),
}));
export const subcategoryRelations = relations(
  subcategoriesTable,
  ({ one, many }) => ({
    vaultType: one(vaultTypesTable, {
      fields: [subcategoriesTable.vaultTypeId],
      references: [vaultTypesTable.id],
    }),
    questions: many(questionsTable),
  }),
);
export const questionRelations = relations(
  questionsTable,
  ({ one, many }) => ({
    subcategory: one(subcategoriesTable, {
      fields: [questionsTable.subcategoryId],
      references: [subcategoriesTable.id],
    }),
    options: many(questionOptionsTable),
  }),
);
export const questionOptionRelations = relations(
  questionOptionsTable,
  ({ one }) => ({
    question: one(questionsTable, {
      fields: [questionOptionsTable.questionId],
      references: [questionsTable.id],
    }),
  }),
);

export const insertVaultTypeSchema = createInsertSchema(vaultTypesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertSubcategorySchema = createInsertSchema(
  subcategoriesTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertQuestionSchema = createInsertSchema(questionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertQuestionOptionSchema = createInsertSchema(
  questionOptionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type VaultType = typeof vaultTypesTable.$inferSelect;
export type Subcategory = typeof subcategoriesTable.$inferSelect;
export type Question = typeof questionsTable.$inferSelect;
export type QuestionOption = typeof questionOptionsTable.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
