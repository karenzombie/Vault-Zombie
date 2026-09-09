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
import { billingStatusEnum, giftStatusEnum, overageOutcomeEnum, planTierEnum } from "./enums";
import { vaultsTable } from "./vaults";

export const billingRecordsTable = pgTable(
  "billing_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vaultId: uuid("vault_id").references(() => vaultsTable.id),
    operatorId: uuid("operator_id").references(() => accountsTable.id),
    fromTier: planTierEnum("from_tier").notNull(),
    targetTier: planTierEnum("target_tier").notNull(),
    amountCents: integer("amount_cents").notNull(),
    currency: text("currency").notNull().default("usd"),
    status: billingStatusEnum("status").notNull().default("pending"),
    stripeCheckoutSessionId: text("stripe_checkout_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    stripeChargeId: text("stripe_charge_id"),
    stripeRefundId: text("stripe_refund_id"),
    appliedAt: timestamp("applied_at", { withTimezone: true }),
    source: text("source").notNull().default("stripe"),
    giftCode: text("gift_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("billing_records_checkout_session_unique").on(table.stripeCheckoutSessionId),
    uniqueIndex("billing_records_refund_unique").on(table.stripeRefundId),
    uniqueIndex("billing_records_one_pending_vault_unique")
      .on(table.vaultId)
      .where(sql`${table.status} = 'pending' and ${table.vaultId} is not null`),
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

/** Durable boundary between a fresh-MFA refund request and Stripe reconciliation. */
export const refundAttemptsTable = pgTable("refund_attempts", {
  id: uuid("id").primaryKey(),
  targetType: text("target_type").notNull(),
  billingRecordId: uuid("billing_record_id").references(() => billingRecordsTable.id),
  giftId: uuid("gift_id").references(() => giftsTable.id),
  actorAccountId: uuid("actor_account_id").notNull().references(() => accountsTable.id),
  reason: text("reason").notNull(),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull().default("pending"),
  stripeRefundId: text("stripe_refund_id"),
  stripeStatus: text("stripe_status"),
  lastError: text("last_error"),
  attemptedAt: timestamp("attempted_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("refund_attempts_idempotency_unique").on(table.idempotencyKey),
  uniqueIndex("refund_attempts_billing_unresolved_unique")
    .on(table.billingRecordId)
    .where(sql`${table.status} in ('reserved', 'stripe_pending', 'unknown', 'stripe_succeeded') and ${table.billingRecordId} is not null`),
  uniqueIndex("refund_attempts_gift_unresolved_unique")
    .on(table.giftId)
    .where(sql`${table.status} in ('reserved', 'stripe_pending', 'unknown', 'stripe_succeeded') and ${table.giftId} is not null`),
  index("refund_attempts_status_idx").on(table.status),
]);

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

export const giftsTable = pgTable("gifts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  targetTier: planTierEnum("target_tier").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("usd"),
  status: giftStatusEnum("status").notNull().default("pending"),
  fromLine: text("from_line"),
  toLine: text("to_line"),
  gifterEmail: text("gifter_email"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeChargeId: text("stripe_charge_id"),
  stripeRefundId: text("stripe_refund_id"),
  redeemedVaultId: uuid("redeemed_vault_id").references(() => vaultsTable.id),
  redeemedBillingRecordId: uuid("redeemed_billing_record_id").references(() => billingRecordsTable.id),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("gifts_code_unique").on(table.code),
  uniqueIndex("gifts_checkout_unique").on(table.stripeCheckoutSessionId),
  uniqueIndex("gifts_refund_unique").on(table.stripeRefundId),
  index("gifts_status_idx").on(table.status),
]);

export const overageEventsTable = pgTable("overage_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  vaultId: uuid("vault_id").notNull().references(() => vaultsTable.id, { onDelete: "cascade" }),
  guestCap: integer("guest_cap").notNull(),
  submissionCount: integer("submission_count").notNull(),
  outcome: overageOutcomeEnum("outcome"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("overage_events_vault_idx").on(table.vaultId)]);
export const insertStripeWebhookEventSchema = createInsertSchema(stripeWebhookEventsTable).omit({
  id: true, receivedAt: true,
});
export type BillingRecord = typeof billingRecordsTable.$inferSelect;
export type InsertBillingRecord = z.infer<typeof insertBillingRecordSchema>;