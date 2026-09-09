import { uniqueIndex, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

/** Immutable evidence of a local account's acceptance of a specific legal set. */
export const legalConsentsTable = pgTable(
  "legal_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id").notNull().references(() => accountsTable.id),
    termsVersion: text("terms_version").notNull(),
    privacyVersion: text("privacy_version").notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull().defaultNow(),
    clerkAcceptedAt: timestamp("clerk_accepted_at", { withTimezone: true }),
    clerkAcceptanceSource: text("clerk_acceptance_source"),
  },
  (table) => [
    index("legal_consents_account_idx").on(table.accountId),
    uniqueIndex("legal_consents_account_version_unique").on(
      table.accountId,
      table.termsVersion,
      table.privacyVersion,
    ),
  ],
);

export type LegalConsent = typeof legalConsentsTable.$inferSelect;