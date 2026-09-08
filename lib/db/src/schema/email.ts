import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { guestsTable } from "./predictions";
import { revealSlotsTable, vaultsTable } from "./vaults";
import { giftsTable } from "./billing";

/** Durable, provider-independent email outbox. Payloads intentionally contain no sealed answer content. */
export const emailDeliveriesTable = pgTable("email_deliveries", {
  id: uuid("id").primaryKey().defaultRandom(),
  dedupeKey: text("dedupe_key").notNull(),
  eventType: text("event_type").notNull(),
  recipientEmail: text("recipient_email").notNull(),
  recipientGuestId: uuid("recipient_guest_id").references(() => guestsTable.id, { onDelete: "cascade" }),
  vaultId: uuid("vault_id").references(() => vaultsTable.id, { onDelete: "cascade" }),
  revealSlotId: uuid("reveal_slot_id").references(() => revealSlotsTable.id, { onDelete: "cascade" }),
  giftId: uuid("gift_id").references(() => giftsTable.id, { onDelete: "cascade" }),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  providerId: text("provider_id"),
  lastError: text("last_error"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }),
  claimToken: uuid("claim_token"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  uniqueIndex("email_deliveries_dedupe_unique").on(table.dedupeKey),
  index("email_deliveries_status_idx").on(table.status, table.createdAt),
  index("email_deliveries_guest_idx").on(table.recipientGuestId),
  index("email_deliveries_reveal_idx").on(table.revealSlotId),
  index("email_deliveries_gift_idx").on(table.giftId, table.createdAt),
]);

export const insertEmailDeliverySchema = createInsertSchema(emailDeliveriesTable).omit({
  id: true, attempts: true, providerId: true, lastError: true, claimedAt: true, claimToken: true, sentAt: true, createdAt: true, updatedAt: true,
});
export type EmailDelivery = typeof emailDeliveriesTable.$inferSelect;
export type InsertEmailDelivery = z.infer<typeof insertEmailDeliverySchema>;