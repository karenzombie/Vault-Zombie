# VaultZombie Build Brief, Addendum 4 (v2)

This addendum governs over `VaultZombie-Build-Brief-v2.md`, `VaultZombie-Flow1-Build-Stages.md`,
and `VaultZombie-Marketing-Site-Build-Stages-v1.md`, and over each of their existing addendums
wherever they cover the same ground, per the ADDENDUMS GOVERN rule in `replit.md`. All of these
documents live in `Vault_Zombie_Initial_Build_Files/`.

It fixes problems found in hands-on testing on September 15, 2026. Every earlier addendum still
stands, except where this one changes it.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask. Section 3 tells you when to STOP before writing code.

Work through the sections in order.

---

## 1. Guests cannot choose a multiple choice answer

In `artifacts/vault-zombie/src/pages/guest/guest-flow.tsx`, `QuestionInput` draws each multiple
choice option as a styled box, but clicking or tapping one does nothing. Nothing records the choice.

- Clicking or tapping an option records it as the answer, in both guest layouts.
- Each option can also be chosen with the keyboard.
- The options look exactly as they do now, including the selected state.

In the same component, a number answer of 0 shows as blank, because the field treats 0 as empty. A
guest must be able to enter 0 and see it.

## 2. Paid and gifted vaults are created on the free entitlement

`spendEntitlementForNewVault` in `lib/db/src/vault-setup.ts` creates the vault with the billing
record's tier as its `planTier`, but never sets `entitledPlanTier`, so it stays at its default,
`lockbox`. Every vault created from a purchase or a redeemed gift is therefore blocked from sealing
("Complete payment before sealing a vault configured above its current entitlement") and shows
Lockbox on its Billing tab.

- When a vault is created from an entitlement, its `entitledPlanTier` is set to that billing
  record's tier, in the same transaction.
- Check every other place a vault is created or an entitlement is applied, and report whether each
  one already sets `entitledPlanTier` correctly.
- Repair the development database: for every vault whose applied billing records (status `paid` or
  `comped`, with this vault's id) include a tier above its current `entitledPlanTier`, set
  `entitledPlanTier` to the highest such tier. Change nothing else, and do not delete or alter any
  other test data.

## 3. Terms and Privacy asked twice at sign-up

At sign-up, `findOrCreateAccount` in `artifacts/api-server/src/middlewares/auth.ts` requires
`legalAccepted` to be `true` inside the Clerk user's `unsafeMetadata`. The sign-up page in
`artifacts/vault-zombie/src/pages/auth/sign-up.tsx` sends `legalAccepted: true` as a separate Clerk
parameter and never puts it in `unsafeMetadata`. Account creation at sign-up therefore always fails
that check, and the re-acceptance popup then creates the account instead.

`findOrCreateAccount` also requires the Clerk user's legal acceptance date.

**Before writing any code for this section**, read the Clerk users for the owner's existing test
accounts through the Clerk backend and report whether each one has a legal acceptance date. Read
only; change nothing in Clerk. If none of them has one, STOP and report, because the fix then needs
a Clerk dashboard setting the owner must change first. Do not work around a missing date in code.

If the dates are present:

- The sign-up page includes `legalAccepted: true` in `unsafeMetadata`, together with the signed
  legal sign-up intent, for both the email sign-up and the Google sign-up.
- Do not weaken any other check in `findOrCreateAccount`. The signed intent remains the evidence of
  acceptance.
- The re-acceptance popup stays exactly as it is. It must still appear when a new Terms or Privacy
  version is published.

Do not create a Clerk account or a local account to test this. The owner will test it.

## 4. The vault Billing tab

These changes are in `artifacts/vault-zombie/src/pages/operator/operator-billing.tsx` and the
billing status route in `artifacts/api-server/src/routes/billing.ts`, with the API spec and
generated code updated to match.

### 4.1 Blank Billing tab

The billing status response only accepts paid tiers and amounts above zero. A free Lockbox record
($0, tier `lockbox`) or a complimentary record ($0, status `comped`) makes the request fail, and the
page then shows nothing.

- The response accepts every billing record a vault can have, including $0 records, the `lockbox`
  tier, and the `refunded` and `comped` statuses.
- If billing ever fails to load, the tab shows this text instead of a blank area:
  `Unable to load billing. Please try again.`

### 4.2 Billing History

- Show only completed records: `paid`, `refunded`, `disputed`, and `comped`. Do not show `pending`,
  `expired`, or `failed` records, which are checkouts that were abandoned or did not go through.
- If no records remain to show, do not show the Billing History card.
- Label each record with this text exactly, where `[Tier]` is the tier's display name:

| Record | Title | Amount | Status text |
|---|---|---|---|
| Free Lockbox record | `Lockbox (Free)` | `Free` | none |
| Redeemed gift | `Gift: [Tier]` | the gift amount | `Gift` |
| Purchase made before this vault existed | `[Tier] purchase` | the amount | as below |
| Purchase made after this vault existed | `Upgrade to [Tier]` | the amount | as below |
| Complimentary record | `Complimentary upgrade to [Tier]` | `$0.00` | `Complimentary` |

For the two purchase rows, the status text is `Paid`, `Refunded`, or `Disputed`. A purchase made
before its vault existed is one whose record was created before the vault was.

### 4.3 The gift card on this tab

Remove the "Have a Gift Code?" card from the Billing tab entirely. Redeeming a gift only creates a
new vault. It cannot be applied to an existing vault.

### 4.4 The admin panel shows every billing record

The records hidden from the host in 4.2 stay visible to the admin. The admin Billing page must keep
listing every billing record with its status, including `pending`, `expired`, and `failed`.

Several admin responses that include billing records only accept the sources `stripe`, `gift`, and
`comp`. A free Lockbox record has the source `lockbox`, so once any free vault exists, those
responses fail and their admin pages do not load. This includes the admin Billing page, and the
responses in the generated API code that back the admin host detail and the admin vault support
view.

- Every admin response that includes billing records accepts every source, status, tier, and amount
  a billing record can have, including the `lockbox` source and $0 amounts.
- Find every such response, fix each one, and update the API spec and generated code to match.
- The admin Billing page shows the `lockbox` source like the others.

## 5. Vault setup

These changes are in `artifacts/vault-zombie/src/pages/operator/vault-setup.tsx` unless noted.

### 5.1 The event date section, by vault type

The "When's the big day?" section's heading and helper text now depend on the vault type, using the
vault type's slug. Use this text exactly. The helper text is the line from the table, followed by a
space, followed by this existing sentence pair:

`Your reveal dates count forward from this day. Leave it blank and they count from the day you seal.`

| Slug | Heading | Helper line |
|---|---|---|
| `marriage` | When's the big day? | Some suggestions: your wedding day or your vow renewal. |
| `couple` | When did your story start? | Some suggestions: the day you met, your first date, or the day you made it official. |
| `baby` | When's baby due? | Some suggestions: the due date, or the birthday if baby has already arrived. |
| `child-growth` | When does the countdown start? | Some suggestions: a birthday, the first day of school, or any day that marks the start. |
| `college` | When does college start? | Some suggestions: move-in day, the first day of classes, or graduation day. |
| `job` | When does the new chapter start? | Some suggestions: the first day at the new job, a promotion, or a graduation. |
| `travel` | When does the adventure begin? | Some suggestions: departure day, or the day of the big move. |
| `retirement` | When's the last day at work? | Some suggestions: the retirement date, or the day of the party. |
| `new-business` | When's launch day? | Some suggestions: opening day, launch day, or the day the business was founded. |
| `new-year` | Which year are we predicting? | Most New Year vaults use January 1 of the year ahead. |

The field label `Event date`, the time zone field, and everything else in the section stay as they
are. If a vault type's slug is not in this table, STOP and report it.

### 5.2 The custom prompt button

In the "Add your own prompt" form, the button that saves the written prompt reads `Save`. While it
is saving, it reads `Saving…`. The "Add your own prompt" button that opens the form does not change.

### 5.3 The seal check stays current

The seal section checks readiness once and never checks again, so it can show a reason that is no
longer true. After every successful change to the vault's setup, including the event date, time
zone, milestone, schedule, guest layout, cover, and any prompt change, the seal readiness is checked
again.

The "Seal this vault" button must look disabled whenever sealing is blocked. Find out why it
appeared fully active in testing while a blocking reason was shown, and fix it.

### 5.4 The Continue button

Remove the "Continue" button at the bottom of the setup page.

### 5.5 A draft vault never shows the live page

The vault live page (`OperatorReveal` in
`artifacts/vault-zombie/src/pages/operator/operator-page.tsx`) currently opens for a draft vault. When
the vault is a draft, send the host to that vault's setup page instead.

## 6. The vault live page

These changes are in `OperatorReveal` in `artifacts/vault-zombie/src/pages/operator/operator-page.tsx`.

- **Vault name.** Show the vault's name as the page heading, at the top of the page content, in the
  same style as the vault name heading on the setup page.
- **Tabs.** The Live, Score, Reports, and Billing tab bar has a fixed height shorter than the tabs
  inside it, so the active tab sits out of line. Make the bar fit its tabs so every tab, active or
  not, sits inside it and lines up.

## 7. Signed-in navigation

Marketing pages stay viewable when signed in. Admin panel pages are not part of this section.

- **Home destination.** When the visitor is signed in, every logo link and every "Return Home"
  button goes to `/operator`. When signed out, they go to `/` as now. This covers the site header,
  the marketing header and footer, the gift purchase page, the gift success page, the gift cancel
  page, and the not-found page.
- **Marketing header.** When signed in, the marketing header shows `My vaults` (linking to
  `/operator`) and `Sign out` in place of `Sign in` and `Sign up`. When signed out, it is unchanged.
  Sign out behaves exactly as it does in the site header.
- **Saved gift code.** The "Redeem a gift code" header link appears only while a gift code is saved
  in the browser. Clear the saved code when a redemption fails because the code is invalid, already
  redeemed, or refunded, as well as when it succeeds.

## 8. The Redeem a Gift page

These changes are in `artifacts/vault-zombie/src/pages/operator/gift-redeem.tsx`.

- **Error message.** A failed redemption currently shows the raw technical message, for example
  `HTTP 409 Conflict: This gift is no longer redeemable.` Show only the server's own message, without
  the HTTP status text. Add no new copy.
- **Header.** Add the standard site header used on the other host pages, and remove the
  "Back to Host" button, since the header covers it.

## 9. The Redeem at link on the gift card

On the Gift Secured page (`artifacts/vault-zombie/src/pages/public/gift-success.tsx`), the
"Redeem at" address on the gift card is plain underlined text.

- Make it a real link that opens in a new tab, with `target="_blank"` and
  `rel="noopener noreferrer"`.
- The link opens the Redeem a Gift page with this gift's code already filled in, using the page's
  existing `code` parameter.
- The visible address text and the printed card do not change.

## 10. Do not change

- Any email copy, styling, or icon.
- Stripe checkout or the Stripe webhook, beyond what section 2 requires.
- The re-acceptance popup.
- Anything not named in this addendum.

## 11. Add this addendum to the list in replit.md

Add this file to three entries in the ADDENDUMS GOVERN list in `replit.md`:

Under the Build Brief entry, below the `VaultZombie-Build-Brief-Addendum-3-v1.md` line.

Under the Flow 1 entry, below the `VaultZombie-Build-Brief-Addendum-3-v1.md` line.

Under the Marketing Site entry, below the `VaultZombie-Marketing-Site-Build-Stages-Addendum-6-v2.md`
line.

Each time, the line is:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-4-v2.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- **Section 1:** the changed code, and proof that a multiple choice option can be chosen by click and
  by keyboard in both layouts, and that 0 can be entered as a number answer.
- **Section 2:**
  - The changed code.
  - Your report on every other place a vault is created or an entitlement is applied.
  - The number of development vaults repaired, each with its old and new entitlement.
- **Section 3:**
  - Whether each test account has a Clerk legal acceptance date.
  - If you continued, the changed code.
- **Section 4:**
  - The changed code and API spec.
  - Proof that the Billing tab loads for a free Lockbox vault and for a gifted vault.
  - The Billing History each of those now shows.
  - Every admin response you fixed for 4.4, and proof that the admin Billing page loads while a free
    Lockbox record exists and lists a record of every status present.
- **Section 5:**
  - The changed code.
  - Every vault type slug found, matched to its row in 5.1.
  - Why the seal button looked active, and what fixed it.
  - Confirmation that the Continue button is gone and that a draft vault's live page address sends
    the host to setup.
- **Section 6:** the changed code, and a screenshot of the live page showing the vault name and the
  aligned tabs, if you can reach it without creating an account.
- **Section 7:** every link you changed, and the marketing header code for both signed-in and
  signed-out states.
- **Section 8:** the changed code.
- **Section 9:** the changed code, and the link address produced for a sample gift.
- **Wrap-up:**
  - Confirmation that `replit.md` lists this addendum under all three entries, and that nothing else
    in that file changed.
  - The result of `pnpm run typecheck`.
  - The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
