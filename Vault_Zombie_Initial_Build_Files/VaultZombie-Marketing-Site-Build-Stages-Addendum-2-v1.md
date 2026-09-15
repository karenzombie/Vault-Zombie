# VaultZombie Marketing Site, Build Stages, Addendum 2 (v1)

This addendum governs over `VaultZombie-Marketing-Site-Build-Stages-v1.md`, per the ADDENDUMS
GOVERN rule in `replit.md`. Both documents live in `Vault_Zombie_Initial_Build_Files/`.

It corrects Stage 3 only. Addendum 1 still stands in full. Nothing here changes Stage 1, Stage 2,
Stage 4, or Stage 5.

---

## 1. The Stage 3 source for vault type counts was named wrongly

Stage 3 of the build stages document instructs you to take the prompt counts and category counts
for `/vault-types` from `Vault_Zombie_Initial_Build_Files/question-metadata.json`, and describes
that file as the imported source for the question banks.

That instruction is wrong and is withdrawn. Your report of the mismatch was correct.

`question-metadata.json` is scoring configuration. It holds number ranges, close bands, and
scoreable flags for the subset of prompts that need special scoring handling. It is not a prompt
bank, it does not contain every prompt, and no count may be derived from it. Do not use it for
anything on the marketing site.

## 2. The correct source

The ten files named `vaultzombie-questions-<type>.md` in `Vault_Zombie_Initial_Build_Files/` are
the source for `/vault-types`. Take all three of these from them:

- the prompt count for each type
- the sub-category count for each type
- the one sample prompt shown for each type

Each of the ten files states its own prompt count and sub-category count near the top, and the
stated figure matches the number of prompt rows in that file. Use the stated figure.

The sample prompt for each type must appear word for word in that type's bank file. If the sample
prompt shown on the `m-types` screen of the marketing mockup appears word for word in the matching
bank file, you may keep it. If it does not, replace it with a prompt that does. Do not write your
own prompt and do not paraphrase one.

If any stated count in a bank file disagrees with the number of prompt rows in that same file,
STOP and report it. Do not pick one over the other yourself.

## 3. The site-wide total

The `m-types` screen of the mockup states an exact site-wide prompt total. Do not use an exact
number, because the banks may grow.

Where the mockup places its total, use this text instead, exactly:

> over 900 prompts in all

Do not state an exact total anywhere on the marketing site.

## 4. Add this addendum to the list in replit.md

The ADDENDUMS GOVERN rule in `replit.md` carries a list of documents and their addendums. Add this
file to the marketing site entry on that list, below Addendum 1:

```
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-2-v1.md`
```

Match the surrounding indentation exactly. Change nothing else in `replit.md`.

---

## Everything else in Stage 3 is unchanged

`/how-it-works` is unaffected by this addendum. If you have already built it, leave it as it is and
report it at the stop gate as the document originally asked.

The rest of Stage 3 stands: `/vault-types` still states that prompts fill in real names
automatically and that a host can retire any prompt they would rather skip, and the reveal
schedules and scoring behavior on `/how-it-works` still follow Build Brief sections 4 and 8 where
the mockup differs.

---

## STOP and report

- Confirmation that `replit.md` now lists both marketing site addendums, and that nothing else in
  that file changed.
- The files added and changed, with the reason for each.
- The ten vault types, with the prompt count and sub-category count you used for each, and the
  bank file you took each from.
- Confirmation that every sample prompt appears word for word in its bank file.
- Any place where a stated count disagreed with the prompt rows in the same file.
- Any place the mockup disagreed with the Build Brief on `/how-it-works`.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP. Do not begin Stage 4.
