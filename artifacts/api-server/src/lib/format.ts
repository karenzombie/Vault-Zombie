/**
 * Formatting helpers for transactional email copy (spec section 1.11).
 * These are presentation-only; they never change stored values.
 */

/** `March 14, 2027`, in US Pacific time. */
export function formatEmailDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  }).format(date);
}

/** `$19.00` from a cents integer. */
export function formatEmailMoney(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/**
 * Elapsed time in plain words, rounded to the largest sensible unit
 * (spec: "3 weeks", "6 months", "2 years"). `from` must be <= `to`.
 */
export function formatElapsedTime(from: Date, to: Date = new Date()): string {
  const days = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
  if (days < 1) return "less than a day";
  if (days < 14) return plural(days, "day");
  if (days < 60) return plural(Math.round(days / 7), "week");
  if (days < 450) return plural(Math.round(days / 30.44), "month");
  return plural(Math.round(days / 365.25), "year");
}

/** Whole-days difference, floored at 0 — used for "N days ago/from now" copy. */
export function daysBetween(from: Date, to: Date = new Date()): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000));
}

function plural(count: number, unit: string): string {
  const n = Math.max(1, count);
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** Plan duration in plain words: "3 months", "5 years" (spec section 1.12). */
export function formatPlanDuration(durationYears: number): string {
  if (durationYears < 1) return plural(Math.round(durationYears * 12), "month");
  return plural(Math.round(durationYears), "year");
}
