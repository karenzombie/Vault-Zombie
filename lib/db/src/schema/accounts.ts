import { relations } from "drizzle-orm";
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { accountStatusEnum, adminRoleEnum } from "./enums";

export const accountsTable = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkSubject: text("clerk_subject"),
    role: adminRoleEnum("role").notNull().default("operator"),
    displayName: text("display_name").notNull(),
    email: text("email").notNull(),
    status: accountStatusEnum("status").notNull().default("active"),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("accounts_clerk_subject_unique").on(table.clerkSubject),
    index("accounts_email_idx").on(table.email),
  ],
);

export const accountRelations = relations(accountsTable, () => ({}));
export const insertAccountSchema = createInsertSchema(accountsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  anonymizedAt: true,
});
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;
