import { auditActionEnum } from "./schema/enums";
import type { Account } from "./schema/accounts";
import { appendAuditEvent } from "./audit";
import { db } from "./index";

export type SensitiveActionTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];

export interface SensitiveActionContext<T = unknown> {
  actor: Account;
  action: (typeof auditActionEnum.enumValues)[number];
  targetType: string;
  targetId: string | ((result: T) => string);
  reason: string;
  details?: Record<string, string | number | boolean | null>;
  /** Allows idempotent callers to reuse an already-audited action. */
  shouldAudit?: (result: T) => boolean;
}

/**
 * Runs only after the API's admin and fresh-MFA gates have passed. The audit
 * record is appended only after the action succeeds, so failed and abandoned
 * attempts remain solely in Clerk's authentication logs.
 */
export async function runSensitiveAdminAction<T>(
  context: SensitiveActionContext<T>,
  action: (transaction: SensitiveActionTransaction) => Promise<T>,
): Promise<T> {
  if (context.actor.role !== "admin") {
    throw new Error("Sensitive actions require an administrator account.");
  }
  const reason = context.reason.trim();
  if (!reason) throw new Error("A reason is required for sensitive actions.");

  return db.transaction(async (transaction) => {
    const result = await action(transaction);
    if (context.shouldAudit?.(result) !== false) {
      await appendAuditEvent({
        actorAccountId: context.actor.id,
        action: context.action,
        targetType: context.targetType,
        targetId: typeof context.targetId === "function" ? context.targetId(result) : context.targetId,
        reason,
        details: context.details ?? {},
      }, transaction);
    }
    return result;
  });
}