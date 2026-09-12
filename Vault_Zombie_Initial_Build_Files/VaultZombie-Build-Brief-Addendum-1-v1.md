# Vault Zombie: Build Brief Addendum 1

**Applies to:** `VaultZombie-Build-Brief-v2.md`
**Date:** September 12, 2026

Read both documents. Where this addendum covers something, it governs. Everything else in the build brief is unchanged.

---

## A1. An answer no longer stores its own unlock date

The build brief describes each answer carrying an `unlock_at` timestamp, written at submission time. That column has been removed. An answer's unlock date is now read from the reveal slot the answer belongs to, at the moment it is read, so the date exists in exactly one place.

**Why it changed.** A sealed vault's event date can be moved after sealing, so a postponed event can be corrected, and moving it recalculates every reveal that has not happened yet. A copy of the date frozen onto each answer would drift out of step with the reveal it belongs to the moment that happened. One date in one place cannot drift.

**What replaces it.** Every answer already carries a required link to its reveal slot. That slot holds the reveal date, and the slot is what moves when a schedule is recalculated. Answers follow it automatically, which is what keeps a guest's own reveal choice attached to the same reveal.

---

## A2. The single read path

Section 13 of the build brief states the sealed-content read condition as `COALESCE(unlock_override_at, unlock_at) <= now()`. Read it now as:

> The single read path filters on the answer's `unlock_override_at` when one is set, and otherwise on the reveal date of the reveal slot the answer belongs to.

Everything else about the sealed rule is unchanged, and none of it is weakened:

- There is still one read path for answer content.
- `unlock_override_at` is still null for every answer except those an admin has deliberately force-unlocked, and reseal still sets it back to null.
- The admin manual unlock is still the one sanctioned exception: admin only, MFA gated, type to confirm, a written reason required, and written to the append-only audit log.
- No host, guest, or gifter has any path to it.
- Dashboards and vault health still show counts and metadata only, never answer text.

---

## A3. Unlocking is still computed, never a stored flag

Decision 1 in the build brief's decision table records that unlocking is computed rather than set by a background job. That still holds, and this change strengthens it. Nothing writes an unlock state anywhere. The reveal date is compared at read time, so a dormant vault still opens correctly years later with no job having run.

Decision 22 in the same table records the read path in its old form. It is superseded by A2 above. The reasoning behind it is unchanged: the computed-unlock model and the single read path are both intact.

---

## A4. Sections this addendum corrects

| Build brief location | What it says | Read it as |
|---|---|---|
| Section 4, the paragraph on answer storage | Each answer stores an `unlock_at` timestamp calculated at submission | An answer stores no unlock date. It carries its reveal slot, and the slot carries the date. |
| Section 13, the single read path | `COALESCE(unlock_override_at, unlock_at) <= now()` | A2 above |
| Decision 1 | Unlocking computed from `unlock_at` | Unlocking computed from the reveal slot's date |
| Decision 22 | Single read path stated in its old form | A2 above |
