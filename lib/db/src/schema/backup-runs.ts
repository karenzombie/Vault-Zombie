import { integer, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { accountsTable } from "./accounts";

/** Durable record for an external backup push. A commit may exist before this is marked completed. */
export const backupRunsTable = pgTable("backup_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestId: uuid("request_id").notNull(),
  actorAccountId: uuid("actor_account_id").notNull().references(() => accountsTable.id),
  snapshotId: text("snapshot_id").notNull(),
  repository: text("repository").notNull(),
  branch: text("branch"),
  commitSha: text("commit_sha"),
  manifestSha256: text("manifest_sha256"),
  contentSha256: text("content_sha256"),
  metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
  status: text("status").notNull().default("pending"),
  tableCount: integer("table_count"),
  rowCount: integer("row_count"),
  artifactCount: integer("artifact_count"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("backup_runs_request_id_unique").on(table.requestId),
  uniqueIndex("backup_runs_commit_sha_unique").on(table.commitSha),
]);

export type BackupRun = typeof backupRunsTable.$inferSelect;