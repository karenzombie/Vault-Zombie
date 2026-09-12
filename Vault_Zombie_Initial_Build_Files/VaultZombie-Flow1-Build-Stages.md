# Vault Zombie: Flow 1 Build, Stages 1 to 5

**Status:** Current and authoritative for everything it covers.

This document builds Flow 1 (Master Build Brief section 6) in five stages: the host dashboard and auth pages, creating a vault, setting it up, covers, and sharing and sealing.

Where this document differs from the Master Build Brief, **this document governs.** Email behavior stays governed by `VaultZombie-Email-Spec.md`.

---

## 0. How to work through this document

**Build one stage at a time, in order. At the end of each stage, STOP and report, then wait for approval before starting the next.** Do not begin a later stage's work early, even when it looks convenient.

Before each stage, audit that stage's section against the current code and report what exists, what is new, what conflicts, and anything you cannot build as written. Then stop and wait. Build only after approval.

### Standing rules for every stage

- **You do not make product decisions.** Anything unspecified, ambiguous, or unbuildable gets reported, and you wait. No invented defaults, fallbacks, or placeholder values, even when the code would work and nothing calls it yet.
- Follow `vaultzombie-style-guide.html` for color, type, and spacing. Never invent new colors.
- Visible copy says "host," never "operator." Internal code, routes, and database names stay as they are.
- Use the copy in this document word for word.
- Do not change Stripe settings, pricing, tiers, reveal schedule logic, or anything built from `VaultZombie-Email-Spec.md`.
- Do not add an npm package without reporting it first.
- Run the typecheck at the end of every stage.
- Do not push to GitHub. The owner pushes from the Replit Git pane.
- Guest links stay write-only. Nothing in this build lets a guest read an answer.
- No third-party QR service and no PDF library. QR codes are generated in the app. Printable output is print-styled HTML through the browser's print-to-PDF.

---

# Stage 1: Site header, auth pages, and the host dashboard

## 1.1 Shared site header

The header lives inside `landing.tsx` today. Extract it into a shared component used by the landing page, the dashboard, the auth pages, and every signed-in page. The guest flow keeps its own minimal header.

The logo pair sits at the left and links to the home page, as today.

**Signed out**, at the right:
- Redeem a gift code → `/gifts/redeem`
- Gift a vault → `/gifts/purchase`
- Sign in → `/sign-in`
- Sign up → `/sign-up`, styled as the primary button, the way "Get started" is today

**Signed in**, at the right:
- My vaults → `/operator`
- Gift a vault → `/gifts/purchase`
- Sign out

"Sign out" ends the Clerk session and returns the host to the home page. It is the only sign-out control in the app.

**Narrow screens.** Below the `sm` breakpoint, show the logo pair and a menu button. The menu opens a panel with every link for the current state, each on its own line, comfortably tappable. At `sm` and above, show the links inline.

**Footer.** The landing footer's links change to the signed-out set above. **"Get started" appears nowhere in the app afterward.**

## 1.2 Sign-up and verification

`/sign-up` keeps its own form. Add the shared header above it in its signed-out state. The form card does not change.

**Fix the redirect.** Today, after the verification code is accepted, nothing moves the host anywhere, and clicking again reports they are already signed in.

1. When sign-up completes and the session becomes active, send the host to `/operator`. The Google path already does this; the email path must match.
2. Opening `/sign-up` while already signed in sends the host to `/operator` instead of showing the form.

## 1.3 Sign-in

`/sign-in` keeps Clerk's component. Add the shared header above it in its signed-out state.

After a successful sign-in, send the host to `/operator`. Opening `/sign-in` while already signed in sends them to `/operator`.

## 1.4 The host dashboard

`/operator` becomes the dashboard, using the shared header in its signed-in state. **Delete the current "Host Login" screen that asks for a Vault ID. Nothing in the app asks a host to type a Vault ID again.**

### With at least one vault

**Heading:** Your vaults

The host's vaults as large cards in a responsive grid. Each card shows:
- The vault name, the most prominent text on the card
- The vault type name beneath it
- A status label: **Draft** or **Sealed**
- The vault type's silhouette from `public/vault-art/`, large and low contrast behind the text, never obscuring it

**Card styling:** Bronze Wash `#F0E9DC` background, Ink text, a 1px Hairline border, and a Brass accent bar along the top edge. All ten vault types use this same treatment. Do not assign different colors to different types.

**Clicking a card:** a draft opens `/operator/vaults/:vaultId/setup` (stage 3). A sealed vault opens `/operator/vaults/:vaultId`.

Below the grid, a **New vault** button leading to `/operator/vaults/new`.

Sort drafts first, then sealed, each group newest first.

### With no vaults

**Heading:** Let's build your first vault

**Below it:** Pick a plan to get started. You can upgrade later, and upgrading only raises your guest limit.

Then the tier chooser (1.5).

### New endpoint

`GET /operator/vaults` returns the signed-in host's vaults: id, name, vault type name, vault type slug, status, and creation date. Only that host's vaults, and never prediction content.

## 1.5 The tier chooser

Shown on the empty dashboard and reused wherever a host picks a plan. Four cards, wide screens side by side and narrow screens stacked, in order: Lockbox, Safe, Vault, Deep Vault.

**Prices** come from `GET /billing/prices`, never hardcoded. Lockbox shows **Free**.

**Each card carries a one-line summary:**
- Lockbox: A free taste, for a small group and a short run.
- Safe: For a full guest list and a few years of reveals.
- Vault: More guests, more tempos, and five years of reveals.
- Deep Vault: The long game, with a finale worth framing.

**Then these six rows, in this order, with the same labels on every card:**

| Row | Lockbox | Safe | Vault | Deep Vault |
|---|---|---|---|---|
| Guests | Up to 10 | Up to 50 | Up to 100 | Up to 250 |
| Reveals run for | 3 months | 3 years | 5 years | 10 years |
| Reveal tempos | Weekly Sprint, Monthly x3 | Those plus Monthly Year and Half-then-Annual | Those plus Annual Keepsake | Those plus Annual Keepsake |
| Reports | Results on screen | Full reports, including the scoreboard, by-area breakdown, and reveal timeline | Full reports, including the scoreboard, by-area breakdown, and reveal timeline | Full reports plus the grand finale keepsake |
| Printable keepsake | Not included | Included | Included | Included |
| Cover photo upload | Not included | Included | Included | Included |

Guest limits and durations read from `PLAN_POLICY`, and tempos from `PLAN_POLICY[tier].schedules`. Never retype them as literals. If any value above disagrees with `PLAN_POLICY`, stop and report rather than changing either one.

**Buttons:** Lockbox reads **Start free**. The others read **Choose [tier name]**. Every button leads to `/operator/vaults/new` carrying the chosen tier.

**Stage 1 does not create a vault and does not start a payment.** `/operator/vaults/new` does not exist until stage 2, and that is expected. Do not build a placeholder for it.

## 1.6 Moving the host reveal screen

`/operator` currently reads `vaultId` from the query string and shows the reveal surface. That screen keeps working but moves to `/operator/vaults/:vaultId`, taking the id from the path.

Update every link pointing at the old form. `/operator?vaultId=` redirects to the new address so old links keep working.

## 1.7 Stage 1 is done when

- The shared header and footer appear across the app with the right links for each state, and the menu works on narrow screens.
- "Get started" appears nowhere.
- Sign-up, verification, and sign-in are branded and all land on `/operator`.
- A signed-in host opening `/sign-up` or `/sign-in` goes to `/operator`.
- Sign out works from the header.
- `/operator` shows vault cards, or the tier chooser when there are none.
- Nothing asks a host to type a Vault ID.
- The reveal screen works at `/operator/vaults/:vaultId`, and old links still reach it.

**STOP. Report and wait for approval.**

---

# Stage 2: Creating a vault

## 2.1 The rule

**Payment comes first. Nothing is created until the money clears.** A host chooses a tier, pays if it is a paid tier, and only then names the vault and enters its details. After paying, the host lands straight in setup for the new vault with a confirmation banner.

This changes the existing model, where a vault was created first and paid for afterward. Both paths below end the same way: an entitlement the host spends on exactly one new vault.

## 2.2 Entitlements

An **entitlement** is the right to create one vault at a given tier. It comes from a completed payment, a redeemed gift code, or choosing Lockbox, which needs no payment.

`billing_records` already allows a null `vaultId`, which lets a paid record exist before its vault. Use that rather than adding a new table. A record with a null `vaultId`, an `operatorId`, a `targetTier`, and an applied status **is** an unspent entitlement. Creating a vault attaches that record to the new vault by setting its `vaultId`, which spends it.

An entitlement:
- Belongs to the host who bought or redeemed it
- Is spent by exactly one vault, and never reused
- Does not expire
- Is never created before payment succeeds

Audit the existing checkout and webhook code before building this, and report anything that conflicts with the above.

## 2.3 `/operator/vaults/new`

**Heading:** Start a new vault

If the host arrived without a tier, show the tier chooser (1.5) first.

### Lockbox

No payment. Go straight to the details form (2.4).

### Paid tiers

If the host already holds an unspent entitlement at that tier, skip payment and go to the details form.

Otherwise start Stripe Checkout for that tier, with no vault attached. Reuse the existing Stripe helper and price lookup. Keep `managed_payments: { enabled: false }`, exactly as the existing calls do.

**On success,** Stripe returns the host to `/operator/vaults/new`. The page waits for the payment to be confirmed by webhook before continuing, showing: **Confirming your payment...** Once confirmed, show the details form with this banner at the top:

> Payment received. Your [tier] plan is ready. Let's set up your vault.

Never rely on the browser's return alone to grant an entitlement. The webhook is what confirms payment, exactly as gifts work today.

**On cancel,** Stripe returns the host to `/operator/vaults/new`, which shows the tier chooser again with this line above it:

> No payment was taken. Pick a plan whenever you're ready.

## 2.4 The details form

Three parts on one screen.

**1. Vault type.** The ten types from `vault_types`, each shown with its name and silhouette. One is selected.

**2. Subject names.** Driven by the chosen type's `requiredSubjectTokens`. A Marriage vault asks for two names, College asks for one, New Business asks for a business name and a founder name. Label each field with the token it fills. All are required.

**3. Vault name.** A single text field, required, host-defined.

As the host types the subject names, fill the vault name field with a suggestion built from them, using the vault type's own pattern (a Marriage vault with Dev and Rosa suggests **Dev and Rosa**). The host can overwrite it freely, and once they edit the field, stop overwriting what they typed. The suggestion is a starting point, never a lock.

**Button:** Create vault

On submit, call `createDraftVault()` with the host's name, tier, and subject values, attach the entitlement, and send the host to `/operator/vaults/:vaultId/setup`.

`createDraftVault()` currently requires a reveal schedule, which the host has not chosen yet at this point. Make the vault's `revealSchedule` nullable so a draft can exist without one, and make it a required input only at sealing, where `sealVault()` already refuses to seal a vault that is not ready. Do not pick a schedule for the host, and do not pass a default.

Creating the vault sends the vault created email (H2), which is already built.

## 2.5 Redeeming a gift code

`/gifts/redeem` currently asks for the Vault ID of a draft the host already made. **Replace that.** A host enters only their gift code.

On a valid, unredeemed code, grant an entitlement at the gifted tier and send the host straight to the details form (2.4) with this banner:

> Your gift is unlocked. Let's set up your [tier] vault.

Invalid, already redeemed, or refunded codes show a plain message and no other detail.

Redemption still sends the gift redeemed email (F3), which is already built.

## 2.6 Stage 2 is done when

- A host can choose Lockbox and reach the details form with no payment.
- A host can pay for a paid tier and land in setup with the confirmation banner.
- An abandoned payment creates nothing and shows the cancel message.
- A gift code creates a vault at the gifted tier with no Vault ID typed anywhere.
- Every new vault has a host-entered name, and the suggestion never overwrites what the host typed.
- H2 and F3 still send.

**STOP. Report and wait for approval.**

---

# Stage 3: Vault setup

`/operator/vaults/:vaultId/setup`, for draft vaults only. A sealed vault opens its vault page instead, except for the date change in 3.5.

The screen carries the shared header and a progress indicator across its parts. The host can move between parts freely and leave at any time. **Everything saves as they go, so a draft is never lost.**

## 3.1 Event date

**Heading:** When's the big day?

A single optional date field.

**Helper text:** Your reveal dates count forward from this day. Leave it blank and they count from the day you seal.

## 3.2 Milestone reveal, Deep Vault only

Deep Vault includes one milestone reveal, a single special date of the host's choosing.

**On Deep Vault, the milestone date and its label are required.** On every other tier, this part does not appear.

- **Date field label:** Your milestone date
- **Label field:** What are we celebrating?, with a 60 character cap
- **Helper text:** Deep Vault includes one milestone reveal, a date that matters more than the rest. A tenth anniversary, a graduation, a birthday worth waiting for.

## 3.3 Reveal schedule

**Heading:** How should the reveals roll out?

Show only the schedules the vault's tier allows, from `PLAN_POLICY[tier].schedules`. Each option shows its name and a plain-language description.

**Below the options, preview the actual reveal dates the choice produces, in plain language, before the host commits.** Use the existing `previewVaultSchedule()`. The preview updates as the host changes the schedule or the event date.

## 3.4 Prompts

**Heading:** Choose your prompts

The question bank for the vault's type, grouped by sub-category, with the vault's real names filled in.

**Custom prompts are not buried.** Put **Add your own prompt** at the top of this part, above the bank, as a clearly visible button. The host's own prompts appear in their own group at the top of the list, ahead of the bank groups.

### Starting state

A recommended starter set is already on when the host arrives, and the rest are off. The starter set is about **20 prompts**, drawn across the type's sub-categories rather than all from one.

The question bank has no "recommended" field today, and none is being added. Choose the starter set automatically: walk the vault type's sub-categories in display order, taking one prompt from each in turn, in bank display order, cycling through the sub-categories until 20 prompts are on or the bank runs out. This spreads the starter set across sub-categories rather than filling it from one. The result must be the same every time for a given vault type, never random.

Above the list: **We've picked a starter set for you. Turn prompts on or off, add your own, and drag to reorder.**

### Toggling, reordering, counting

- Each prompt toggles on or off.
- The host can drag to reorder. Order is stored as display order and never changes a prompt's identity, so answers stay attached correctly.
- A running count of prompts that are on is always visible.

**Count guidance, never blocking:**
- **At 31 or more:** That's a long list. Guests answer in about a minute, so 20 or so keeps them going to the end.
- **At 41 or more:** This is a lot to ask of a guest. Consider trimming before you seal.

### Custom prompts

A host's own prompt is **free text only**. The host writes the prompt and marks it either:
- **Scoreable**, meaning a real answer exists and it counts toward the scoreboard
- **Keepsake**, meaning there is no right answer and it is never scored

**Helper text under that choice:** Scoreable prompts have a real answer you'll mark later. Keepsake prompts are just for the memories.

Prompt text caps at 140 characters. Custom prompts write to `vault_questions` with `isCustom` set, the same as bank prompts otherwise.

## 3.5 Changing the event date after sealing

Once sealed, the prompts, schedule, plan, and reveal structure are locked. **The event date is the one exception, so a postponed wedding can be corrected.**

Changing it recalculates every reveal date that has not happened yet.

**Rules, all enforced server side:**

1. The date can move **either direction**.
2. It can never move so far back that any reveal lands in the past or today. If the host picks such a date, refuse it and show which reveal it would break.
3. **Once any reveal has unlocked, the date is locked for good.** Show it as read-only with: Your first reveal has opened, so the date is set from here on.
4. Guests' own reveal choices stay attached to the same reveal, which moves with the schedule.

The control lives on the sealed vault's page, not in setup.

## 3.6 Stage 3 is done when

- A host can set or skip the event date, choose a schedule, and see real reveal dates previewed.
- Deep Vault requires a milestone date and label, and no other tier shows that part.
- The starter set is on when the host arrives, custom prompts are visible at the top, and prompts can be toggled, reordered, and counted with the guidance at 31 and 41.
- Custom prompts save as free text, marked scoreable or keepsake.
- A sealed vault's date can move under the rules in 3.5, and is locked once a reveal has opened.
- Everything saves as the host goes.

**STOP. Report and wait for approval.**

---

# Stage 4: Covers and the guest layout

Part of the same setup screen.

## 4.1 Cover art

**Heading:** Your cover

Every vault has one cover.

**On every tier,** the cover is the vault type's own silhouette from `public/vault-art/`, assigned automatically. The host does not pick from the library, and the silhouette matches the type they chose.

**On paid tiers only (Safe, Vault, Deep Vault),** the host may upload one photo instead, and may remove it to return to the silhouette. Lockbox does not show the upload control at all, with no upsell or placeholder.

**Upload handling, all required:**
- Validate the file type by content, never by file extension
- Cap the file size at 10 MB
- **Strip EXIF metadata on upload.** Phone photos carry GPS coordinates, and a wedding photo that pins someone's home address is the real privacy risk in this product
- Store under a randomly generated filename, never a guessable one
- Re-encode and resize server side
- One image per vault, replacing any previous one
- Stored in Replit object storage

There is no object storage plumbing in the codebase today. Use Replit object storage through Replit's own object storage package. Report the package name and version in your stage 4 audit before installing it, as the standing rule requires, but you do not need a separate decision on the approach.

The cover is **not sealed content**. Guests see it, and it takes no part in the reveal schedule.

## 4.2 Guest screen layout

**Heading:** How your guests see the prompts

Two choices, with **one prompt at a time** selected by default:
- **One prompt at a time.** One prompt per screen with a progress indicator. Best for phones at an event.
- **All on one page.** Every prompt on one scrolling page with a single submit. Best for a laptop.

**The host can change this at any time, including after sealing**, since it changes presentation only, never content, timing, or scoring. Show this control on the sealed vault's page too.

## 4.3 Stage 4 is done when

- Every vault has its type's silhouette as its cover.
- Paid hosts can upload and remove a photo, with all the handling above, and Lockbox hosts see no upload control.
- The layout choice works, defaults to one at a time, and can be changed after sealing.

**STOP. Report and wait for approval.**

---

# Stage 5: Sharing and sealing

## 5.1 Share screen

`/operator/vaults/:vaultId/share`, reachable from setup and from the sealed vault's page.

**Heading:** Share with your guests

It shows:
- The guest link, with a copy button
- The QR code for that link
- Buttons to print the two card designs in 5.2

**QR codes are generated in the app.** The vault link must never pass through a third-party service. This needs a local QR library, so **report the package before adding it.**

**Before sealing,** the share screen is visible but carries this notice: Your vault isn't sealed yet, so this link won't accept answers. Seal it when you're ready.

## 5.2 Printable cards

Two print-styled HTML designs, printed through the browser. No PDF library.

Both carry the vault name, the QR code, the logo pair, and this copy:

> **Scan to seal your prediction**
> Your answers stay sealed until they unlock, years from now.

Assume a guest has never heard of Vault Zombie, so the second line is what earns the scan.

**Design 1, table card.** Small, laid out several to a page for scattering across tables.

**Design 2, sign.** One per page, sized for a welcome table or an easel, with the QR code large enough to scan from a step or two back.

Both print cleanly in black and white, with the QR code at full contrast.

## 5.3 Sealing

The **Seal this vault** button lives at the end of setup, and is disabled with a clear reason until the vault is ready: at least one prompt on, a reveal schedule chosen, subject names filled, and, on Deep Vault, a milestone date and label.

**The confirmation box lists exactly what is about to lock:**

> **Ready to seal?**
> Once you seal, these are locked for good:
> - Your [N] prompts
> - Your reveal schedule, [schedule name]
> - Your plan, [tier name]
> - Your reveal dates: [first date] through [last date]
>
> You can still change your event date, your cover, and how guests see the prompts.
>
> Guests can start answering the moment you seal.

A plain **Seal it** button confirms, alongside a cancel. **No typed confirmation.**

**After sealing,** show a brief animation of the vault logo, as if the vault has just swung shut, then the sealed confirmation with the guest link, the QR code, and the print buttons. Keep the animation short, and respect a reduced-motion preference by skipping straight to the confirmation.

Sealing sends the vault sealed email (H4), which is already built.

## 5.4 Stage 5 is done when

- The share screen shows the link and a QR code generated in the app, with the pre-seal notice on drafts.
- Both card designs print cleanly, with the copy above.
- Sealing is blocked with a clear reason until the vault is ready, confirms with the box above, plays the animation, and lands on the sealed confirmation.
- H4 still sends.

**STOP. Report.**
