# Vault Zombie: Flow 1 Build, Addendum 1

Applies to `VaultZombie-Flow1-Build-Stages.md`. Read both. Where this addendum covers something, it governs. Everything else in that document is unchanged.

This answers the two items raised in the stage 1 audit, and adds the vault lifecycle the original build never wired up.

---

## A1. Vault status, all five values

Adds to stage 1 section 1.4.

`vaultStatusEnum` allows five values, but nothing in the code moves a vault past `sealed` today. The dashboard shows all of them. Stage 5 wires up the transitions (A4).

| Status | Card label | Meaning |
|---|---|---|
| `draft` | Draft | Still being set up. Guests cannot answer. |
| `sealed` | Sealed | Live and collecting predictions. No reveal has opened yet. |
| `active` | Partially unlocked, or Fully unlocked | At least one reveal has opened. Reads **Fully unlocked** once every reveal has opened, and **Partially unlocked** before that. |
| `completed` | Completed | Every reveal has opened and every scoreable prediction has a marked result. |
| `deleted` | Never shown | Hidden from the host entirely. See A2. |

**Partially and fully unlocked are display labels, not stored values.** Both are the `active` status, and the difference is worked out from the vault's reveal dates. Do not add a sub-status column.

**Clicking a card:** a draft opens `/operator/vaults/:vaultId/setup` (stage 3). Every other status opens `/operator/vaults/:vaultId`.

**Sorting:** drafts first, then sealed and active, then completed, each group newest first. Deleted vaults never appear.

---

## A2. Deleting a vault

New, part of stage 1.

A vault can be deleted by its host, from the vault's own page, or by an admin from the admin panel. Deleting sets the vault's status to `deleted`.

**A deleted vault is never erased.** It stays in the database with its predictions intact, hidden from the host everywhere: the dashboard, the guest link, reports, and emails. It is kept for possible future legal need.

An admin can see deleted vaults in the admin panel, in an archive view separate from live vaults, and can restore one. Restoring returns the vault to the status it held before deletion, and it reappears for the host.

**Host-facing confirmation, before deleting:**

> **Delete this vault?**
> Your guests' predictions will no longer be readable, and your guest link will stop working. This cannot be undone from here.

Deleting sends no email to anyone.

---

## A3. The two items from the stage 1 audit

**Links to `/operator?vaultId=`.** Update every one of them to use `/operator/vaults/:vaultId` directly. Keep the redirect from the old form as a safety net for bookmarks.

**`/gifts/redeem`.** Leave it alone in stage 1. Section 2.5 replaces it in stage 2. The stage 1 checklist line "nothing asks a host to type a Vault ID" applies to the dashboard, the header, and the auth pages. It does not apply to `/gifts/redeem`, which still asks for one until stage 2.

---

## A4. Status transitions

Adds to stage 5.

Nothing in the code moves a vault past `sealed` today. Wire up the rest of the lifecycle in A1:

- A sealed vault becomes `active` when its first reveal opens.
- An active vault becomes `completed` when every reveal has opened and every scoreable prediction has a marked result.
- Both happen on their own, with no host action. Work them out from the vault's reveal dates and its marked results, using the existing reveal and scoring data. Do not add new columns.
- `deleted` is set only by the host or an admin, per A2, and never automatically.

---

## A5. Added to the done checklists

**Stage 1:**
- Cards show the right status label, including partially and fully unlocked, and deleted vaults never appear.
- A host can delete a vault, an admin can see and restore it, and the host never sees it while deleted.

**Stage 5:**
- A vault moves to active when its first reveal opens, and to completed once everything is revealed and scored.
