# VaultZombie Build Brief, Addendum 3 (v1)

This addendum governs over `VaultZombie-Build-Brief-v2.md`, `VaultZombie-Flow1-Build-Stages.md`,
and `VaultZombie-Email-Spec.md`, and over each of their existing addendums wherever they cover the
same ground, per the ADDENDUMS GOVERN rule in `replit.md`. All of these documents live in
`Vault_Zombie_Initial_Build_Files/`.

It finishes work that Build Brief Addendum 2 required. Addendum 2 still stands in full.

Read this whole document before writing any code. If anything here cannot be built as written,
STOP and ask.

---

## 1. Leftover processes

List every running process in the workspace whose command line contains `email-worker` or
`while true`. Stop any that exist, and report what each one was.

## 2. Remaining places that use the UTC date for a vault

Addendum 2, section 7.8, requires every place that decides today's date for a vault to use that
vault's time zone through `todayInTimeZone` in `lib/db/src/timezone.ts`. These places still use the
UTC date. Change each one.

- `artifacts/api-server/src/lib/email/render.ts`, in the H8 guest limit reminder builder, where it
  picks the next upcoming reveal date.
- `artifacts/api-server/src/lib/email/render.ts`, in the G2 results builder, where it picks the next
  reveal date.
- `artifacts/api-server/src/lib/email-evaluator.ts`, in the H8 check, where the end of the "within
  the next 7 days" window is computed from the UTC date. Both ends of the window must be measured
  from the vault's own today.
- `artifacts/api-server/src/routes/admin-billing.ts`, in the host's guest limit status route, where
  it finds the nearest upcoming reveal date.
- `artifacts/api-server/src/routes/admin-billing.ts`, in the admin dashboard route, where it counts
  reveals that have opened. Each reveal is compared against its own vault's today.
- `artifacts/vault-zombie/src/pages/operator/vault-setup.tsx`, in the schedule section, where the
  reveal date preview uses today's UTC date when the event date is blank. Once the host has chosen a
  time zone, the preview uses today's date in that time zone, from the same shared
  `todayInTimeZone`. The UTC date is used only while no time zone has been chosen.

Then search the whole codebase again, server and client, and report any other place that still
decides today's date for a vault without the vault's time zone. Do not change the date helpers in
`lib/db/src/schedule.ts`, which convert dates rather than deciding today.

Nothing else about these emails, screens, or routes changes. No email copy changes.

## 3. A standing rule in replit.md

In `replit.md`, add this line directly below the line that begins `- **Verify before reporting
done.**`, and change nothing else there:

```
- **Never mention follow-up task proposals.** Never mention follow-up task proposals, proposeFollowUpTasks, or any preference about them, in any message.
```

## 4. Add this addendum to the list in replit.md

Add this file to the same three entries in the ADDENDUMS GOVERN list in `replit.md` that list
Build Brief Addendum 2, each directly below the Addendum 2 line:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-3-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## STOP and report

- Every process found in section 1, what it was, and the list of node processes still running
  afterward.
- For each place in section 2, the changed code, quoted.
- Any other place found by the second search, and what you changed.
- A test showing the H8 window and the setup preview using the vault's time zone, for at least
  `America/Los_Angeles` and `Asia/Kathmandu`.
- Confirmation that `replit.md` now has the standing rule from section 3 and lists this addendum
  under all three entries, and that nothing else in that file changed.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP.
