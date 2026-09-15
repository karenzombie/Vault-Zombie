# VaultZombie Marketing Site, Build Stages, Addendum 3 (v1)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md` and over Addendum 2,
per the ADDENDUMS GOVERN rule in `replit.md`. All of these documents live in
`Vault_Zombie_Initial_Build_Files/`.

It corrects work already completed in Stage 3. Addendum 1 and Addendum 2 otherwise still stand.
Nothing here changes Stage 1, Stage 2, Stage 4, or Stage 5.

Do this work before beginning Stage 4.

---

## 1. Amendment to the word-for-word rule in Addendum 2

Section 2 of Addendum 2 requires each sample prompt on `/vault-types` to appear word for word in
its bank file. That rule produced seven sample prompts displaying unresolved placeholder tokens
such as `[Student]` and `[Child]` on a public page, directly above a line promising that prompts
fill in real names automatically.

The rule is amended as follows, for `/vault-types` only.

A sample prompt must still match its bank file word for word, with one exception: a placeholder
token may be replaced by an example value. Everything else in the prompt stays exactly as the bank
file has it. No other change to a prompt is allowed, and no prompt may be paraphrased or written
from scratch.

This exception applies only to the sample prompts displayed on `/vault-types`. It changes nothing
about the prompt banks themselves, and it does not apply anywhere else in the product.

## 2. The seven sample prompts to replace

In `artifacts/vault-zombie/src/pages/public/vault-types.tsx`, replace the sample prompt for these
seven types. Use this text exactly.

| Type | New sample prompt |
|---|---|
| Child Growth | What instrument might Maya pick up? |
| College | What will Jordan major in? |
| Job | What job title will Sam hold in 5 years? |
| Travel | What will be Priya's favorite destination? |
| Retirement | What will Dave finally have time for? |
| New Business | In how many years will Corner Coffee turn a profit? |
| New Year | What resolution will Alex actually keep in 2027? |

The sample prompts for Marriage, Couple, and New Baby carry no placeholder tokens. Leave all three
exactly as they are.

Change nothing else on `/vault-types`. The prompt counts, the category counts, the icons, the
intro paragraph, the site-wide total, and the closing line all stay as built.

## 3. The intro paragraph on /vault-types stands

The intro paragraph on `/vault-types` ends with wording telling the visitor they can add their own
prompts. Build Brief section 7 supports this, since a host can add custom prompts when curating.
That wording is approved and stays. Do not remove it and do not report it as unsupported at a later
stage gate.

## 4. Three copy changes on /how-it-works

In `artifacts/vault-zombie/src/pages/public/how-it-works.tsx`, change exactly the three strings
below. Change nothing else on the page.

### The intro paragraph

Current text:

> VaultZombie turns your event into a game that plays out over years. Here is the whole thing,
> start to finish.

Replace with, exactly:

> Turn your event into a game that plays out over years. Here is the whole thing, start to finish.

### The Share card

The Share card currently describes only printing the code and setting it out at the venue, which
reads as more limiting than what a host can actually do. A host receives a QR code, a shareable
link, and printable card designs, and can put any of those into their own email or messaging. There
is no in-app send to guests, and this copy must not imply there is.

Current text:

> Print the QR code on your invites or set it out at the venue. Guests scan and seal a guess in
> about a minute.

Replace with, exactly:

> Share the QR code however you like. Print it on your invites, set it out at the venue, or drop it
> into an email or text. Guests scan and seal a guess in about a minute.

Leave the Create card and the Reveal card untouched.

### The reveal schedule paragraph

Current text:

> At setup you pick one schedule. It sets the exact dates guests choose from, and how the story
> unspools.

Replace with, exactly:

> At setup you pick one schedule. It sets the exact dates guests choose from, and how the story
> unfolds.

Do not write your own wording for any of the three.

## 5. Add this addendum to the list in replit.md

Add this file to the marketing site entry in the ADDENDUMS GOVERN list in `replit.md`, below
Addendum 2:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-3-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- Confirmation that `replit.md` now lists all three marketing site addendums, and that nothing else
  in that file changed.
- The seven sample prompts as they now read on `/vault-types`.
- Confirmation that no placeholder token in square brackets appears anywhere on `/vault-types`.
- Confirmation that the Marriage, Couple, and New Baby samples were not changed.
- The three strings changed on `/how-it-works`, quoted as they now read.
- Confirmation that nothing else on either page was modified.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP. Do not begin Stage 4.
