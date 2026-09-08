import { db } from "./index";
import {
  auditEventsTable,
  insertAuditEventSchema,
  type InsertAuditEvent,
} from "./schema/audit";

export async function appendAuditEvent(input: InsertAuditEvent) {
  const event = insertAuditEventSchema.parse(input);
  const [created] = await db.insert(auditEventsTable).values(event).returning();
  return created;
}
