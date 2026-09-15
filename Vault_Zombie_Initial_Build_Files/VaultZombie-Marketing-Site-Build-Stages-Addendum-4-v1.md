# VaultZombie Marketing Site, Build Stages, Addendum 4 (v1)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md`, per the ADDENDUMS
GOVERN rule in `replit.md`. All of these documents live in `Vault_Zombie_Initial_Build_Files/`.

It corrects work already completed in Stage 4, on `/gift` only. Addendums 1, 2, and 3 still stand.
Nothing here changes Stage 1, Stage 2, Stage 3, or Stage 5.

Every change is in `artifacts/vault-zombie/src/pages/public/gift.tsx`. Do not modify any other
file except `replit.md` as described in section 6. Do not touch the gift purchase flow.

Do this work before beginning Stage 5.

---

## 1. The sample gift card is decorative and must read that way

The card in the right column of the hero is an illustration of what a recipient receives. It is
not a working control. Right now it renders a block styled exactly like the site's primary button,
reading `Redeem your vault`, with pointer events switched off.

A visitor who really was gifted a vault will read that as the way in, click it, and get nothing.
The site has a genuine redemption route already, so a dead lookalike next to a working feature is
the wrong signal.

Restyle that block so it no longer reads as a button. Keep it in the same position and at the same
size so the card's proportions do not change, but give it a muted treatment: a low-contrast
background and muted text, no primary fill, no shadow, no hover or active state. Use the style
guide's muted tokens rather than inventing a color.

It must also be inert to assistive technology and to the keyboard. It is not a `button` element,
it is not a link, it is not focusable, and it carries `aria-hidden="true"`.

Do not wire it to `/gifts/redeem` or to any other route.

## 2. Two strings on the sample gift card

Change exactly these two strings. Use this text exactly.

The label above the code currently reads:

> Redemption code

Replace with:

> Sample Redemption Code

The line below the redeem block currently reads:

> Codes never expire and are single use.

Replace with:

> Real redemption codes never expire and are single use.

Leave the sample code value itself unchanged.

## 3. The logo on the sample gift card

The dark header of the sample card currently renders the wordmark as two text spans reading
`Vault` and `Zombie`. Replace those spans with the logo image `vault_zombie_png.png`, already
present in `artifacts/vault-zombie/public/`.

This is the circular safe logo, the same file the site header uses. It is a transparent PNG, so
place it directly on the dark background with no plate, no panel, and no background of its own.
Render it centered, at roughly 64 pixels tall, with its aspect ratio preserved. Give it the alt
text `VaultZombie`.

The line below it, reading that you have been gifted a vault, stays exactly as it is.

## 4. The hero paragraph

The hero paragraph currently describes the recipient writing their own prompts, which makes a gift
sound like work. The recipient can pick from the prompt banks or write their own, and the copy
needs to say so.

Replace the hero paragraph with this text, exactly:

> Buy a vault for a couple, new parent, graduate, or several other available vault categories. They
> redeem it, pick their vault category, then pick from available prompts or create their own. Every
> reveal is a reminder it came from you.

## 5. Step 2 of "How gifting works"

Stage 4 of the build stages document supplies literal text for the second step, reading that the
recipient enters the code, becomes the owner, and builds prompts for their own milestone. That text
is withdrawn and replaced.

Replace the body of the `They redeem it` card with this text, exactly:

> The recipient enters the code and sets up their vault, picking their category and their prompts.

The card's heading stays `They redeem it`. Steps 1 and 3 are unchanged, including their headings
and their body text.

The word `owner` currently appears exactly once anywhere on the public site, in that step. After
this change it appears nowhere. Do not reintroduce it. Where this role needs a name in public copy,
use `host`, which is what the gift purchase page already uses.

## 6. Add this addendum to the list in replit.md

Add this file to the marketing site entry in the ADDENDUMS GOVERN list in `replit.md`, below
Addendum 3:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-4-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- Confirmation that `replit.md` now lists all four marketing site addendums, and that nothing else
  in that file changed.
- Confirmation that the redeem block on the sample card is no longer styled as a button, is not
  focusable, is not a link or a `button` element, and carries `aria-hidden="true"`.
- The two sample card strings, quoted as they now read.
- Confirmation that the logo image replaced the wordmark text on the sample card, and that no
  background plate or panel was added behind it.
- The hero paragraph and the step 2 body, quoted as they now read.
- Confirmation that the word `owner` no longer appears anywhere under
  `artifacts/vault-zombie/src/pages/public/`.
- Confirmation that nothing else on `/gift` was modified and that the gift purchase flow was not
  touched.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP. Do not begin Stage 5.
