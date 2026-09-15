# VaultZombie Marketing Site, Build Stages, Addendum 1 (v1)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md`, per the ADDENDUMS
GOVERN rule in `replit.md`. Both documents live in `Vault_Zombie_Initial_Build_Files/`.

It corrects work already completed in Stage 2 and records one design decision. It does not change
Stage 1, Stage 3, Stage 4, or Stage 5.

Do this work before beginning Stage 3.

---

## 1. Correction to the Stage 2 pricing page

`artifacts/vault-zombie/src/pages/public/pricing.tsx` currently carries two copy claims that are
true of the three paid tiers but false of Lockbox. Lockbox is free, so it is neither a one-time
payment nor something that can be purchased as a gift.

Change exactly the two strings below. Change nothing else on the page. Do not touch the tier
cards, the prices, the feature lists, the call to action destinations, or the closing paragraph.

### The page headline

Current text:

> One payment. Yours to keep.

Replace with, exactly:

> Four Plans to Choose From. Even More Memories to Keep.

### The paragraph below the headline

Current text:

> No subscriptions, ever. Every plan is a one-time payment, and every plan can be given as a gift.

Replace with, exactly:

> No subscriptions, ever. Lockbox is free, and every paid plan is a one-time payment that can be
> given as a gift.

Do not write your own wording for either line.

---

## 2. Gifting and the free tier, for the record

Only Safe, Vault, and Deep Vault can be given as a gift. Lockbox cannot.

Section 5 of `VaultZombie-Build-Brief-v2.md` contains a line stating that all tiers are giftable.
That line is wrong. The Gifting subsection of the same section, which names Safe, Vault, and Deep
Vault, is correct and governs.

Stage 4 of the build stages document already excludes Lockbox from the gift page. That remains
correct and needs no change.

If you find any other place in the codebase or in the marketing copy stating or implying that the
free tier is giftable, STOP and report it. Do not rewrite it yourself.

---

## 3. Box shadows on marketing pages

The design rules section of the build stages document states that there are no shadows anywhere.
That rule is set aside for the marketing site.

The pricing page and the home page carry box shadows that came across with code moved from the
original landing page. They are approved and stay as they are. Do not remove them, and do not
report them as a defect at a later stage gate.

For the five marketing pages still to be built, match the shadow treatment already used on the
pricing page and the home page rather than building those pages flat. Consistency across the seven
pages is the goal.

Every other design rule in the build stages document still holds without change, including the ban
on the rust-orange accent, the restriction of Tilt Warp to the wordmark and hero display, the ban
on body copy set in bronze, the style guide radius tokens, warm neutrals, visible focus styles, and
no dark mode.

---

## STOP and report

- The two strings changed in `pricing.tsx`, quoted as they now read.
- Confirmation that nothing else on the pricing page was modified.
- Any other copy found claiming the free tier is giftable.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP. Do not begin Stage 3 until you are told to.
