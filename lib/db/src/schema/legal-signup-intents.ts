import { index, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

/** Hashed, single-use evidence issued before a Clerk sign-up is begun. */
export const legalSignupIntentsTable = pgTable("legal_signup_intents", {
  id: uuid("id").primaryKey().defaultRandom(),
  nonce: text("nonce").notNull(),
  tokenHash: text("token_hash").notNull(),
  termsVersion: text("terms_version").notNull(),
  privacyVersion: text("privacy_version").notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  consumedClerkSubject: text("consumed_clerk_subject"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("legal_signup_intents_nonce_unique").on(table.nonce),
  uniqueIndex("legal_signup_intents_token_hash_unique").on(table.tokenHash),
  index("legal_signup_intents_expiry_idx").on(table.expiresAt),
  index("legal_signup_intents_consumed_subject_idx").on(table.consumedClerkSubject),
]);