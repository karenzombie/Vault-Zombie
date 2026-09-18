# VaultZombie Build Brief, Addendum 5 (v1)

This addendum governs over `VaultZombie-Build-Brief-v2.md` and its existing addendums wherever they
cover the same ground, per the ADDENDUMS GOVERN rule in `replit.md`. All of these documents live in
`Vault_Zombie_Initial_Build_Files/`.

It fixes a crash that blocks every new account, and the dead-end error page that hides it. Build
Brief Addendum 4 still stands in full.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. What is broken

In `findOrCreateAccount` in `artifacts/api-server/src/middlewares/auth.ts`, the signed legal sign-up
intent is locked and read with a raw SQL query:

```
const locked = await tx.execute(sql`SELECT * FROM legal_signup_intents WHERE token_hash = ${legalSignupIntentHash(intentToken)} FOR UPDATE`);
const intent = locked.rows[0] as typeof legalSignupIntentsTable.$inferSelect | undefined;
```

A raw `tx.execute` returns the database's own column names (`expires_at`, `consumed_at`,
`accepted_at`, `terms_version`, `privacy_version`, `nonce`). The cast then claims those rows are
Drizzle's camelCase shape, which they are not, so every field the validity check reads below is
`undefined`. The check reaches `intent.expiresAt.getTime()` and throws
`TypeError: Cannot read properties of undefined (reading 'getTime')`.

`GET /legal/status` returns 500, no account is created, and no new host can sign up. This code path
only began running once Build Brief Addendum 4 fixed the acceptance check above it.

## 2. Read the intent with the project's own database tools

Replace the raw `tx.execute` lookup with Drizzle's typed query on `legalSignupIntentsTable`,
selecting the row whose `tokenHash` matches, limited to one row, under the same `FOR UPDATE` row
lock the raw query used.

- Every check below the lookup stays exactly as it is, comparing the same fields in the same order,
  including the consumed, expiry, nonce, version, accepted-at, and Clerk acceptance-time checks.
- The row lock must still be taken inside the same transaction, so two requests cannot consume one
  intent.
- Remove the cast. The typed query returns the correct shape, so nothing needs to be asserted.
- If any check now fails for a valid intent because a value's type differs from what the check
  expects, STOP and report it rather than loosening the check.

`artifacts/api-server/src/routes/admin-backup.ts` also uses a raw `tx.execute`, but it selects a
column it never reads, so it is not affected. Do not change it.

## 3. The legal acceptance screen must never be a dead end

`artifacts/vault-zombie/src/components/consent-gate.tsx` renders a single bare line of text on a
blank page whenever the acceptance check fails, with no retry, no navigation, and no way out. It
does not distinguish a failure to load from an expired sign-in.

Change its failure handling as follows. Both failure states show the standard site header used on
the other pages, so the visitor can always navigate away.

### 3.1 An expired or missing sign-in

When the acceptance check fails because the visitor is not authenticated, show:

- Message: `Your sign-in has expired. Sign in again to continue.`
- A button reading `Sign in` that goes to the sign-in page.

### 3.2 Any other failure

When the check fails for any other reason, retry it automatically twice before showing anything. If
it still fails, show:

- Message: `Something went wrong on our end. Reload the page to try again.`
- A button reading `Reload page` that reloads the page.

The state that currently reads `Legal acceptance is unavailable.` is a dead end of the same kind.
Show the 3.2 state in its place instead.

The loading state and the acceptance form itself do not change.

## 4. Do not change

- The acceptance rules themselves, in `findOrCreateAccount`, `provisionCurrentConsentAccount`, or
  `artifacts/api-server/src/routes/legal.ts`.
- The sign-up page.
- The legal sign-up intent's signing, hashing, or expiry.
- Anything not named in this addendum.

Do not create a Clerk account or a local account to test this. The owner tests real sign-ups.

## 5. Add this addendum to the list in replit.md

Add this file to the Build Brief entry in the ADDENDUMS GOVERN list in `replit.md`, below the
`VaultZombie-Build-Brief-Addendum-4-v2.md` line:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-5-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- The changed lookup in `findOrCreateAccount`, quoted, with confirmation that the row lock is still
  taken and that every check below it is unchanged.
- Read-only proof that the new lookup returns the expected fields: run the same query shape against
  the existing unconsumed intent row in the development database and report which fields come back
  populated. Change no rows.
- The changed `consent-gate.tsx`, quoted, showing both failure states, the header on each, and the
  two retries before the second state appears.
- Confirmation that the sign-up page, the acceptance rules, and the intent's signing and expiry were
  not changed.
- Confirmation that `replit.md` lists this addendum under the Build Brief entry, and that nothing
  else in that file changed.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
