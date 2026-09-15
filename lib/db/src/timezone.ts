/**
 * The host's per-vault time zone (VaultZombie-Build-Brief-Addendum-2-v1.md, section 7).
 * A reveal date begins at midnight in this zone; the same zone governs the unlock of
 * predictions, vault status, setup locks, reports, and date-based emails. This is the one
 * shared place that computes "today" for a vault — every other site must call
 * `todayInTimeZone` (or `isDateArrivedInTimeZone`) rather than deriving it independently.
 *
 * All time zone work uses the platform's own `Intl`; no date library is added.
 */

/** The drop-down's exact 40 entries, in order, label word for word (section 7.2). */
export const VAULT_TIMEZONES: ReadonlyArray<{ label: string; identifier: string }> = [
  { label: "(UTC-10:00) Hawaii", identifier: "Pacific/Honolulu" },
  { label: "(UTC-09:00) Alaska", identifier: "America/Anchorage" },
  { label: "(UTC-08:00) Pacific Time (US and Canada)", identifier: "America/Los_Angeles" },
  { label: "(UTC-07:00) Arizona", identifier: "America/Phoenix" },
  { label: "(UTC-07:00) Mountain Time (US and Canada)", identifier: "America/Denver" },
  { label: "(UTC-06:00) Central Time (US and Canada)", identifier: "America/Chicago" },
  { label: "(UTC-06:00) Mexico City", identifier: "America/Mexico_City" },
  { label: "(UTC-05:00) Eastern Time (US and Canada)", identifier: "America/New_York" },
  { label: "(UTC-04:00) Atlantic Time (Canada)", identifier: "America/Halifax" },
  { label: "(UTC-04:00) Puerto Rico", identifier: "America/Puerto_Rico" },
  { label: "(UTC-03:30) Newfoundland", identifier: "America/St_Johns" },
  { label: "(UTC-03:00) Buenos Aires", identifier: "America/Argentina/Buenos_Aires" },
  { label: "(UTC-03:00) São Paulo", identifier: "America/Sao_Paulo" },
  { label: "(UTC+00:00) Coordinated Universal Time", identifier: "UTC" },
  { label: "(UTC+00:00) London, Dublin, Lisbon", identifier: "Europe/London" },
  { label: "(UTC+01:00) Paris, Berlin, Rome, Madrid, Amsterdam", identifier: "Europe/Paris" },
  { label: "(UTC+01:00) Lagos", identifier: "Africa/Lagos" },
  { label: "(UTC+02:00) Athens, Helsinki, Kyiv", identifier: "Europe/Athens" },
  { label: "(UTC+02:00) Cairo", identifier: "Africa/Cairo" },
  { label: "(UTC+02:00) Jerusalem", identifier: "Asia/Jerusalem" },
  { label: "(UTC+02:00) Johannesburg", identifier: "Africa/Johannesburg" },
  { label: "(UTC+03:00) Istanbul", identifier: "Europe/Istanbul" },
  { label: "(UTC+03:00) Moscow", identifier: "Europe/Moscow" },
  { label: "(UTC+03:00) Riyadh", identifier: "Asia/Riyadh" },
  { label: "(UTC+03:00) Nairobi", identifier: "Africa/Nairobi" },
  { label: "(UTC+04:00) Dubai", identifier: "Asia/Dubai" },
  { label: "(UTC+05:00) Karachi", identifier: "Asia/Karachi" },
  { label: "(UTC+05:30) India", identifier: "Asia/Kolkata" },
  { label: "(UTC+05:45) Kathmandu", identifier: "Asia/Kathmandu" },
  { label: "(UTC+07:00) Bangkok, Jakarta", identifier: "Asia/Bangkok" },
  { label: "(UTC+08:00) Beijing, Hong Kong", identifier: "Asia/Shanghai" },
  { label: "(UTC+08:00) Singapore", identifier: "Asia/Singapore" },
  { label: "(UTC+08:00) Manila", identifier: "Asia/Manila" },
  { label: "(UTC+08:00) Perth", identifier: "Australia/Perth" },
  { label: "(UTC+09:00) Tokyo", identifier: "Asia/Tokyo" },
  { label: "(UTC+09:00) Seoul", identifier: "Asia/Seoul" },
  { label: "(UTC+09:30) Adelaide", identifier: "Australia/Adelaide" },
  { label: "(UTC+10:00) Brisbane", identifier: "Australia/Brisbane" },
  { label: "(UTC+10:00) Sydney, Melbourne", identifier: "Australia/Sydney" },
  { label: "(UTC+12:00) Auckland", identifier: "Pacific/Auckland" },
];

const VALID_IDENTIFIERS = new Set(VAULT_TIMEZONES.map((zone) => zone.identifier));

export function isValidVaultTimeZone(value: unknown): value is string {
  return typeof value === "string" && VALID_IDENTIFIERS.has(value);
}

export function vaultTimeZoneLabel(identifier: string): string | null {
  return VAULT_TIMEZONES.find((zone) => zone.identifier === identifier)?.label ?? null;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

/**
 * The single shared "today" calculation for a vault (section 7.8). Returns the date, as
 * `YYYY-MM-DD`, that `instant` falls on in `timeZone`. Every site that decides whether a
 * reveal date has arrived, derives vault status, enforces setup locks, or evaluates
 * date-based email eligibility must call this instead of deriving today's date itself.
 *
 * `timeZone` is nullable only for a draft vault that has not chosen one yet (section
 * 7.8): a sealed vault always has a time zone, so callers past sealing may treat it as
 * required. When null, this falls back to the UTC date, matching the existing behavior
 * for a draft's setup previews only.
 */
export function todayInTimeZone(instant: Date, timeZone: string | null | undefined): string {
  if (!timeZone) return instant.toISOString().slice(0, 10);
  // en-CA formats as YYYY-MM-DD directly, so no reassembly is needed.
  return formatterFor(timeZone).format(instant);
}

/** True once `dateString` (YYYY-MM-DD) is today or earlier in `timeZone`, at `instant`. */
export function isDateArrivedInTimeZone(dateString: string, timeZone: string | null | undefined, instant: Date = new Date()): boolean {
  return dateString <= todayInTimeZone(instant, timeZone);
}
