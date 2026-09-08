# VaultZombie Admin Panel, Build Brief (v1.1)

**Status:** Current and authoritative for the admin surface. Companion to `VaultZombie-Build-Brief-v2.md`, which stays the master specification for the product. Where this brief uses data-model terms (`unlock_at`, the sealed rule, the four tiers, the five reveal schedules, Clerk, Stripe, Resend), they carry the meanings defined in the master brief. Approved by Karen on September 7, 2026.

**v1.1 change:** adds the data backup and recovery section (section 10) and its decisions. Everything else is unchanged from v1.

This brief is a design specification, not a Replit paste instruction. A self-contained builder instruction can be produced from it when the build is scheduled.

---

## 1. What this is

A single control panel for the VaultZombie owner. Today that is one person, Karen, a staff of one. The panel is built for one admin but modeled as a role rather than a hardcoded person, so a second admin could be added later without a rebuild.

It adds seven things to the product: MFA-gated admin access, a manual unlock and reseal control, owner-side billing and revenue tracking, an operator-side billing view, admin reports, content management (already outlined in master brief section 16, consolidated here), and an owner-held data backup. It also carries the vault health, support, lifecycle, and audit tooling that the others lean on.

---

## 2. The one promise this panel bends, and the one it keeps

The product's core promise is "sealed until the date." The master brief enforces it for operators and guests at the data layer, and nothing in this panel changes that: **an operator or a guest can never force a vault open early.** That promise stays whole.

The admin can. The manual unlock control (section 4) is the single sanctioned exception to computed unlocking, and it exists on purpose. As owner and sole staff, Karen may need to open a vault early for reasons known now (testing every scenario before launch, a deceased operator whose family wants the data) and reasons not yet foreseen. Because the admin can open a vault, the admin can then read it. That is accepted: the person holding the override is the business owner, not third-party staff. The guardrails in section 4 exist to make every open deliberate and never accidental, not to restrict the owner.

---

## 3. Access and authentication

- Admin is a separate role with its own gate, distinct from operator accounts. It rides on Clerk, already the approved auth service, so no new dependency is introduced.
- Access requires MFA using an authenticator-app TOTP, the same kind of second factor as the Oasis staff UI. TOTP is enforced on the admin role, not optional.
- Sensitive actions (manual unlock, reseal, refund, account or vault deletion, comp grant, backup push) require a fresh MFA re-prompt at the moment of the action, not only at login.
- Admin sessions time out and require re-authentication.
- The admin panel is part of the same application on a gated route, not a separate service.

---

## 4. Manual unlock and reseal

This is the reason the panel exists first.

### 4.1 What it does

The admin can force content open early on one named vault. Three scopes:

- a single reveal date,
- the Deep Vault milestone,
- or the entire vault at once.

### 4.2 How it works, faithfully to the computed-unlock model

The master brief computes unlocking from each answer's `unlock_at` through a single read path filtered on `unlock_at <= now()`, with no job and no stored flag. This panel keeps that intact and does not add a job or a second read path.

Mechanism: add a nullable `unlock_override_at` to each answer (or to the reveal batch). The single read path filters on `COALESCE(unlock_override_at, unlock_at) <= now()`. A manual unlock sets `unlock_override_at` to now for the chosen scope. The original `unlock_at` is never touched, so the true schedule is always preserved underneath.

That preservation is what makes reseal exact and safe (section 4.5).

### 4.3 Guardrails against an accidental open

- The unlock control appears only on a single vault's detail page. It is never on a list, a bulk view, or any multi-select surface, so there is no adjacent row to mis-tap.
- It is danger-styled and set apart from routine actions, using the error tone in the palette.
- Type-to-confirm arms the control: the admin types the vault's name or ID before the button will act. A stray tap alone does nothing.
- A reason is required before it proceeds, and the reason is written to the audit log.
- A fresh MFA re-prompt is required at the moment of unlock.
- A preview shows exactly what will open before it fires: which reveal or the milestone, how many predictions, and how many guests are affected. The admin confirms that summary to proceed.

### 4.4 Emails, and why they default off

Guest and operator notification emails default to OFF on a manual unlock. The admin can opt in per action.

The reason is asymmetry: an unlock is reversible, an email is not. Rewriting `unlock_override_at` back to null restores the sealed state cleanly, but a "your prediction just unlocked" email cannot be recalled. With emails off by default, an accidental open notifies nobody and can be undone quietly.

### 4.5 Reseal

Reseal is a first-class action, not a manual timestamp edit. It sets `unlock_override_at` back to null for the chosen scope, restoring the original computed schedule exactly. One clean step. Reseal is itself a sensitive action: MFA re-prompt, reason required, written to the audit log.

### 4.6 Logging

Every unlock and every reseal is written to the immutable audit log (section 9): the vault, the scope, the timestamp, the admin identity, the reason, and whether emails were sent.

---

## 5. Owner billing and revenue

Card data never touches VaultZombie servers (Stripe Checkout, master brief section 12). Owner-side reporting reads from the Stripe API together with the local record of each sale.

- Revenue dashboard: total, and broken out by period, by tier, and by gift versus direct purchase.
- Refunds shown against revenue.
- Free-to-paid conversion, and the take-rate on soft-cap upgrade offers.
- Payout and fee reconciliation, so Stripe deposits can be matched against recorded sales.

---

## 6. Operator billing view

Per operator:

- plan bought, price paid, purchase date, and receipt,
- gift codes redeemed or issued,
- soft-cap upgrade history.

Admin actions on an operator's account:

- **Refund.** A full refund of the one-time purchase, issued through Stripe.
- **Comp or manual plan grant.** Grant a paid tier at no charge, with a reason logged. This covers cases like giving the beta test wedding a free paid tier.

---

## 7. Admin reports

- Vaults by state over time: active, sealed, and completed.
- Vaults and revenue by vault type, so it is clear which of the ten actually sell.
- Guest volume, average guests per vault, and cap-exceeded events.
- Gift code issuance versus redemption.

---

## 8. Content management

Consolidated from master brief section 16. With no code changes, the admin can:

- add, edit, reorder, and retire vault types, sub-categories, and questions,
- set per question the answer type, options, number unit, bounds, and close band, the scoreable-or-keepsake flag, and the short-fit or long-fit tag,
- import the ten question banks from their source documents.

The sealed rule holds here too: content management and vault health show counts and metadata only, never sealed answer text.

---

## 9. Vault health, support, lifecycle, and audit

**Vault health.** Per vault, counts and metadata only: predictions sealed, guests waiting, reveals landed. Never answer text. The manual unlock in section 4 is the only way the admin sees content, and only after a deliberate open.

**Support.** Resend a stuck operator or gifter email. Look up a gift code's status.

**Lifecycle.** Delete a vault or an operator account on request. The cascade is specified at build time: what is removed, and what, if anything, is retained for the financial record.

**Audit log.** Append-only and immutable. It records every sensitive admin action: manual unlock, reseal, refund, comp grant, deletion, and backup push. Each entry carries the admin identity, the timestamp, the target, the reason, and any action-specific detail (for unlock and reseal, the scope and whether emails were sent). This log is the backbone of the whole panel: because the admin can bend the sealed promise, every bend is recorded.

---

## 10. Data backup and recovery

Purpose: an owner-held copy of the full dataset, so that if Replit loses data you can restore, or lift the whole product to another platform.

- **Trigger.** A manual "push backup now" button in the admin panel. On demand, not scheduled, so it adds no cron or job service and stays within the master brief's dependency discipline. You run it whenever you want a fresh snapshot.
- **What it captures.** The full dataset in one push: operators, guests, vaults, all answers including sealed ones, outcomes, billing records, and gift codes. A backup that omitted sealed answers could not restore them, so it includes everything.
- **Format.** A restore-ready database dump for recovery, plus a CSV export per table for readability and for moving the data into another platform or tool. The dump is the source of truth for a Replit restore; the CSVs are the portable, human-readable copy.
- **Destination.** A dedicated private git repository, separate from the code repo. Each push is a commit, so you get version history and can roll back to any prior snapshot.
- **Credentials.** The push runs server-side, so the app holds a git token scoped to write only to the backup repo.

### The sealed-content note

This backup stores sealed prediction text as plaintext in the repo, which is the chosen approach. The consequence, recorded here so it stays deliberate: anyone who can read the backup repo can read every sealed prediction before its unlock date. So two things are load-bearing. The repo must be private, and the git token and repo access must be treated as sensitive as the database itself. Restricting who holds that access is what keeps the sealed promise intact for the plaintext backup.

---

## 11. Technology and dependency policy

No new runtime service beyond the backup destination. The panel uses what the master brief already approves: Clerk for the admin gate and MFA, Stripe for billing reads and refunds, Resend for the support resends, Replit Postgres, and Replit object storage. The backup adds a private GitHub repository as its destination (see section 12, decision 10). The panel is a gated route in the same application.

---

## 12. Decisions made in writing this brief

Recorded so they can be changed deliberately rather than discovered later.

| # | Decision | Why |
|---|---|---|
| 1 | Force-unlock uses a nullable `unlock_override_at` with a single read path on `COALESCE(unlock_override_at, unlock_at) <= now()` | Keeps the master brief's computed-unlock model and single read path intact, never touches the true schedule, and makes reseal exact |
| 2 | Notification emails default off on manual unlock, opt-in per action | An unlock is reversible, an email is not; off by default means an accidental open can be undone silently |
| 3 | Reseal is a first-class action that nulls the override | Recovery from an accidental or temporary open is one clean step, not a hand edit |
| 4 | Admin auth rides on Clerk with enforced TOTP | No new dependency, and the same authenticator-app second factor as the Oasis staff UI |
| 5 | Built for one admin but modeled as a role, not a person | A second admin can be added later without a rebuild |
| 6 | Refunds are full only | One-time small purchases have nothing to prorate |
| 7 | The audit log is append-only and covers unlock, reseal, refund, comp, deletion, and backup | The admin can bend the sealed promise, so every bend must be recorded |
| 8 | Backup is plaintext into a dedicated private git repo, run from a manual push button | An owner-held full copy for recovery and portability, simplest to run and matching the Oasis pattern; the private repo and its token carry the protection |
| 9 | Backup captures the full dataset, including sealed answers, as a restore-ready dump plus per-table CSVs | You cannot restore data you excluded; the dump restores, the CSVs port |
| 10 | GitHub is the backup destination, a deliberate exception to the master brief's approved-services list | Git is already the code host in the Replit workflow, so the exception is recorded rather than added silently |

---

## 13. Out of scope for this panel

- Granular multi-admin permission tiers. The role exists, but a permission matrix is not built now.
- Scheduled or automatic backups. The push is manual and on demand.
- Any capability that would require a new runtime third-party service beyond the backup repo.
- An automated deceased-operator verification workflow. These are handled case by case; the manual unlock, its required reason, and the audit log are the tools.
