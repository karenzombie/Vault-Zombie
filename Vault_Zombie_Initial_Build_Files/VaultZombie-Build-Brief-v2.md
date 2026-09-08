# VaultZombie, Master Build Brief (v2.2)

**Status:** Current and authoritative. This is the master specification for the VaultZombie build. It incorporates the scoring, keepsake, and referral decisions, references the report design guide for all results and report surfaces (sections 1 and 8.4), and is reconciled with the admin panel brief (sections 3, 13, 14, and 16). Last updated September 8, 2026.

**v2.2 changes:** the pricing tiers document is retired from the document set; sections 4 and 5 of this brief are now the sole source for pricing, tiers, and reveal schedules, and the marketing pricing page is listed as a fourth screen mockup (section 1).

**v2.1 changes:** the document set now lists every file in the hand-off (section 1); the admin panel brief is folded in and the sealed rule states its one sanctioned exception (sections 3, 13, 14, 16); the guest answering screen gains an operator-chosen layout with a default, a leave-confirmation, and a resume-where-you-left-off behavior (section 7); the logo placement and the role of the mockups are specified (section 15); the `[Year]` token is now present in the New Year question bank (section 9); the art library covers five vault types (section 10); decisions 22 through 27 are recorded (section 18).

---

## 1. The document set

This brief is the master. Every file below is handed to the builder alongside it. Where two documents disagree, this brief wins, then the admin panel brief for the admin surface, then the report design guide for report surfaces, then the style guide for base design tokens. The mockups never win a disagreement; they are pictures, not specs (see section 15).

| Document | What it is | Status |
|---|---|---|
| `VaultZombie-Build-Brief-v2.md` | This document. The master spec. | Current |
| `VaultZombie-Admin-Panel-Brief.md` | The admin surface: MFA, manual unlock and reseal, billing, reports, content management, audit log, backup | Current. Companion to this brief. Its data-model terms carry the meanings defined here. |
| `vaultzombie-style-guide.html` | Design system: color, type, components | v1, adopted, with gaps filled in section 15 |
| `VaultZombie-Report-Design-Guide.md` | The report layer: visual language, component library, the list of reports, and the data each consumes | Current. Referenced by this brief. This brief stays the source of truth for product logic. |
| `vaultzombie-report-rich.html` | Reference implementation of the report components, assembled into one full report | Current. The picture of the report components in context. |
| `mockup_vaultzombie-marketing.html` | Screen mockups: marketing site (home, how it works, vault types, pricing, gift, about, legal) | Guidance only. Shows layout and feel beyond base color and type. Not exact. |
| `mockup_vaultzombie-operator.html` | Screen mockups: operator app (sign in, dashboard, create vault, manage vault, reveal and resolve, reports, settings) | Guidance only. Not exact. |
| `mockup_vaultzombie-guest-admin.html` | Screen mockups: guest landing, guest answer, guest confirmation, admin panel | Guidance only. Not exact. The admin screen shows content management only; the full admin scope is in the admin panel brief. |
| `vaultzombie-pricing.html` | Screen mockup: the marketing pricing page | Guidance only. Not exact. Its tiers and prices match section 5; section 5 is the source of truth for them. |
| `vault_zombie_png.png` | The logo: the zombie inside the vault door, a round emblem | Current. Placement in section 15. |
| `VaultZombie-Art-Assets.md` | CC0 cover art grab-list and licensing | Current. Covers 5 of 10 vault types. |
| `vaultzombie-questions-marriage.md` | Question bank, Marriage vault | Complete, 112 questions |
| `vaultzombie-questions-couple.md` | Question bank, Couple vault | Complete, 104 questions |
| `vaultzombie-questions-baby.md` | Question bank, New Baby vault | Complete, 96 questions |
| `vaultzombie-questions-child-growth.md` | Question bank, Child Growth vault | Complete, 104 questions |
| `vaultzombie-questions-college.md` | Question bank, College vault | Complete, 96 questions |
| `vaultzombie-questions-job.md` | Question bank, Job / Occupation vault | Complete, 96 questions |
| `vaultzombie-questions-travel.md` | Question bank, Travel vault | Complete, 96 questions |
| `vaultzombie-questions-retirement.md` | Question bank, Retirement vault | Complete, 96 questions |
| `vaultzombie-questions-new-business.md` | Question bank, New Business / Startup vault | Complete, 96 questions |
| `vaultzombie-questions-new-year.md` | Question bank, New Year / Year Ahead vault | Complete, 96 questions, carries the `[Year]` token |

**Total seed content: 992 questions across 10 vault types.**

These twenty-one files are the complete specification. Nothing else is required to build from. The whole scope, including the admin panel, is handed over at once so the codebase is organized for all of it from the start.

---

## 2. What VaultZombie is

A web app where a host creates a "vault" for a life event, guests submit sealed text predictions about the future, and those predictions unlock on a schedule over weeks, months, or years. Recipients read what was predicted, the outcome is recorded, and a running "who knew you best" scoreboard tracks who called it.

Text predictions only. No video, no audio. One optional cover photo per vault on paid plans (see section 10).

It works for ten different life events, not just weddings.

---

## 3. User roles

**Operator.** The account holder who builds and manages a vault. Has a login. Usually the person or couple the vault is about, but can be a gifter who then hands it over. The operator also resolves outcomes at each reveal (see section 8).

**Guest.** Answers prompts at the event. No login, no account, no app install. Reaches everything by scanning a QR code or opening a link.

**Gifter.** A third party who buys a vault as a gift. Pays for it, receives a redeemable code, and the recipient redeems it and builds their own prompts.

**Admin.** VaultZombie staff, today a staff of one. Manages vault types, sub-categories, and questions from an admin panel with no code changes, plus billing, support, lifecycle, backup, and the audit log, all specified in `VaultZombie-Admin-Panel-Brief.md`. In the ordinary course the admin sees counts and metadata only, never sealed answer content. The one sanctioned exception is the manual unlock control in the admin panel brief, which deliberately opens a vault early, is MFA-gated, and is written to the audit log every time (see section 13).

---

## 4. The reveal schedule engine

This is the heart of the product.

### How it works

1. At setup, the operator picks **one reveal schedule** (the tempo) from the schedules their plan unlocks.
2. That schedule defines a fixed set of **reveal dates** for the vault.
3. When a guest answers a prompt, the timing buttons they see are the reveal dates of that schedule. A weekly vault shows weeks. An annual vault shows years.
4. The guest picks one reveal date per answer.
5. On each reveal date, every answer assigned to that date unlocks together.

### The five schedules

| Schedule | How it unlocks | Guest picks | Best for |
|---|---|---|---|
| Weekly Sprint | A reveal every week for 8 weeks | Which week | Short, fun events |
| Monthly x3 | A reveal each month for 3 months | Which month | The free tier taste |
| Monthly Year | A reveal every month for 13 months | Which month | A full first-year ritual |
| Half-then-Annual | One reveal at 6 months, then every anniversary | 6 months, or a specific year | Long-range vaults with an early payoff |
| Annual Keepsake | A reveal every year up to the plan limit | Which year | Classic long-range life vault |

A schedule never runs past the plan's duration limit. An Annual Keepsake vault on a Safe plan produces year 1, 2, and 3 only.

### The anchor date

Every reveal date is calculated from an **anchor date** the operator sets during setup, labeled in the UI as the event date.

For a wedding, the anchor is the wedding day, so anniversaries land on the anniversary. For a New Year vault, the anchor is January 1. For a baby shower, the anchor is the due date or the birth.

If the operator does not set an anchor, it defaults to the date the vault is sealed. The anchor is editable up until the vault is sealed and locked permanently after that.

### The milestone reveal

Deep Vault includes a **milestone** reveal on top of its schedule. The milestone is a single operator-chosen date set at setup, the grand finale of the vault. Examples: a tenth anniversary, the day a child turns 18, a graduation day.

The milestone reveal presents the grand summary: the final scoreboard winner and a full archive of every prediction and its outcome.

### How unlocking is implemented

**Do not build unlocking as a scheduled job that flips a flag.**

Each answer stores an `unlock_at` timestamp, calculated at submission time from the vault's anchor date, its schedule, and the slot the guest picked. Every read of answer content filters on the unlock condition described in section 13.

Unlocked is a computed condition, never stored state. This means there is no job to run, no state to corrupt, and a vault nobody touches for five years still opens correctly on its own.

The only scheduled work in the entire system is sending notification emails on reveal days. If that job runs late, nothing breaks, because the reveal is already open. The email only announces it.

---

## 5. Pricing and plans

One-time payments. No subscriptions. All tiers giftable. Prices held deliberately under the closest competitor (Foreverbox at $29 and $69) at every step.

| Tier | Guests | Schedules unlocked | Runs up to | Price |
|---|---|---|---|---|
| **Lockbox** (free) | 10 | Weekly Sprint, or Monthly x3 | 3 months | $0 |
| **Safe** | 50 | above, plus Monthly Year and Half-then-Annual | 3 years | $19 |
| **Vault** | 100 | all schedules | 5 years | $39 |
| **Deep Vault** | 250 | all schedules | 10 years, plus milestone | $59 |

Each paid tier is cumulative: it adds to the schedules of the tiers below it.

The plan sets three things: the guest cap, which schedules the operator can choose from, and how far the chosen schedule runs. All three must flow through to the guest screen, since the guest's timing buttons are generated from the operator's schedule and plan limit.

**Note on the free tier.** Lockbox at 10 guests over 3 months is a genuine short-event product, not a crippled wedding vault. A wedding needs a paid tier. This is intentional.

### Soft cap behavior

If a live event exceeds its guest limit, **still accept the overage answers during the event.** Never hard-stop a guest mid-reception.

Afterward, flag the operator and offer an upgrade. If they upgrade, all answers are kept. If they decline, the overage is permanently removed, and the answers culled are the last-submitted ones over the cap.

### Gifting

A gifter buys Safe, Vault, or Deep Vault as a gift and receives a redeemable code plus a printable gift card. The recipient redeems the code, becomes the operator, and builds their own prompts. The gifter is notified when the vault is activated.

---

## 6. Flow 1: Operator setup

1. Sign up and log in.
2. Create a vault and choose a vault type from the ten available.
3. Set the vault subject names. These fill the name tokens in the prompts (see section 9). A Marriage vault asks for two names, a College vault asks for one, a New Business vault asks for a business name and a founder name.
4. Set the **anchor date** (the event date).
5. Choose a plan.
6. Choose a **reveal schedule** from those the plan unlocks. The screen should preview the actual reveal dates this produces, in plain language, before the operator commits.
7. Curate prompts. Browse the question bank for that vault type, organized by sub-category, toggle prompts on or off, and optionally add custom prompts.
8. Choose the **guest screen layout** (see section 7): one prompt at a time, or all prompts on one page. Defaults to one prompt at a time. The operator can change this at any time, including after sealing, since it changes presentation only, never content or timing.
9. Optionally upload a cover photo, or pick a cover from the built-in art library (see section 10).
10. Get a QR code, a shareable link, and printable card designs.
11. Seal and go live.

Once sealed, the anchor date, the schedule, the plan, and the prompt set are locked. The vault is live and guests can answer.

Setup also carries the per-question metadata scoring needs. Every number question gets a unit, a minimum, a maximum, and a close band. Every free-text question is flagged scoreable or keepsake. See sections 8 and 9.

## 7. Flow 2: Guest answering

1. Scan the QR code or open the link. No login, ever.
2. See the vault's prompts with the real names filled in.
3. Answer any subset. Minimum one. Never forced to answer all.
4. For each answer, pick a reveal date from the buttons the vault's schedule produces.
5. Submit once. Every answer in the submission seals at that moment.
6. Leave an email to be notified when the prediction unlocks. **Email is on by default.** A guest can opt out, but the opt-out carries a plain warning that skipping it means no unlock notice and no outcome updates, since results are never shown back through the guest link (see sections 11 and 13).

The whole thing should take about 60 seconds. This is the highest-traffic surface in the product and it runs at a live event on phone data, so it must be fast and it must never require a round trip the guest waits on.

### Two layouts, operator's choice

The guest screen has two layouts. Both collect the same answers and the same reveal-date picks, and both end in the single submit above. The operator picks which one their guests see (section 6, step 8).

- **One prompt at a time (the default).** One prompt per screen with a progress indicator ("3 of 18"), a skip control, and next and back controls. Suits a phone at a reception. Moving between prompts never waits on the network.
- **All prompts on one page.** Every enabled prompt on one scrolling page, each with its own answer field and reveal-date buttons, and one submit at the bottom. Suits a laptop or a guest who wants to see everything at once.

The operator can switch between the two at any time. The switch is presentation only and does not affect sealed answers, timing, or scoring.

### Leaving before submitting

The header logo on the guest screen links to the marketing home page (section 15). If a guest activates it, or otherwise navigates away, while they have answers that are not yet submitted, show a confirmation asking whether they want to leave before sealing their predictions, with a clear stay option. Do not use the browser's native dialog for this; build it in the product so it can be styled and worded.

### Returning to where they left off

Answers in progress are saved as a draft in the guest's browser (local storage on that device, keyed to the vault link) as the guest types and taps. If the guest leaves, loses signal, or closes the tab and later reopens the same link on the same device, the draft is restored and the guest picks up where they left off, with a short note saying so. The draft is cleared on successful submit. Nothing is written to the server until submit, so the sealed rule and the write-only guest link (section 13) are untouched. A draft cannot follow a guest to a different device, because guests have no identity to attach it to. That limitation is accepted.

### The growth link

On the guest confirmation screen, and on every guest email, a "create your own vault" link invites the guest to start their own. On the guest screen it reads "Having fun? Sign up for your own Vault" as a button that opens the create-your-own flow. The link carries a referrer code so signups can be attributed back to the originating vault, but it earns no reward of any kind. That attribution is visible on the admin dashboard only, never to the operator, since there is no payout to report to them. Because nothing is rewarded, there is still nothing to farm. It is passive organic growth with staff-side measurement, not a rewarded referral program. See sections 11, 16, and 17.

## 8. Flow 3: Reveals and scoring

### 8.1 How a reveal runs

1. On each reveal date, the batch of answers assigned to that date unlocks.
2. The operator gets an email that a reveal is ready, and a nudge if it stays unopened after a few days.
3. The operator resolves the reveal. Outcomes feed the "who knew you best" scoreboard across all guests.
4. Guests who are on email get a note that their prediction just unlocked, and later that the outcome is in.
5. At the final reveal, or at the milestone on Deep Vault, the vault presents the grand summary: the overall scoreboard winner and a full archive of every prediction and its outcome.

### 8.2 The scoring model, structured questions

The operator does **not** mark every guest answer by hand. The operator enters the real outcome **once per question**, and the software applies it to every guest. There is no per-guest work on structured questions.

- **Number.** An exact match is a jackpot. A value inside the question's close band is close. A value beyond the band is a miss.
- **Name-pick and multiple choice.** The true option is a jackpot, every other option is a miss. There is no close tier, because the options are not ordered.

Every software verdict is a starting point the operator can override. Auto-scored structured questions arrive pre-marked on the reveal report.

### 8.3 The scoring model, free text

Every free-text prompt is flagged at import as one of two kinds (see section 9).

- **Scoreable.** A real answer exists, for example a city or a first child's name. These feed the scoreboard.
- **Keepsake.** No right answer exists, for example "one prediction nobody would guess." These never feed the scoreboard.

For **scoreable** free text, the software removes the per-guest chore two ways working together:

- **Grouping.** Matching answers collapse into one cluster. Six spellings of Austin become a single cluster the operator judges once.
- **Pre-sort.** The operator types the true answer, and the software marks each cluster against it, color coded for likely jackpot, likely sort-of, and likely miss.

The operator confirms or overrides **per cluster, never per guest.** Every software verdict is a suggestion the operator can flip with one tap. Scoreable free text uses the same three tiers as numbers: came true, sort of, and nope, mapping to full, half, and zero.

For **keepsake** free text:

- Guests see that a prompt is a keepsake, framed as an invitation ("just for fun, no wrong answer") rather than a disclaimer, to protect answer quality. This wording is the house style for keepsakes.
- Keepsakes are shown to everyone at the reveal and never affect the scoreboard.

### 8.4 The outcome record, the scoreboard, and the reports

Every resolved question produces an outcome record: the tier (full, half, or zero), and an optional **operator note**, capped at 140 characters, the operator's own account of what actually happened. The note renders wherever that outcome is shown.

The "who knew you best" board sums full, half, and zero across every scored answer. Keepsakes add nothing. Weighting is jackpot full, close half, miss zero, so near-misses climb the board and wild guesses do not.

Every results surface, its components, the charts, and how each report gates by tier are specified in `VaultZombie-Report-Design-Guide.md`, handed to the builder in the same set. The report layer reads only unlocked outcome records through the single unlocked-content path, and the operator health dashboard shows counts and metadata only. In summary, and confirmed in the report guide:

- The vault health dashboard, the reveal report, and per-question detail are available on all tiers.
- The rich vault results summary is full depth on paid tiers, trimmed on Lockbox.
- The scoreboard and the by-area breakdown are paid tiers.
- The reveal timeline needs at least two reveals, so it appears on the multi-reveal schedules, which is Safe and above.
- The grand summary is the Deep Vault milestone report with the certificate keepsake. Other paid tiers close on a final-reveal summary using the same visuals without the milestone certificate.
- The guest personal report reaches each guest by email, and the operator can view it per guest.

### 8.5 Keepsake and all-answers report behavior by tier

- **Free tier (Lockbox).** A plain on-screen display of keepsake answers at the reveal. No PDF, no printable or savable report. Screenshots are possible and acceptable, since keepsakes are not sealed content.
- **Paid tiers.** A compiled all-answers report, scored answers and keepsakes together in one place, savable and printable through the browser's print-to-PDF (see section 14).
- **Constraint.** Any all-answers report can only be complete at the final or milestone reveal, because everything before that is still sealed. It behaves as a running archive that fills in as reveals land and is whole at the end. The sealed rule does not bend for keepsakes.

---

## 9. Content model

### Three levels, fully admin-managed

**Vault type** → **Sub-category** → **Question**

All three levels must be addable, editable, reorderable, and retirable from the admin panel with no code changes. Nothing is hard-coded.

### The ten vault types

| Vault type | Slug | Questions | Sub-categories | Name tokens |
|---|---|---|---|---|
| Marriage (Wedding) | `marriage` | 112 | 8 | `[Partner A]`, `[Partner B]` |
| Couple | `couple` | 104 | 8 | `[Partner A]`, `[Partner B]` |
| New Baby | `baby` | 96 | 8 | `[Baby]`, `[Parent A]`, `[Parent B]` |
| Child Growth | `child-growth` | 104 | 8 | `[Child]`, `[Parent A]`, `[Parent B]` |
| College | `college` | 96 | 8 | `[Student]` |
| Job / Occupation | `job` | 96 | 8 | `[Person]` |
| Travel | `travel` | 96 | 8 | `[Traveler]` |
| Retirement | `retirement` | 96 | 8 | `[Retiree]` |
| New Business / Startup | `new-business` | 96 | 8 | `[Business]`, `[Founder]` |
| New Year / Year Ahead | `new-year` | 96 | 8 | `[Person]`, `[Year]` |

Sub-category names are listed in each question bank document and should be imported verbatim. Sub-categories are scoped to their vault type, never global. Three vault types (College, Job, Retirement) each have a sub-category named "Wildcards & Milestones," and they are three different sub-categories.

### Question identity

**The `#` column in the question bank tables is not an identifier.** It restarts at 1 in every sub-category of every document, so it is ambiguous across the 80 tables in the set.

Every question gets a generated permanent ID at import that never changes. Display order is a separate sortable field. Reordering questions in the admin panel changes display order and never touches identity, so existing answers stay attached to the right question.

Multiple choice **options** also get permanent IDs. Options are stored as an array, never as a delimited string. This matters because editing an option's wording must not orphan the answers already given to it, and because scoring needs a stable key.

### Answer types

| Type | Behavior | Stored |
|---|---|---|
| **Free text** | Hard cap 140 characters, enforced server side | The string |
| **Number** | Numeric entry with unit, minimum, maximum, and close band | The number |
| **Multiple choice** | Defined option set, single select | The option ID |
| **Name-pick** | Choose between the vault's named people, plus extras like Both or Neither | The option ID |

**Number fields need metadata the question banks do not carry.** In the source documents, units appear inside the prompt text when they appear at all, and several questions ("At what age will [Child] learn to swim?") have no unit at all. Every number question needs a unit, a minimum, a maximum, and a **close band** set in the admin panel at import. The close band is what makes a near-miss score as close rather than a miss. Without bounds and a band, guests can enter anything and scoring is meaningless.

**Free-text questions need a scoreable-or-keepsake flag.** Every free-text question is flagged at import as scoreable (a real answer exists, it feeds the scoreboard) or keepsake (no right answer, never scored). See section 8.3.

**Name-pick and multiple choice are the same control underneath.** Several questions in the Marriage and Couple banks are typed "Multiple choice" but carry Partner A and Partner B in their options. Treat Name-pick as multiple choice whose options contain name tokens.

### Name substitution

The question banks use several different token conventions, some bracketed and some not. **Normalize them all to a single bracketed form at import**, as listed in the vault type table above. Specifically:

- `Partner A` and `Partner B` (unbracketed in the Marriage and Couple banks) become `[Partner A]` and `[Partner B]`.
- `Parent A` and `Parent B` (unbracketed in the Baby and Child Growth banks) become `[Parent A]` and `[Parent B]`.
- `the baby` (plain prose in the Baby bank, declared as a placeholder in that document's intro) becomes `[Baby]`.
- `[Child]`, `[Student]`, `[Person]`, `[Traveler]`, `[Retiree]`, `[Business]`, `[Founder]` are already correct.
- `[Year]` appears in the New Year bank, already bracketed. It resolves to a calendar year, not a name. The vault computes it per reveal date: for a reveal that lands on January 1, `[Year]` is the year that just ended; for any other reveal date, it is the year the reveal date falls in. So a New Year vault on an annual schedule anchored January 1, 2027 reads "Will [Person] change jobs in 2027?" on its first reveal, "in 2028?" on its second, and so on. This is what lets a New Year vault run several New Years out, not just the next one.

**Substitution must run over both prompt text and option strings.** Do not use the answer type to decide whether to substitute. Several "Multiple choice" questions carry name tokens in their options, and the New Business bank has a token inside an option ("Yes / No / [Founder] will never sell").

Possessives are written as `[Token]'s` with the apostrophe outside the bracket. Substitution replaces the token and leaves the apostrophe-s in place.

### Retirable questions

Some questions need to be switchable off per vault, not just per type. The Baby bank's "Boy or girl?" question is the worked example: the family may already know, or may prefer to skip it. Every question carries an enabled flag the operator can toggle during curation.

One option string in the Baby bank contains a builder instruction inside guest-facing text: `A surprise to everyone (retire if already known)`. Strip the parenthetical at import. It must never render to a guest.

### Short-fit and long-fit tagging

Each question can carry a short-fit or long-fit tag so the app can suggest prompts that suit the chosen schedule. A weekly vault wants near-term prompts, an annual vault wants the big ones.

**At launch: build the field, leave it unpopulated.** The schema carries the tag and the admin panel can set it, but launch ships showing the operator every question for their vault type and letting them curate. The tag becomes a suggestion feature later, once there is real usage to learn from. This avoids a tagging pass over 992 questions before launch.

---

## 10. Cover art and photos

Every vault has one cover image. There are two ways to get one.

**Free plans: the built-in art library.** Flat single-color CC0 silhouettes, sourced and licensed per `VaultZombie-Art-Assets.md`. On import, every silhouette is normalized to a single flat token color so covers recolor cleanly to the vault's theme and the whole library reads as one set.

**Paid plans (Safe, Vault, Deep Vault): the operator can upload one photo instead.** One image per vault. The operator uploads it, never a guest. Stored in Replit object storage.

Upload handling, all required:

- Validate file type by content, not by file extension.
- Cap file size.
- **Strip EXIF metadata on upload.** Phone photos carry GPS coordinates. A wedding photo that pins someone's home address is the one real privacy risk in this product.
- Store under a randomly generated filename, never a guessable one.
- Re-encode and resize server side.

The cover image is **not sealed content.** It is shown to guests at the event and displayed on the vault. It does not participate in the reveal schedule.

**Art coverage gap:** the art library currently covers 5 of the 10 vault types (Marriage, Couple, New Baby, Child Growth, College). Job, Travel, Retirement, New Business, and New Year have no cover art yet. All ten types ship at launch, so art for the remaining five is needed first. Sourced the same way, from the same three CC0 sources, under the same silhouette-and-recolor rule.

---

## 11. Emails (Resend)

**Operator:** vault created; vault sealed and ready to share; a reveal is ready; a nudge if a reveal stays unopened after a few days; guest cap exceeded with an upgrade offer.

**Guest** (email is on by default, opt-out only, see section 7): thanks for your prediction; your prediction just unlocked; the outcome is in, carrying the tier and the operator note. Every guest email also carries the "create your own vault" link described in section 7, with its referrer code for admin-side attribution.

**Gifter:** gift purchase receipt; the recipient activated the vault.

All email is transactional. No marketing sends at launch. The "create your own vault" link rides inside the transactional guest emails and is not a marketing send. There is no weekly summary or digest email at launch.

---

## 12. Payments (Stripe)

Stripe direct, live at launch. One-time payments through Stripe Checkout, so card data never touches VaultZombie servers.

RevenueCat was considered and rejected. It exists mainly to handle Apple App Store and Google Play in-app purchase billing. VaultZombie is a web app, so RevenueCat would add a layer on top of a processor rather than replacing one.

Gift purchases generate a redemption code on successful payment. Codes are single use, do not expire, and are tied to the tier purchased.

---

## 13. Security and privacy

The threat model for this product is **premature disclosure**, not payment fraud. The entire promise is "sealed until the date." Everything below serves that.

### The sealed rule

**No endpoint anywhere returns sealed answer content to an operator, a recipient, a guest, or a support tool.** Enforce it once at the data layer, in a single read path. Do not enforce it in the UI, and do not enforce it in more than one place.

The single read path filters on `COALESCE(unlock_override_at, unlock_at) <= now()`. `unlock_at` is computed at submission (section 4). `unlock_override_at` is null for every answer except those the admin has deliberately force-unlocked through the manual unlock control specified in `VaultZombie-Admin-Panel-Brief.md`; reseal sets it back to null. That control is the one sanctioned exception to the sealed rule: it is admin-only, MFA-gated, type-to-confirm, requires a written reason, and is written to the append-only audit log. No operator, guest, or gifter has any path to it. Because the admin can open a vault, the admin can then read it, and that is accepted: the person holding the override is the business owner.

Where the admin panel or the operator dashboard shows vault health, it gets **counts and metadata only**, never answer text. "12 predictions sealed, 4 guests waiting" is the right level of detail.

### The public promise

Site copy, help text, and product microcopy state the promise as it applies to users: no guest, operator, or gifter can read a prediction before its reveal date, and dashboards show counts, never the words inside. Do not write copy claiming that nobody at VaultZombie can open a vault, since the admin override exists. Do not advertise the override on product or marketing pages either. The terms and privacy documents will describe it; those documents are written after the build and are not part of this hand-off.

### Guest links are write-only

The guest QR link is a bearer token: anyone holding it can use it, which is the design. Scope it so that it can **create an answer and can never read one.** Reading answers and writing answers are separate routes with separate permission checks.

A guest link that leaks publicly must be worth nothing to whoever finds it. This is also why guest email matters: results are never shown back through the guest link, so email is the only channel that carries an unlock notice or an outcome to a guest.

### Abuse protection on the guest form

The guest form is public with no login, so it needs protection, handled in-house with no third party service:

- **Rate limiting** per link and per source, so a script cannot flood a vault.
- **A per-vault hard ceiling** on total answers, set well above the tier's guest cap.
- **A honeypot field**, hidden from human eyes with CSS. Guests never see it and never fill it. Automated scripts fill every field they find, so anything arriving with it filled is silently dropped.

No CAPTCHA vendor at launch. The deciding factor is that the guest submission window is a live event: a third party sitting in the middle of the guest form means an outage at their end takes down someone's wedding reception, with no way to fix it in the moment. If real abuse appears later, Cloudflare Turnstile is roughly an hour of work to add.

### Data minimization

Guest email is collected by default, with an opt-out that warns the guest they will lose their unlock notice and outcome updates. It is the only guest contact detail stored. Free text is capped at 140 characters. There are no guest accounts, no addresses, no phone numbers, and no uploads from guests. The guest draft described in section 7 lives only in the guest's own browser and never reaches the server. The less that is stored, the less there is to lose.

### Auth

Clerk handles operator accounts and login. Guests never authenticate. Admin access is a separate role with its own gate and enforced TOTP MFA, per the admin panel brief, and admin does not imply the ability to read sealed content outside the manual unlock control.

### Backup

The owner-held backup specified in the admin panel brief captures the full dataset, including sealed answers, as plaintext into a dedicated private GitHub repository. The repository and its write-scoped token are treated as sensitive as the database itself.

---

## 14. Technology and third-party policy

**The policy: keep the dependency surface deliberately small.** Every third party service is a thing that changes underneath the product on someone else's schedule, and every npm package is a stream of security advisories. Fewer of both.

### Approved services, the complete list

| Service | Purpose |
|---|---|
| Clerk | Operator authentication, and admin authentication with enforced TOTP |
| Resend | Transactional email |
| Stripe | Payments, and billing reads and refunds for the admin panel |
| Replit Postgres | Database |
| Replit object storage | Cover photo uploads |
| GitHub (one private repository) | Destination for the admin panel's manual backup push only. Not a runtime dependency of the product. |

**Nothing else.** Anything not on this list needs a decision before it is added.

### Explicitly not used, and what replaces each

| Not used | Instead |
|---|---|
| S3, Cloudinary, Uploadthing | Replit object storage |
| Any QR code web service | Generate QR codes in the app. Vault links must never pass through a third party. |
| Any PDF generation service or library | Print-styled HTML pages. The browser's own print-to-PDF handles gift cards, printable table cards, and the archive. |
| Any charting library | Charts are hand-built in SVG and CSS, per the report design guide. |
| Any CAPTCHA vendor | In-house rate limiting, cap, and honeypot (section 13) |
| Any cron or job scheduling service | Unlocking is computed, not scheduled (section 4). Reveal emails are the only scheduled job. The backup push is manual. |
| Analytics, session recording, heatmaps | Nothing at launch |
| A date library | The platform's own Intl and date handling |

### Package discipline

Most security update noise comes from transitive dependencies, not from vendors. Keep the tree small and boring: one UI library rather than three, no utility library that duplicates what the language already does, no package added to save five lines. Pin versions and update on a deliberate schedule rather than reacting to every advisory as it lands.

---

## 15. Design system

`vaultzombie-style-guide.html` (v1) is the source of truth for color, typography, radius, and the components it defines. It is a specimen page rather than a token export, so the following must be added. The report layer builds on these base tokens and is fully specified in `VaultZombie-Report-Design-Guide.md`.

### What the style guide provides

Ten color tokens across Foundation (`--ink #1C1B19`, `--parchment #F6F4F0`, `--white #FFFFFF`, `--text-2 #55514A`, `--gray #8A857C`, `--hairline #E4DED4`) and Accent (`--bronze #8A6D3B`, `--brass #C9A96A`, `--brass-lt #E7D6B4`, `--bronze-wash #F0E9DC`).

Two typefaces from Google Fonts: **Tilt Warp** for display only, and **Afacad Flux** (variable, 100 to 1000) for everything functional. A seven-level type scale. Radius tokens from 6px to pill. A 4px spacing scale. No shadows anywhere: elevation comes from hairline borders and background contrast, and that is the design intent.

Components defined: masthead, panel, three button variants, eyebrow badge, vault card, prompt chip.

Rules to hold to, from the guide: save Tilt Warp for the wordmark, the hero, and the reveal moment, never for functional headings. Never set body copy in bronze, it fails contrast at small sizes. One primary action per view. Keep neutrals warm, no cool grays.

### How to read the mockups

The three `mockup_*.html` files show what each screen contains, how it is laid out, and how the product should feel beyond base color and type. They are guidance, not exact specs. Build the screens they show, with the content and controls they show, on the style guide's tokens. Specifically:

- The mockups use a rust-orange accent (`#C4573A`), a third script typeface (Caveat), box shadows, and a larger radius scale. None of those are adopted. Use the style guide's Ink and Brass primary button, its two typefaces, no shadows, and its radius scale.
- Where a mockup and this brief disagree on content or behavior, this brief wins. Examples: the guest screen has two layouts (section 7), the growth button copy is the copy in section 7, cover photo upload is on every paid tier (section 10), there is no weekly summary email (section 11), and the admin panel's full scope is the admin panel brief.
- The sub-category names shown in mockup tables are sample data. Import sub-category names verbatim from the question banks.
- The mockups' warm success and error greens and rusts match the semantic tokens below.

### What must be added to it

- **Spacing as variables.** The 4px scale (4, 8, 12, 16, 24, 32, 48) is documented as bars, not tokens.
- **Semantic colors.** None exist. Promote the two hexes already used in the guide's do-and-don't list: `#4E7A46` for success and `#A24B3A` for error. A warning color needs picking from the same warm family. The report design guide already defines the full semantic and tint set built on these two.
- **Form components.** There is no input, textarea, label, validation state, or error message spec anywhere, and this is a product built on people typing things. The guide gives only the 8px radius for inputs. The mockups show workable input, label, help text, and character counter treatments; adopt those shapes on the style guide's tokens.
- **Focus-visible styles.** None exist. This is an accessibility requirement, not a nicety.
- **The vault and seal visuals.** The central metaphor of the product currently has no component in the style guide. The report design guide provides the wax seal, sealed and opened, as the report hero mark, which is the first built form of this metaphor. A general lock, seal, countdown, and reveal treatment for the product surfaces beyond the report still needs design.
- **Per-vault theme colors.** The art system normalizes silhouettes to a single token color specifically so covers can recolor per vault theme, but no per-vault theme palette exists yet. The report layer reads a single `--vault-accent` token, defaulting to bronze, so a palette drops in later without a rebuild. The palette itself is still to be chosen (section 19).
- **Breakpoints.** The guide gives a 680px content measure and nothing else.

No dark mode at launch.

### The logo and the wordmark

`vault_zombie_png.png` is the logo: a round vault-door emblem with the zombie silhouette in the center. It appears at the top left of the header on every surface (marketing site, operator app, guest screens, admin panel), next to the wordmark. Clicking or tapping the logo returns the user to the marketing home page. On the guest answering screen that click first triggers the leave-confirmation described in section 7 when there are unsubmitted answers. Serve it as a resized web asset (and a favicon derived from it), never the full-size original.

The wordmark is set in Tilt Warp, one word, no space: "Vault" in Parchment and "Zombie" in Brass, on an Ink field. A light-background variant needs deriving, most likely Ink and Bronze, since Brass on Parchment fails contrast.

### The mascot

The zombie opening a safe, used as the brand character and kept as provided; the logo above is its emblem form. Note that the style guide does not include it. The register of the design system is heirloom and archival rather than horror, and the mascot is a light personality accent inside that, not a spooky theme. It works equally for a wedding, a new baby, or a college vault.

### Voice

Playful microcopy at the fun moments: sealing, a reveal unlocking, the scoreboard. Calm and clear everywhere else. The lexicon from the style guide: seal, sealed, locked, unlock, open, drop, called it, vault.

Two surfaces, same skin. **Operator side:** a calm, clear dashboard for careful setup and periodic return visits. **Guest side:** one big, friendly, fast screen.

---

## 16. Admin panel

VaultZombie staff, not operators. The full specification is `VaultZombie-Admin-Panel-Brief.md`, which covers MFA-gated access, the manual unlock and reseal control, owner billing and revenue, the operator billing view, admin reports, content management, vault health, support, lifecycle, the append-only audit log, and the owner-held backup. Build the whole panel in this build, as a gated route in the same application.

The content management portion, restated here so the content model in section 9 is complete, must support with no code changes:

- Add, edit, reorder, and retire vault types, sub-categories, and questions.
- Set answer type, options, number units, bounds, and close band, the free-text scoreable-or-keepsake flag, and the short-fit / long-fit tag per question.
- Import the ten question banks from their source documents.
- View vault health as counts and metadata only, never sealed answer content (outside the manual unlock control).
- Manage plans, prices, and gift codes.
- View referral attribution: how many guests followed each vault's "create your own vault" link and went on to sign up, as counts and metadata only. Admin-only, never surfaced to operators, and tied to no reward.

---

## 17. Out of scope for launch

- A printed "book of predictions and how they turned out" keepsake at the milestone. Planned future upsell, noted so it does not get built now. This is distinct from the print-to-PDF archive, which does ship (sections 8.5 and 14).
- Group vaults with multiple subjects in one vault. The New Year bank mentions running it once per person; launch treats that as one vault per subject.
- Short-fit / long-fit prompt suggestions. The field ships, the feature does not (section 9).
- Native mobile apps. The guest experience is a web page reached by QR code.
- Dark mode.
- Marketing email and analytics.
- Guest drafts that follow a guest across devices (section 7). The draft lives in one browser only.
- The terms of service and privacy policy documents. Written after the build.
- **A rewarded referral program.** No earned credit, no operator-facing tally, no payout, no referral gate. What ships instead is the "create your own vault" link on the guest confirmation screen and guest emails (sections 7 and 11). It carries a referrer code so staff can attribute signups on the admin dashboard (section 16), but no reward, so there is still nothing to farm.

---

## 18. Decisions made in writing this brief

These were not specified in any single source document, or they resolve a question that was previously open. They are recorded here so they can be changed deliberately rather than discovered later.

| # | Decision | Why |
|---|---|---|
| 1 | Unlocking is computed from `unlock_at`, never a stored flag set by a job | No job to fail, no state to corrupt, a dormant vault still opens correctly years later |
| 2 | The operator sets an anchor date at setup; reveal dates are calculated from it, defaulting to the seal date | Otherwise anniversaries land on the day the vault was sealed rather than the wedding day |
| 3 | Milestone is a single operator-chosen date on Deep Vault, and triggers the grand summary | The source documents name "milestone" but never define it |
| 4 | Questions and options get generated permanent IDs; display order is separate | The `#` column restarts at 1 in all 80 tables and cannot be an identifier |
| 5 | All name tokens normalized to one bracketed form at import | The banks use three different conventions, some unbracketed |
| 6 | `[Year]` token added for the New Year bank | Lets "in 2027" and "by the end of 2028" resolve correctly at any horizon |
| 7 | Substitution runs over option strings as well as prompt text | Tokens appear inside options in three of the banks |
| 8 | Short-fit / long-fit field ships unpopulated at launch | Avoids a tagging pass over 992 questions before launch |
| 9 | In-house rate limit, cap, and honeypot instead of a CAPTCHA vendor | A third party in the guest form can take down a live reception with no recovery |
| 10 | Print-styled HTML instead of a PDF library or service for all printables | Fewer dependencies, easier to restyle |
| 11 | Number questions need unit, minimum, maximum, and a close band set at import | The banks carry no number metadata at all, and the band is what makes a near-miss score as close |
| 12 | Success `#4E7A46` and error `#A24B3A` promoted to semantic tokens | The only semantic colors the style guide has ever used |
| 13 | The operator enters the true outcome once per structured question; the software scores every guest from it | Removes the per-guest marking chore that was the biggest concern with the reveal experience |
| 14 | Every free-text question is flagged scoreable or keepsake at import | Keepsakes have no right answer and must never feed the scoreboard |
| 15 | Scoreable free text is grouped into clusters and pre-sorted against the operator's true answer; the operator confirms per cluster, never per guest | Collapses many spellings of one answer into one judgment |
| 16 | Scoreboard weighting is full, half, zero (jackpot, close, miss); keepsakes weigh nothing | Near-misses climb the board and wild guesses do not |
| 17 | The all-answers report is a running archive, complete only at the final or milestone reveal | The sealed rule does not bend for keepsakes, so nothing before the last reveal can be whole |
| 18 | Guest email is on by default, opt-out only with a warning | Results are never shown through the guest link, so email is the only way a guest learns of an unlock or outcome, and it is the passive growth channel; this reverses the earlier optional-email stance deliberately |
| 19 | The rewarded referral program is scrapped; the "create your own vault" link on the guest confirmation screen and guest emails is the only growth loop, and it carries a referrer code for admin-side attribution only | Removing the reward removes the operator-facing tally, the gate, and the free-vault farming risk, while keeping a lightweight referrer code so staff can measure the loop, plus a zero-cost passive advertiser |
| 20 | The report layer lives in `VaultZombie-Report-Design-Guide.md` and its assembled reference `vaultzombie-report-rich.html`; charts are hand-built in SVG and CSS | Keeps the master brief lean and the dependency surface small |
| 21 | The operator note is capped at 140 characters and renders wherever an outcome is shown | Matches the free-text cap and gives every resolved question the operator's own account |
| 22 | The admin panel brief is part of this hand-off, and the sealed rule's single read path is `COALESCE(unlock_override_at, unlock_at) <= now()` with the manual unlock as the one sanctioned exception | The builder needs the whole scope at once to organize the code; the override keeps the computed-unlock model and single read path intact |
| 23 | The public promise is stated for users (no guest, operator, or gifter can open early), never as "nobody at VaultZombie can" | The admin override exists; site copy must not overstate, and the override is disclosed in the terms and privacy documents rather than advertised |
| 24 | The guest screen ships two layouts, one prompt at a time and all on one page, chosen by the operator per vault, defaulting to one at a time, switchable any time | Phones at a reception and laptops at home want different things, and the choice is added value for the operator; the switch is presentation only |
| 25 | Leaving the guest screen with unsubmitted answers triggers an in-product confirmation; answers in progress are drafted in the guest's browser and restored when the same link is reopened on the same device | A stray tap on the header logo must not cost a guest their work; a server-side draft would need a guest identity, which the product deliberately does not have |
| 26 | The mockups are guidance for layout and feel; the style guide is the design baseline, and this brief wins on content and behavior | The mockups carry an unadopted accent color, script typeface, shadows, and sample data |
| 27 | The logo sits top left in every header and links to the marketing home page | Standard placement; the guest screen's leave-confirmation covers the accidental-tap case |

---

## 19. Open items before launch

1. **Cover art for five vault types.** Job, Travel, Retirement, New Business, and New Year have none. Same three CC0 sources, same silhouette-and-recolor rule.
2. **The seal and reveal visual language beyond the report.** The report design guide provides the wax seal for reports. The lock, countdown, and reveal treatment for the product surfaces (setup, the guest screen, the dashboard) still need design.
3. **Number units, bounds, and close bands** for every number question across the ten banks.
4. **The scoreable-or-keepsake flag** for every free-text question across the ten banks. A content pass, like the number-metadata pass above.
5. **A warning color** to complete the semantic palette.
6. **Per-vault theme colors.** The report reads a single `--vault-accent` token, defaulting to bronze, so the palette drops in without a rebuild. The palette itself still needs choosing. Tracked here and in the report design guide.
7. **The report tier mapping.** Which reports and which depth each tier carries is proposed in the report design guide and summarized in section 8.4. Confirm it, then it locks.
8. **New Year prompt copy review.** The bank's prompts now carry the `[Year]` token. Read the bank once with a five-year vault in mind to confirm every prompt still reads naturally at that horizon.
9. **Terms of service and privacy policy.** Written after the build. They will describe the admin manual unlock and the backup.
