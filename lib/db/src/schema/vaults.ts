import { isNotNull, relations } from "drizzle-orm";
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
  freeTextModeEnum,
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
    revealSchedule: revealScheduleEnum("reveal_schedule"),
    guestLayout: guestLayoutEnum("guest_layout")
      .notNull()
      .default("one_at_a_time"),
    anchorDate: date("anchor_date", { mode: "string" }),
    milestoneDate: date("milestone_date", { mode: "string" }),
    milestoneLabel: text("milestone_label"),
    // The host-chosen IANA zone identifier from VAULT_TIMEZONES (see ../timezone.ts).
    // Nullable until the host picks one; required before sealing and immutable after
    // (VaultZombie-Build-Brief-Addendum-2-v1.md, section 7).
    timeZone: text("time_zone"),
    sealedAt: timestamp("sealed_at", { withTimezone: true }),
    coverObjectKey: text("cover_object_key"),
    guestToken: text("guest_token").notNull(),
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
    questionId: uuid("question_id").references(() => questionsTable.id),
    promptSnapshot: text("prompt_snapshot").notNull(),
    /**
     * Only set for a custom prompt (isCustom = true). A bank prompt's scoreable/keepsake
     * mark lives on questionsTable.freeTextMode instead; null here for bank prompts.
     */
    customFreeTextMode: freeTextModeEnum("custom_free_text_mode"),
    enabled: boolean("enabled").notNull().default(true),
    displayOrder: integer("display_order").notNull(),
    isCustom: boolean("is_custom").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Partial: only applies when questionId is set (a bank prompt), so a vault can
    // never carry the same bank question twice, while many custom prompts (questionId
    // null) are always allowed on one vault.
    uniqueIndex("vault_questions_question_unique")
      .on(table.vaultId, table.questionId)
      .where(isNotNull(table.questionId)),
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
    /**
     * Null = never manually opened early (normal schedule). Set to true/false when an
     * admin manual-unlock opens this reveal before its natural date, per the admin's
     * "send emails" checkbox (spec 5.1). Governs H5/G2/H6 eligibility for this reveal
     * only while it is still ahead of its natural revealDate; once revealDate arrives
     * naturally, the reveal is eligible regardless of this flag.
     */
    manualUnlockEmailsEnabled: boolean("manual_unlock_emails_enabled"),
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
