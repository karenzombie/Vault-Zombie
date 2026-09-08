import { relations } from "drizzle-orm";
import {
  boolean,
  date,
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
import { accountsTable } from "./accounts";
import { questionsTable, vaultTypesTable } from "./content";
import {
  guestLayoutEnum,
  planTierEnum,
  revealScheduleEnum,
  revealSlotKindEnum,
  vaultStatusEnum,
} from "./enums";

export const vaultsTable = pgTable(
  "vaults",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    operatorId: uuid("operator_id")
      .notNull()
      .references(() => accountsTable.id),
    vaultTypeId: uuid("vault_type_id")
      .notNull()
      .references(() => vaultTypesTable.id),
    name: text("name").notNull(),
    subjectValues: jsonb("subject_values")
      .$type<Record<string, string>>()
      .notNull(),
    status: vaultStatusEnum("status").notNull().default("draft"),
    planTier: planTierEnum("plan_tier").notNull(),
    entitledPlanTier: planTierEnum("entitled_plan_tier")
      .notNull()
      .default("lockbox"),
    revealSchedule: revealScheduleEnum("reveal_schedule").notNull(),
    guestLayout: guestLayoutEnum("guest_layout")
      .notNull()
      .default("one_at_a_time"),
    anchorDate: date("anchor_date", { mode: "string" }),
    milestoneDate: date("milestone_date", { mode: "string" }),
    milestoneLabel: text("milestone_label"),
    sealedAt: timestamp("sealed_at", { withTimezone: true }),
    coverObjectKey: text("cover_object_key"),
    guestTokenHash: text("guest_token_hash").notNull(),
    referrerCode: text("referrer_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("vaults_guest_token_hash_unique").on(table.guestTokenHash),
    uniqueIndex("vaults_referrer_code_unique").on(table.referrerCode),
    index("vaults_operator_idx").on(table.operatorId),
    index("vaults_status_idx").on(table.status),
  ],
);

export const vaultQuestionsTable = pgTable(
  "vault_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaultsTable.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questionsTable.id),
    promptSnapshot: text("prompt_snapshot").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    displayOrder: integer("display_order").notNull(),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("vault_questions_question_unique").on(
      table.vaultId,
      table.questionId,
    ),
    unique("vault_questions_order_unique").on(
      table.vaultId,
      table.displayOrder,
    ),
  ],
);

export const revealSlotsTable = pgTable(
  "reveal_slots",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id")
      .notNull()
      .references(() => vaultsTable.id, { onDelete: "cascade" }),
    kind: revealSlotKindEnum("kind").notNull().default("scheduled"),
    label: text("label").notNull(),
    revealDate: date("reveal_date", { mode: "string" }).notNull(),
    displayOrder: integer("display_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("reveal_slots_date_unique").on(table.vaultId, table.revealDate),
    unique("reveal_slots_order_unique").on(table.vaultId, table.displayOrder),
    index("reveal_slots_vault_idx").on(table.vaultId),
  ],
);

export const vaultRelations = relations(vaultsTable, ({ one, many }) => ({
  operator: one(accountsTable, {
    fields: [vaultsTable.operatorId],
    references: [accountsTable.id],
  }),
  vaultType: one(vaultTypesTable, {
    fields: [vaultsTable.vaultTypeId],
    references: [vaultTypesTable.id],
  }),
  questions: many(vaultQuestionsTable),
  revealSlots: many(revealSlotsTable),
}));

export const insertVaultSchema = createInsertSchema(vaultsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sealedAt: true,
});
export const insertVaultQuestionSchema = createInsertSchema(
  vaultQuestionsTable,
).omit({ id: true, createdAt: true });
export const insertRevealSlotSchema = createInsertSchema(
  revealSlotsTable,
).omit({ id: true, createdAt: true });
export type Vault = typeof vaultsTable.$inferSelect;
export type RevealSlot = typeof revealSlotsTable.$inferSelect;
export type InsertVault = z.infer<typeof insertVaultSchema>;
