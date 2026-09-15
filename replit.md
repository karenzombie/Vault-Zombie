`VaultZombie-Question-Metadata.md` is an authoritative governing content-metadata document. Preserve it at the workspace root; do not infer or default any missing import metadata.
# Vault Zombie

A sealed-prediction web app for life events, with scheduled reveals, outcomes, and a long-running "who knew you best" scoreboard.

## Run & Operate

- Code repository: `https://github.com/karenzombie/Vault-Zombie` (remote `github`). The owner pushes to it from the Replit Git pane. The agent commits in the workspace but never pushes, force pushes, or uploads code to GitHub by any method, including the installed GitHub connection or the GitHub API.
- Data backups must use a separate private repository configured later; never place plaintext database backups in the code repository.
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `Vault_Zombie_Initial_Build_Files/` — authoritative specification set and clarification addenda
- `lib/db/src/schema/` — domain schema and permanent content identity
- `lib/db/src/sealed-content.ts` — sole ordinary read path for prediction content
- `lib/db/src/schedule.ts` — reveal and milestone date computation
- `scripts/src/question-bank-import.ts` — strict question-bank metadata validator/import foundation

## Architecture decisions

- Specification authority: master brief, authoritative clarification addenda, admin brief for admin, report guide for reports, style guide, then nonbinding mockups.
- Unlocking is computed. Prediction reads must filter through the single unlocked-content path using `COALESCE(unlock_override_at, unlock_at) <= now()`.
- Admin full export is the only content-read exception; manual unlock changes `unlock_override_at` and then uses the normal path.
- Content and option UUIDs are permanent; display order and wording can change without changing identity.
- Missing number or free-text scoring metadata is a hard import failure and is never inferred.

## Product

- Operators create and seal life-event vaults; account-free guests submit text predictions through write-only links.
- Predictions unlock on fixed schedules, operators resolve outcomes, and paid reports summarize scoring over time.
- Admin access includes MFA-gated sensitive actions, immutable auditing, content management, and manual backup.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

- **Standing rule (applies to every task): the agent does not make product decisions.** When something is unspecified, missing, ambiguous, or cannot be built as written, stop and report it, then wait — for prices, plan tiers, schedules, names, wording, limits, timing, defaults, or anything a person would recognize as a choice rather than an implementation detail. Do not choose a default, fallback, placeholder, or invented value, even when the code would work and even when nothing calls it yet. Reporting an unanswered question is always the right outcome.
  - **"Stop and report" means stop before building, and wait for an answer.** Flagging a decision after it has already been built does not satisfy this rule. If you find yourself about to write "worth your awareness" or "a call I made" in a report, that is the moment to stop and ask instead — before writing the code, not after. This also applies when a spec document says one thing and you believe something else fits better: report the difference and wait, rather than building your own version and noting it afterward.
- **Literal means literal.** When a document specifies exact copy or exact values, transcribe them character for character rather than writing your own version of the same idea. Covering similar ground is not the same as building what the document specified. If a sentence cannot be made accurate for a real situation, stop and report it rather than rewriting it.
- **Verify before reporting done.** Before reporting any work as finished, compare the built output against the document line by line: every subject line, heading, sentence, block, field, and icon. Report anything you could not match rather than substituting your own.
- **Addendums govern.** Several documents in this project have addendums. An addendum amends its original document and governs wherever the two differ. Whenever you read one of these documents, read its addendums too, and follow the addendum where it covers the same ground. Addendum file names carry version numbers; the highest version of a given addendum is the current one.

  The documents and their addendums, as of now:

  - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-v2.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Build-Brief-Addendum-1-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Spec-Clarifications-2026-09-08.md`

  - `Vault_Zombie_Initial_Build_Files/VaultZombie-Flow1-Build-Stages.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Flow1-Addendum-1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Flow1-Addendum-2-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Flow1-Addendum-3-v1.md`

  - `Vault_Zombie_Initial_Build_Files/VaultZombie-Email-Spec.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Email-Spec-Addendum-1-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Email-Spec-Addendum-2-v1.md`

  - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-1-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-2-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-3-v1.md`
    - `Vault_Zombie_Initial_Build_Files/VaultZombie-Marketing-Site-Build-Stages-Addendum-4-v1.md`

  More addendums will be added over time. If you find an addendum file in the workspace that is not on this list, follow it as well and report that the list is out of date. Never treat an original document as current where an addendum covers the same ground.

## Gotchas

- Never query prediction content directly from `answers`; use `readUnlockedAnswers`.
- Lockbox has no export or print stylesheet, even when a paid report has a visually similar free counterpart.
- Deep Vault milestones may exceed ten years and combine with a regular reveal on the same date.
- Question-bank import remains intentionally blocked until owner-supplied metadata passes validation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
