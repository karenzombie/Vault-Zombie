import { pgEnum } from "drizzle-orm/pg-core";

export const accountStatusEnum = pgEnum("account_status", [
  "active",
  "deleted",
]);
export const adminRoleEnum = pgEnum("admin_role", ["operator", "admin"]);
export const answerTypeEnum = pgEnum("answer_type", [
  "free_text",
  "number",
  "multiple_choice",
  "name_pick",
]);
export const freeTextModeEnum = pgEnum("free_text_mode", [
  "scoreable",
  "keepsake",
]);
export const fitTagEnum = pgEnum("fit_tag", ["short", "long"]);
export const planTierEnum = pgEnum("plan_tier", [
  "lockbox",
  "safe",
  "vault",
  "deep_vault",
]);
export const revealScheduleEnum = pgEnum("reveal_schedule", [
  "weekly_sprint",
  "monthly_x3",
  "monthly_year",
  "half_then_annual",
  "annual_keepsake",
]);
export const vaultStatusEnum = pgEnum("vault_status", [
  "draft",
  "sealed",
  "active",
  "completed",
  "deleted",
]);
export const guestLayoutEnum = pgEnum("guest_layout", [
  "one_at_a_time",
  "all_prompts",
]);
export const revealSlotKindEnum = pgEnum("reveal_slot_kind", [
  "scheduled",
  "milestone",
]);
export const verdictTierEnum = pgEnum("verdict_tier", [
  "full",
  "half",
  "zero",
]);
export const auditActionEnum = pgEnum("audit_action", [
  "manual_unlock",
  "reseal",
  "refund",
  "comp_grant",
  "vault_deletion",
  "account_deletion",
  "backup_push",
  "admin_full_export",
]);
