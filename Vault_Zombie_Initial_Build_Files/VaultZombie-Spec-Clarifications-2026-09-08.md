## Sealed-vault upgrades

An upgrade on a sealed vault raises its guest cap only. The sealed schedule,
reveal dates, applied duration, prompt set, and milestone never change. New
schedules and longer duration apply only to draft vaults and newly created
vaults.

## Payments: purchases and upgrades

- Checkout happens only after a vault exists. One payment attaches to exactly
  one vault by vault ID; payment events never create vaults.
- Draft vaults may remain unpaid indefinitely. Lockbox is free and never enters
  Stripe.
- Upgrades charge the difference between the current tier price and the target
  tier price. Lockbox-to-paid upgrades charge the target tier's full price.
- Repeated upward upgrades are allowed. Downgrades are not supported.
- If a draft plan change invalidates the selected schedule, duration, or
  milestone, clear each invalid selection and require the operator to choose
  again. Never retain or silently replace an invalid selection.
- A sealed-vault upgrade changes only the guest cap. Schedule, reveal dates,
  duration, prompt set, and milestone remain fixed.

## Payments: Stripe lifecycle

- Entitlement activates only from a verified Stripe webhook, never from a
  checkout return or success redirect.
- Handle `checkout.session.completed`, `checkout.session.expired`,
  `checkout.session.async_payment_failed`, `payment_intent.payment_failed`, and
  `charge.dispute.created`, plus only the events required for refunds.
- Webhook processing is idempotent by Stripe event ID. Duplicate deliveries are
  recorded and ignored without applying their effect twice.
- Delayed payments leave the vault as an unpaid draft with a visible pending
  state until the verified activation event arrives.
- Currency is USD only. Stripe Tax and tax-field collection are out of scope.
- Prices are fixed Stripe Price records based on Master Build Brief sections 4
  and 5. Application code never computes checkout prices and never accepts a
  price from the client.
- Disputes are recorded and flagged for administrators. They never
  automatically revoke access to a sealed vault.
- Application administrators do not edit prices. Price changes require an
  updated governing brief and deliberately updated Stripe Price records.
- Use only `STRIPE_SECRET_KEY` on the server and
  `VITE_STRIPE_PUBLISHABLE_KEY` on the client. No Replit Stripe connector or
  Stripe sync package is used.
- `STRIPE_WEBHOOK_SECRET` is intentionally absent until the owner creates the
  dashboard webhook. The endpoint must fail clearly while it is missing; do not
  stub, bypass, or weaken signature verification.

# VaultZombie Specification Clarifications

**Status:** Authoritative addendum to the initial build specification. Where this
document changes or clarifies an earlier document, this document wins.

## Standing operating rules

- Build only what the current step explicitly authorizes in its instructions or
  governing documents. Do not add unrequested surfaces or adjacent features.
- Stop and report any contradiction, gap, undefined case, or choice that the
  governing documents do not settle. Do not invent a value or assumption to
  continue.
- Never weaken an established rule to unblock implementation. A blocking rule is
  a reason to pause and report.
- Report verification precisely: distinguish typechecks, builds, visual checks,
  real-data tests, and work that was not tested.
- Every code backup must be verified by comparing the remote tree hash with the
  local commit tree hash. Reconcile mismatches before reporting completion, and
  report the local commit, remote head, shared tree hash, and whether the trees
  are byte-for-byte identical. Document failed pushes and any workaround used.

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
