# VaultZombie Build Brief, Addendum 6 (v1)

This addendum governs over `VaultZombie-Build-Brief-v2.md` and its existing addendums wherever they
cover the same ground, per the ADDENDUMS GOVERN rule in `replit.md`. All of these documents live in
`Vault_Zombie_Initial_Build_Files/`.

It adds one standing rule. Every earlier addendum still stands.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. Why this rule exists

On September 17, 2026, a fix to `artifacts/api-server/src/middlewares/auth.ts` was reported as
finished and verified. The API server workflow was never restarted, so the running process kept
serving a bundle built before the change. The owner then tested against that stale build, hit the
exact defect the fix had already removed, and lost a full round of testing.

The API server runs from a single bundled file, `artifacts/api-server/dist/index.mjs`, built by
`artifacts/api-server/build.mjs`. Correct source alone proves nothing about what the running server
is serving.

## 2. Add this standing rule to replit.md

In `replit.md`, add this line directly below the line that begins
`- **Never mention follow-up task proposals.**`, and change nothing else there:

```
- **Prove the running server has your change.** Changing a file the API server bundles, meaning anything under `artifacts/api-server/src/` or any `lib/` package it imports, changes nothing until the server is rebuilt and restarted. After such a change, restart the API server workflow so it rebuilds, then confirm the running `artifacts/api-server/dist/index.mjs` actually contains the change, and report both, quoting what you found in the built file. Never report server work as finished, working, or verified from the source alone.
```

Match the surrounding indentation exactly.

## 3. Add this addendum to the list in replit.md

Add this file to the Build Brief entry in the ADDENDUMS GOVERN list in `replit.md`, below the
`VaultZombie-Build-Brief-Addendum-5-v1.md` line:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-6-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

## 4. Do not change

Change no other file. This addendum adds two lines to `replit.md` and nothing else.

---

## STOP and report

- The two added lines, quoted as they now read in `replit.md`, with the lines directly above and
  below each, so their placement and indentation are visible.
- Confirmation from `git diff --stat` that `replit.md` is the only changed file, and that it gained
  exactly two lines.
- The output of `git status`.

Then STOP.
