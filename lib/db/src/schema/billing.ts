import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { billingStatusEnum, planTierEnum } from "./enums";
import { vaultsTable } from "./vaults";

export const billingRecordsTable = pgTable(
  "billing_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id").notNull().references(() => vaultsTable.id),
    operatorId: uuid("operator_id").notNull().references(() => accountsTable.id),
    fromTier: planTierEnum("from_tier").notNull(),
    targetTier: planTierEnum("target_tier").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: billingStatusEnum("status").notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("billing_records_checkout_session_unique").on(table.stripeCheckoutSessionId),
    uniqueIndex("billing_records_one_pending_vault_unique")
      .on(table.vaultId)
      .where(sql`${table.status} = 'pending'`),
    index("billing_records_vault_idx").on(table.vaultId),
    index("billing_records_operator_idx").on(table.operatorId),
    index("billing_records_status_idx").on(table.status),
  ],
);

export const stripeWebhookEventsTable = pgTable(
  "stripe_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stripeEventId: text("stripe_event_id").notNull(),
    eventType: text("event_type").notNull(),
    billingRecordId: uuid("billing_record_id").references(() => billingRecordsTable.id),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("stripe_webhook_events_event_unique").on(table.stripeEventId),
    index("stripe_webhook_events_billing_idx").on(table.billingRecordId),
  ],
);

export const billingRecordRelations = relations(billingRecordsTable, ({ one, many }) => ({
  vault: one(vaultsTable, { fields: [billingRecordsTable.vaultId], references: [vaultsTable.id] }),
  operator: one(accountsTable, { fields: [billingRecordsTable.operatorId], references: [accountsTable.id] }),
  webhookEvents: many(stripeWebhookEventsTable),
}));

export const stripeWebhookEventRelations = relations(stripeWebhookEventsTable, ({ one }) => ({
  billingRecord: one(billingRecordsTable, {
    fields: [stripeWebhookEventsTable.billingRecordId],
    references: [billingRecordsTable.id],
  }),
}));

export const insertBillingRecordSchema = createInsertSchema(billingRecordsTable).omit({
  id: true, createdAt: true, updatedAt: true,
});
export const insertStripeWebhookEventSchema = createInsertSchema(stripeWebhookEventsTable).omit({
  id: true, receivedAt: true,
});
export type BillingRecord = typeof billingRecordsTable.$inferSelect;
export type InsertBillingRecord = z.infer<typeof insertBillingRecordSchema>;