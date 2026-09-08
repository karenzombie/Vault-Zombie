import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountsTable } from "./accounts";
import { auditActionEnum } from "./enums";

/**
 * Append-only by contract: no update/delete data-access functions are exposed.
 * actorAccountId remains valid after account anonymization.
 */
export const auditEventsTable = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorAccountId: uuid("actor_account_id")
      .notNull()
      .references(() => accountsTable.id),
    action: auditActionEnum("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: uuid("target_id").notNull(),
    reason: text("reason").notNull(),
    details: jsonb("details")
      .$type<Record<string, string | number | boolean | null>>()
      .notNull()
      .default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("audit_events_actor_idx").on(table.actorAccountId),
    index("audit_events_target_idx").on(table.targetType, table.targetId),
    index("audit_events_occurred_idx").on(table.occurredAt),
    uniqueIndex("audit_events_one_completed_refund_target_unique")
      .on(table.targetType, table.targetId)
      .where(sql`${table.action} = 'refund'`),
    uniqueIndex("audit_events_one_backup_push_target_unique")
      .on(table.targetType, table.targetId)
      .where(sql`${table.action} = 'backup_push'`),
  ],
);

export const insertAuditEventSchema = createInsertSchema(
  auditEventsTable,
).omit({ id: true, occurredAt: true });
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEvent = typeof auditEventsTable.$inferSelect;
