# VaultZombie Marketing Site, Build Stages, Addendum 6 (v2)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md`, per the ADDENDUMS
GOVERN rule in `replit.md`. All of these documents live in `Vault_Zombie_Initial_Build_Files/`.

It fixes duplicated legal links in the footer and a set of legal links that open in the current
tab. Addendums 1 through 5 still stand, except where section 3 below changes them.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. What is wrong

Every page in the app ends with a single line of two links, "Terms and Conditions" and "Privacy
Policy". It is the `LegalFooter` component in `artifacts/vault-zombie/src/App.tsx`, rendered after
the router on every page.

Two things are wrong with the current state:

- The two links in that line have no `target` attribute, so they open the document in the current
  tab and the visitor loses the page they were on.
- On the seven marketing pages, the marketing footer in
  `artifacts/vault-zombie/src/components/marketing-layout.tsx` also carries `Terms` and `Privacy`
  links, after `Contact`. Those pages therefore show the same two documents twice.

## 2. Fix the bottom line so both links open in a new tab

In `LegalFooter` in `artifacts/vault-zombie/src/App.tsx`, add `target="_blank"` and
`rel="noopener noreferrer"` to both links.

Change nothing else about that line. It stays on every page, including the seven marketing pages.
Its visible text, its `href` values (`/terms` and `/privacy`), its `data-testid` values, its
styling, and its position stay as they are.

## 3. Remove Terms and Privacy from the marketing footer menu

In `artifacts/vault-zombie/src/components/marketing-layout.tsx`, remove the two footer links with
`data-testid="link-footer-terms"` and `data-testid="link-footer-privacy"`.

This withdraws the part of Stage 5, and the matching part of Addendum 5, that placed and repointed
those two footer links. The bottom line from section 2 is now the only footer link to either
document.

Everything else in the marketing footer stays exactly as it is, including the `Contact` link and
every link before it.

In the same file, remove this comment block, which sits just above `MarketingHeader` and describes
the two footer links being removed:

```
// Stage 5, corrected by Addendum 5: the footer's Terms/Privacy links and
// the Legal page's "Read full" buttons point at the server routes
// `/terms` and `/privacy`, which serve the configured documents from
// `Policy_Documents/`, rather than static copies under `public/`.
```

Remove it entirely. Do not replace it. The comment at the top of
`artifacts/vault-zombie/src/pages/public/legal.tsx` already describes the Legal page buttons and
stays as it is.

## 4. Do not change anything else

The "Read full Terms" and "Read full Privacy Policy" buttons on the Legal page stay exactly as they
are.

Do not modify the Terms and Privacy links on the sign-up page or in the re-consent popup
(`artifacts/vault-zombie/src/pages/auth/sign-up.tsx` and
`artifacts/vault-zombie/src/components/consent-gate.tsx`).

Do not modify `lib/legal/src/index.ts`, `.replit`, or `artifacts/api-server/`.

## 5. Add this addendum to the list in replit.md

Add this file to the marketing site entry in the ADDENDUMS GOVERN list in `replit.md`, below
Addendum 5:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-6-v2.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- Confirmation that `replit.md` now lists all six marketing site addendums, and that nothing else
  in that file changed.
- The `LegalFooter` component as it now reads, quoted.
- The marketing footer's link list as it now reads, quoted, confirming `Terms` and `Privacy` are
  gone and `Contact` and every link before it remain.
- Confirmation that the comment block named in section 3 is gone from `marketing-layout.tsx` and
  that no other comment in that file mentions footer Terms or Privacy links.
- Confirmation that on each of the seven marketing pages (`/`, `/how-it-works`, `/vault-types`,
  `/pricing`, `/gift`, `/about`, `/legal`), the bottom line appears once and the marketing footer
  no longer shows `Terms` or `Privacy`.
- Confirmation that the bottom line still appears on `/sign-in`, `/sign-up`, and `/gifts/purchase`.
- Proof from an actual click in a browser, not from reading the code, that clicking "Terms and
  Conditions" and "Privacy Policy" in the bottom line each opens a new tab with the PDF, and that
  the original page is still open in its own tab. Do this on `/` and on `/sign-in`.
- Confirmation that the Legal page buttons, the sign-up page, and the re-consent popup were not
  changed.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
