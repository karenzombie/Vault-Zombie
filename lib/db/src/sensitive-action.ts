import { auditActionEnum } from "./schema/enums";
import type { Account } from "./schema/accounts";
import { appendAuditEvent } from "./audit";

export interface SensitiveActionContext {
  actor: Account;
  action: (typeof auditActionEnum.enumValues)[number];
  targetType: string;
  targetId: string;
  reason: string;
  details?: Record<string, string | number | boolean | null>;
}

/**
 * Runs only after the API's admin and fresh-MFA gates have passed. The audit
 * record is appended only after the action succeeds, so failed and abandoned
 * attempts remain solely in Clerk's authentication logs.
 */
export async function runSensitiveAdminAction<T>(
  context: SensitiveActionContext,
  action: () => Promise<T>,
): Promise<T> {
  if (context.actor.role !== "admin") {
    throw new Error("Sensitive actions require an administrator account.");
  }
  const reason = context.reason.trim();
  if (!reason) throw new Error("A reason is required for sensitive actions.");

  const result = await action();
  await appendAuditEvent({
    actorAccountId: context.actor.id,
    action: context.action,
    targetType: context.targetType,
    targetId: context.targetId,
    reason,
    details: context.details ?? {},
  });
  return result;
}