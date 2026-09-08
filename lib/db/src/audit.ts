import { db } from "./index";
import {
  auditEventsTable,
  insertAuditEventSchema,
  type InsertAuditEvent,
} from "./schema/audit";

export async function appendAuditEvent(
  input: InsertAuditEvent,
  executor: Pick<typeof db, "insert"> = db,
) {
  const event = insertAuditEventSchema.parse(input);
  const [created] = await executor
    .insert(auditEventsTable)
    .values(event)
    .returning();
  return created;
}
