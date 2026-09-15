# VaultZombie Build Brief, Addendum 2 (v1)

This addendum governs over `VaultZombie-Build-Brief-v2.md`, `VaultZombie-Flow1-Build-Stages.md`,
and `VaultZombie-Email-Spec.md`, and over each of their existing addendums wherever they cover the
same ground, per the ADDENDUMS GOVERN rule in `replit.md`. All of these documents live in
`Vault_Zombie_Initial_Build_Files/`.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. Why this addendum exists

The app will be published on a Reserved VM, which is always on, instead of Autoscale. Three
problems must be fixed before it is published:

- On the published site, the API server starts from the workspace root, so the legal configuration
  looks for `Policy_Documents/` outside the project. `/terms` and `/privacy` return 503 and sign-up
  is blocked. Running the production command from the workspace root reproduces it.
- On the published site, the email outbox is processed only once, when the server starts. The
  repeating loop exists only in the development start script.
- Every decision on whether a reveal date has arrived uses the UTC date. Reveal days must follow the
  host's own time zone.

This addendum also changes when emails are sent. An email caused by an action now sends at the
moment of that action. The outbox stays as a safety net.

## 2. Before writing any code: the email worker anomaly

During a memory measurement in development, new `email-worker.mjs` processes were seen starting
roughly once per second for several seconds, although the development start script runs the worker
once every 60 seconds. No cause was found at the time.

Find the cause before changing anything. Do not guess.

If the cause lies entirely in the development start script loop that section 5 removes, report it at
the stop gate and continue with this addendum.

If the cause is anything else, or you cannot find it, STOP before writing any code and report what
you found.

## 3. Deployment target

In `.replit`, change the `[deployment]` section's `deploymentTarget` from `"autoscale"` to `"vm"`.

Change nothing else in `.replit`.

## 4. Legal documents on the published site

The API server must find the workspace root from the location of its own running program file,
never from the folder it was started in. The running program file is in the same place in
development and on the published site, so the result is correct in both.

- The API server passes that root explicitly to `legalConfiguration()`, the same way
  `scripts/src/create-admin.ts` already passes its own computed root.
- Every API server code path that reads the legal configuration must use it. This includes
  `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/legal.ts`, and
  `artifacts/api-server/src/middlewares/auth.ts`, which all import through
  `artifacts/api-server/src/lib/legal.ts`. No API server code path may rely on the working-directory
  default.
- Do not change the four safety checks in `configuredPdf` in `lib/legal/src/index.ts`: the
  bare-filename check, the `.pdf` check, the parent-directory check, and the `realpath` containment
  check. Do not change the `WORKSPACE_ROOT` default in that file, and do not change how
  `scripts/src/create-admin.ts` computes or passes its root.

Verify it: build the API server with its production build, run
`node --enable-source-maps artifacts/api-server/dist/index.mjs` from the workspace root on a
separate port, and request `/terms` and `/privacy`.

## 5. The recurring email check

The recurring check is the existing `runEmailCycle()`, which evaluates date-based email work and
processes the outbox.

- It runs inside the API server process on a timer, every 15 minutes, aligned to the clock at :00,
  :15, :30, and :45. It also keeps its existing single run when the server starts.
- A run never overlaps another run. If a run is still going when the next one is due, the next one
  is skipped.
- Remove the repeating email worker loop from the `start` script in
  `artifacts/api-server/package.json`, so the script starts only the API server. Development and the
  published site then run the check the same way. Remove any use of
  `EMAIL_WORKER_INTERVAL_SECONDS`.
- Nothing may start `email-worker.mjs`. Report anything that still references it.
- Update the comment in `artifacts/api-server/src/index.ts` above the startup run so it describes
  the new timer rather than saying production needs a recurring schedule.
- Use no external job or scheduling service and add no new package. The Build Brief's rule that no
  cron or job scheduling service is used still holds.

## 6. When emails send

`VaultZombie-Email-Spec.md` global rule 1 says every email goes through the outbox and worker. That
rule is replaced by this section. The email copy, styling, icons, recipients, and the "sent at most
once per" rules in the Email Spec do not change.

### 6.1 Emails caused by an action send immediately

These emails send at the moment their action happens:

| ID | Email | The action |
|---|---|---|
| H1 | Welcome | The host's account is created |
| H2 | Vault created | The host creates a vault |
| H3 | Host receipt | The verified Stripe webhook activates a plan purchase or upgrade |
| H4 | Vault sealed | The host seals the vault |
| H7 | Guest limit reached | A guest submission takes the vault over its guest limit |
| G1 | Predictions sealed | A guest submits |
| G2 | Results | The host marks the last unmarked scoreable prediction a guest has in a reveal |
| F1 | Gift purchase | The verified Stripe webhook marks a gift purchased |
| F2 | Gift for you | Same moment as F1 |
| F3 | Gift redeemed | A gift code is redeemed |

For each one:

- Once the action's own database changes are committed, queue the email in the outbox exactly as
  today, with the same dedupe key, and then attempt delivery of that one email immediately. Use the
  same claim and send path the outbox already uses, so the immediate attempt and the recurring
  check can never both send it.
- A failed or slow send never makes the action fail, and the action's response never waits on
  Resend. This matters most for the Stripe webhook.
- If the immediate attempt fails, the email stays in the outbox and the recurring check retries it.
- H4, H7, and G2 are found today by the recurring check rather than queued at the action. Queue them
  at the action instead.
- The recurring check may keep finding action emails as a backstop for any the action missed. The
  dedupe keys prevent duplicates.
- Every condition in the Email Spec still applies before sending, including unsubscribed guests,
  guests with no email, the gifter email fallback, and G2 waiting only on scoreable predictions.

### 6.2 The admin manual unlock

When an admin opens a reveal early and checks the matching email options, the H5 and G2 emails that
option allows are sent immediately at that unlock action, under the same rules as section 6.1. The
existing opt-in rules for H5, H6, and G2 on an early-opened reveal do not change.

### 6.3 Date-based emails stay on the recurring check

H5 (reveal ready), H6 (unmarked reveal nudge), and H8 (guest limit reminder) are sent by the
recurring check. Each uses the vault's time zone from section 7 to decide whether its date has
arrived.

## 7. The host's time zone

Every vault gets a time zone chosen by its host. A reveal date begins at midnight in that time zone.
The same time zone governs the unlock of predictions, the vault's status, the setup locks, the
reports, and the date-based emails, so all of them change at the same moment.

This is a host feature. Section 7.7 limits where it appears.

### 7.1 Storage

Add a nullable column to the vaults table holding the chosen zone's identifier from the table in
section 7.2. The server rejects any value that is not one of those 40 identifiers.

### 7.2 The list

The drop-down offers exactly these 40 entries, in this order, with these labels word for word. Store
the identifier. Show the label. Daylight saving is handled automatically from the identifier; the
labels show each zone's standard offset and do not change with the season.

| Label | Identifier |
|---|---|
| (UTC-10:00) Hawaii | `Pacific/Honolulu` |
| (UTC-09:00) Alaska | `America/Anchorage` |
| (UTC-08:00) Pacific Time (US and Canada) | `America/Los_Angeles` |
| (UTC-07:00) Arizona | `America/Phoenix` |
| (UTC-07:00) Mountain Time (US and Canada) | `America/Denver` |
| (UTC-06:00) Central Time (US and Canada) | `America/Chicago` |
| (UTC-06:00) Mexico City | `America/Mexico_City` |
| (UTC-05:00) Eastern Time (US and Canada) | `America/New_York` |
| (UTC-04:00) Atlantic Time (Canada) | `America/Halifax` |
| (UTC-04:00) Puerto Rico | `America/Puerto_Rico` |
| (UTC-03:30) Newfoundland | `America/St_Johns` |
| (UTC-03:00) Buenos Aires | `America/Argentina/Buenos_Aires` |
| (UTC-03:00) São Paulo | `America/Sao_Paulo` |
| (UTC+00:00) Coordinated Universal Time | `UTC` |
| (UTC+00:00) London, Dublin, Lisbon | `Europe/London` |
| (UTC+01:00) Paris, Berlin, Rome, Madrid, Amsterdam | `Europe/Paris` |
| (UTC+01:00) Lagos | `Africa/Lagos` |
| (UTC+02:00) Athens, Helsinki, Kyiv | `Europe/Athens` |
| (UTC+02:00) Cairo | `Africa/Cairo` |
| (UTC+02:00) Jerusalem | `Asia/Jerusalem` |
| (UTC+02:00) Johannesburg | `Africa/Johannesburg` |
| (UTC+03:00) Istanbul | `Europe/Istanbul` |
| (UTC+03:00) Moscow | `Europe/Moscow` |
| (UTC+03:00) Riyadh | `Asia/Riyadh` |
| (UTC+03:00) Nairobi | `Africa/Nairobi` |
| (UTC+04:00) Dubai | `Asia/Dubai` |
| (UTC+05:00) Karachi | `Asia/Karachi` |
| (UTC+05:30) India | `Asia/Kolkata` |
| (UTC+05:45) Kathmandu | `Asia/Kathmandu` |
| (UTC+07:00) Bangkok, Jakarta | `Asia/Bangkok` |
| (UTC+08:00) Beijing, Hong Kong | `Asia/Shanghai` |
| (UTC+08:00) Singapore | `Asia/Singapore` |
| (UTC+08:00) Manila | `Asia/Manila` |
| (UTC+08:00) Perth | `Australia/Perth` |
| (UTC+09:00) Tokyo | `Asia/Tokyo` |
| (UTC+09:00) Seoul | `Asia/Seoul` |
| (UTC+09:30) Adelaide | `Australia/Adelaide` |
| (UTC+10:00) Brisbane | `Australia/Brisbane` |
| (UTC+10:00) Sydney, Melbourne | `Australia/Sydney` |
| (UTC+12:00) Auckland | `Pacific/Auckland` |

Do all time zone work with the platform's own `Intl` and date handling. The Build Brief's rule
against a date library still holds. Add no new package.

### 7.3 Where the host picks it

In `artifacts/vault-zombie/src/pages/operator/vault-setup.tsx`, in the "When's the big day?"
section, place the drop-down directly below the Event date field. Use this text exactly:

- Field label: `Time zone`
- Text shown when nothing is selected: `Choose a time zone`
- Line below the drop-down: `Your big day and every reveal date begin at midnight in this time zone.`

The section's existing heading and helper text do not change.

The drop-down opens with nothing selected. Never fill it in from the browser, the device, the
account, the IP address, or any other source. It autosaves like the other setup fields.

### 7.4 Required before sealing

A vault cannot be sealed without a time zone.

- Add this reason to the seal readiness checks, using this text exactly:
  `Choose a time zone before sealing.`
- `sealVault` itself also rejects a vault with no time zone, so the rule holds even if the button
  check is bypassed.

### 7.5 The seal confirmation dialog

In the "Ready to seal?" dialog, add this line to the list of things locked for good, directly after
the reveal dates line, where `[label]` is the chosen zone's label from section 7.2:

`Your time zone, [label]`

Change nothing else in the dialog.

### 7.6 Locked at sealing

Once a vault is sealed, its time zone never changes.

- The server rejects any change to the time zone of a vault that is not a draft.
- After sealing, the drop-down still shows the chosen zone but is disabled.
- A plan upgrade does not change it.
- Add no admin control for changing it.

### 7.7 Host only

The time zone appears only in the setup section in 7.3 and the seal dialog in 7.5.

- Never show it or send it to guests. It does not appear on any guest page, guest email, guest
  report, or public page.
- Do not add it to any other screen, including the admin panel.
- Do not add it to any email. No email copy changes.

### 7.8 Every "today" for a vault uses its time zone

Everywhere the code decides what today's date is for a vault, it must use that vault's time zone.
A reveal date has arrived once it is that date or later in the vault's time zone.

The places found so far that compute today as the UTC date include:

- `lib/db/src/sealed-content.ts`, which enforces the sealed rule
- `lib/db/src/vault-lifecycle.ts`, which derives vault status
- `lib/db/src/vault-setup.ts`, in several places, including the setup locks and the seal date
- `lib/db/src/reports.ts`
- `artifacts/api-server/src/lib/email-evaluator.ts`
- `artifacts/api-server/src/routes/operator-vaults.ts`, where the seal route sets the seal date
- `artifacts/vault-zombie/src/pages/operator/vault-setup.tsx`, where the schedule section defaults
  the event date

That list is not guaranteed to be complete. Search the whole codebase, server and client, find every
place, and change each one.

- Compute "today in a vault's time zone" in one shared place. The sealed rule and the date-based
  emails must use the same calculation, never two copies.
- The seal date, and the default event date used when the host leaves it blank, are today's date in
  the vault's time zone at the moment of sealing.
- A draft with no time zone yet may use the UTC date for its setup previews only. A sealed vault
  always has a time zone, so this never applies after sealing.
- The sealed rule is the most important rule in the product. No change here may let any
  prediction's content be read before its reveal date has arrived in the vault's time zone.

### 7.9 Existing development vaults

Set the time zone of every existing vault in the development database, draft and sealed, to
`America/Los_Angeles`. Change nothing else about any vault, and do not delete or alter any other test
data.

## 8. Do not change

- The email copy, styling, and icons in the Email Spec.
- Anything in Stripe checkout or the Stripe webhook beyond sending its emails per section 6.
- The marketing site pages.
- Anything not named in this addendum.

## 9. Add this addendum to the list in replit.md

Add this file to three entries in the ADDENDUMS GOVERN list in `replit.md`, since it governs over
all three documents:

Under the Build Brief entry, below the `VaultZombie-Spec-Clarifications-2026-09-08.md` line.

Under the Flow 1 entry, below the `VaultZombie-Flow1-Addendum-3-v1.md` line.

Under the Email Spec entry, below the `VaultZombie-Email-Spec-Addendum-2-v1.md` line.

Each time, the line is:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-2-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- The cause of the email worker anomaly from section 2, with how you confirmed it.
- Confirmation that `replit.md` lists this addendum under all three entries, and that nothing else
  in that file changed.
- The `[deployment]` section of `.replit`, quoted as it now reads.
- The changed legal root code, quoted, and confirmation that the four safety checks in
  `configuredPdf` are unchanged.
- The status code and content type of `/terms` and `/privacy` from the production build run from the
  workspace root, and which document each served.
- The recurring check code, quoted, and the `start` script as it now reads.
- Anything that still references `email-worker.mjs`.
- For each email in the section 6.1 table, where it is now queued and sent, and proof from a real
  action in development that it was sent at the moment of the action rather than at the next
  recurring check.
- Proof that a failed immediate send leaves the email in the outbox for the recurring check, and that
  no email is ever sent twice.
- The new vaults column and its validation, quoted.
- A screenshot of the "When's the big day?" section showing the drop-down with nothing selected.
- Proof that sealing is blocked without a time zone, both through the button and through a direct
  request to the seal endpoint.
- A screenshot of the seal confirmation dialog showing the time zone line.
- Proof that the time zone cannot be changed after sealing, both in the page and through a direct
  request.
- Confirmation that the time zone appears nowhere else, including every guest surface and every
  email.
- Every place you changed for section 7.8, each with its file and what it now does.
- A test showing a reveal opening at midnight in a vault's time zone and not before, for at least
  `America/Los_Angeles`, `Asia/Kolkata`, and `Asia/Kathmandu`, covering both the sealed rule and the
  reveal ready email.
- The number of existing development vaults set to `America/Los_Angeles`, split into draft and
  sealed.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
