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

## Gotchas

- Never query prediction content directly from `answers`; use `readUnlockedAnswers`.
- Lockbox has no export or print stylesheet, even when a paid report has a visually similar free counterpart.
- Deep Vault milestones may exceed ten years and combine with a regular reveal on the same date.
- Question-bank import remains intentionally blocked until owner-supplied metadata passes validation.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
