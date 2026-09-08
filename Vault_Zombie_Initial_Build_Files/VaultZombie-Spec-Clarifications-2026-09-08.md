## Sealed-vault upgrades

An upgrade on a sealed vault raises its guest cap only. The sealed schedule,
reveal dates, applied duration, prompt set, and milestone never change. New
schedules and longer duration apply only to draft vaults and newly created
vaults.

# VaultZombie Specification Clarifications

**Status:** Authoritative addendum to the initial build specification. Where this
document changes or clarifies an earlier document, this document wins.

## Reports and Lockbox

- Reveal timelines are paid-only (Safe and above), even when a Lockbox schedule
  has multiple reveals. The restriction creates paid-tier value.
- The report mapping proposed in the Report Design Guide section 7 is confirmed.
- Lockbox results are on-screen only: no exports, save actions, print stylesheet,
  printable keepsake, or compiled all-answers report.
- Lockbox results contain the opened-seal masthead, stat callouts, ring gauge and
  outcome breakdown, standouts with operator notes, and per-question drill-in.
- Lockbox excludes by-area bars, reveal timeline, standalone scoreboard,
  printable archive, and compiled all-answers report.
- All tiers receive vault health, reveal reports, per-question detail, and guest
  personal reports by email when the guest supplied an email.
- Paid tiers receive full results, scoreboard, by-area breakdown, paid timeline,
  compiled all-answers report, and printable archive.
- Deep Vault closes with milestone certificate framing. Safe and Vault close with
  the same final-reveal visuals without the certificate.

## Backup destination

- Data backup uses a second private repository and must never share the code
  repository.
- Its repository name and write-scoped token will be supplied later through
  environment configuration.
- Missing configuration must fail cleanly in the admin UI. Never invent or
  hardcode a backup destination.

## Deletion and retention

- Deleting a vault removes its guests, answers, outcomes, scoring data, and cover
  photo.
- Deleting an operator removes all owned vaults under that cascade, the profile,
  and the authentication record.
- Billing records remain but are anonymized. Retain tier, amount, date, currency,
  gift code when present, and Stripe payment reference. Replace identity fields
  with a deleted-account placeholder.
- Audit entries are immutable and retained against an anonymized operator ID.
- Historical backup commits retain deleted data by design.
- Operator deletion requires a separated confirmation flow and typed phrase.
- Before deletion, paid operators may export unlocked content only through the
  normal unlocked-content read path. Lockbox has no export.
- Admin full export may include sealed content. It is a sanctioned exception
  requiring fresh MFA, typed reason, and an append-only audit event.

## Deep Vault milestone

- The milestone must be after both anchor date and seal date.
- It may exceed the regular ten-year schedule horizon.
- If it shares a date with a regular reveal, render one combined event and one
  guest timing button labeled as the milestone.
- It is editable before sealing and locked afterward.
- It is a guest-pickable timing slot and assigns its date to `unlock_at`.

## Admin sessions and sensitive actions

- Idle timeout: 30 minutes.
- Absolute session maximum: 12 hours.
- Fresh MFA means successful MFA within the last 5 minutes.
- Fresh MFA is required for unlock, reseal, refund, account/vault deletion, comp
  grant, backup push, and admin full export.
- Audit completed sensitive actions only. Failed or abandoned MFA remains in
  Clerk authentication logs.

## Content import

- Number unit, bounds, and close band and free-text scoreable/keepsake metadata
  will be supplied later by the owner.
- Schema and import tooling must require these values and report incomplete rows.
- Do not default or infer any missing content metadata.
- Remaining master-brief open items stay open except report tier mapping, which
  is now closed.
