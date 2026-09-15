# VaultZombie Marketing Site, Build Stages, Addendum 5 (v1)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md`, per the ADDENDUMS
GOVERN rule in `replit.md`. All of these documents live in `Vault_Zombie_Initial_Build_Files/`.

It fixes a live defect. Addendums 1 through 4 still stand.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. What is broken and why

The app has served its Terms and Privacy documents from `/terms` and `/privacy` since before the
marketing site work began. Those routes are in `artifacts/api-server/src/app.ts` and they get the
file from `legalConfiguration()` in `lib/legal/src/index.ts`.

That function reads four environment variables, set in `.replit` under `[userenv.shared]`. Two name
a PDF file, two hold a version string. The file-naming check requires the named PDF to sit directly
at the workspace root. A file inside any subfolder fails it by design.

The four PDF files were moved out of the workspace root into `Policy_Documents/` before Stage 1
began. You reported the move at the Stage 1 gate and correctly left it alone. Nothing at the root
is a PDF now, so `legalConfiguration()` throws and both routes return 503 with
`LEGAL_CONFIGURATION_MISSING`.

This is worse than two dead links. `artifacts/vault-zombie/src/pages/auth/sign-up.tsx` calls the
same configuration. When it errors, the page shows that legal documents are unavailable and
disables both the create account button and the Google button. **Nobody can create an account right
now.** That is the reason this work comes before anything else.

A second problem sits underneath it. Stage 5 had you copy the two v2 PDFs into
`artifacts/vault-zombie/public/` as static files, and pointed the marketing footer and the Legal
page at those copies. That created a second, independent source for the same two documents. The
static copies and the configured documents can drift apart, and a consent record would then name a
different document than the one a visitor read.

`Policy_Documents/` is the single source. Everything reads from there. That part of Stage 5 is
withdrawn.

## 2. Change the legal configuration to read from Policy_Documents

In `lib/legal/src/index.ts`, change `configuredPdf` so the configured filename resolves inside a
`Policy_Documents` folder at the workspace root, rather than at the workspace root itself.

Keep every existing protection, adjusted to the new folder:

- The configured value must still be a bare filename. Reject anything containing a path separator,
  exactly as the current `basename` check does.
- It must still end in `.pdf`.
- The resolved file's parent directory must equal the `Policy_Documents` folder, not the workspace
  root.
- The `realpath` containment check must still run, now against the `Policy_Documents` folder, so a
  symlink cannot escape it.

Do not weaken any of these, and do not replace the checks with a different approach. The point of
the change is the folder, nothing else.

Update the two error message strings so they name the folder rather than saying root-level, since
they are now misleading.

Do not change the `WORKSPACE_ROOT` default or the `root` parameter. Callers that pass their own
root, such as the `scripts` package, must keep working unchanged.

If any test, fixture, or other caller depends on the old root-level behavior, update it to match
and report exactly what you changed.

## 3. Update the four environment variables in .replit

The `[userenv.shared]` block in `.replit` currently reads:

```
VAULT_ZOMBIE_PRIVACY_DOCUMENT = "VaultZombie-Privacy-Policy.pdf"
VAULT_ZOMBIE_PRIVACY_VERSION = "September 8, 2026"
VAULT_ZOMBIE_TERMS_DOCUMENT = "VaultZombie-Terms-and-Conditions.pdf"
VAULT_ZOMBIE_TERMS_VERSION = "September 8, 2026"
```

Both filename values name the outdated documents. Replace all four values so the block reads
exactly:

```
VAULT_ZOMBIE_PRIVACY_DOCUMENT = "VaultZombie-Privacy-Policy-v2.pdf"
VAULT_ZOMBIE_PRIVACY_VERSION = "September 12, 2026"
VAULT_ZOMBIE_TERMS_DOCUMENT = "VaultZombie-Terms-and-Conditions-v2.pdf"
VAULT_ZOMBIE_TERMS_VERSION = "September 12, 2026"
```

September 12, 2026 is the date printed inside both v2 documents. The version string is defined as
that printed date, so these two must agree. Do not invent a version string of your own, and do not
derive one from a file modification time.

Change nothing else in `.replit`.

## 4. Leave the outdated documents in place

All four PDFs stay in `Policy_Documents/`. The outdated pair is kept deliberately as version
history. Do not delete, rename, or move any of the four.

Nothing may link to the outdated pair. After this work, the only references anywhere to a specific
legal filename are the two values in `.replit`.

## 5. Remove the duplicate copies and repoint the links

Delete these two files:

- `artifacts/vault-zombie/public/VaultZombie-Privacy-Policy-v2.pdf`
- `artifacts/vault-zombie/public/VaultZombie-Terms-and-Conditions-v2.pdf`

Then repoint everything that referenced them at the server routes instead.

In `artifacts/vault-zombie/src/pages/public/legal.tsx`, the two buttons reading `Read full Terms`
and `Read full Privacy Policy` point at `/terms` and `/privacy`.

In `artifacts/vault-zombie/src/components/marketing-layout.tsx`, the footer's `Terms` and `Privacy`
links point at `/terms` and `/privacy`.

All four keep `target="_blank"` with `rel="noopener noreferrer"`, as Stage 5 required. Their visible
text does not change.

Remove the now-unused `TERMS_HREF` and `PRIVACY_HREF` constants from both files rather than leaving
them defined and unreferenced.

After this change, no file anywhere under `artifacts/vault-zombie/src/` contains the string `.pdf`.

## 6. Do not change the consent behavior

The acceptance flow already behaves correctly and is not part of this work. Do not modify
`artifacts/api-server/src/routes/legal.ts`, `lib/db/src/schema/legal-consents.ts`,
`artifacts/vault-zombie/src/components/consent-gate.tsx`, or the sign-up page beyond what sections
2 through 5 require.

Changing the two version strings in section 3 will cause every existing account to be asked to
accept again on its next signed-in page load. That is the intended behavior, not a defect.

## 7. Add this addendum to the list in replit.md

Add this file to the marketing site entry in the ADDENDUMS GOVERN list in `replit.md`, below
Addendum 4:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-5-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- Confirmation that `replit.md` now lists all five marketing site addendums, and that nothing else
  in that file changed.
- The changed portion of `lib/legal/src/index.ts`, quoted, with confirmation that the bare-filename
  check, the `.pdf` check, the parent-directory check, and the `realpath` containment check are all
  still present and now target the `Policy_Documents` folder.
- Any test, fixture, or caller you had to update, and why.
- The `[userenv.shared]` block of `.replit`, quoted as it now reads.
- Confirmation that `/terms` and `/privacy` both return a PDF rather than a 503, and which file each
  one served.
- Confirmation that the sign-up page no longer shows the legal-unavailable message and that its
  create account button is enabled when the acceptance box is checked.
- Confirmation that the two duplicate PDFs are deleted from `artifacts/vault-zombie/public/`, that
  all four PDFs remain in `Policy_Documents/`, and that no file under
  `artifacts/vault-zombie/src/` contains the string `.pdf`.
- Confirmation that all four links still open in a new tab.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
