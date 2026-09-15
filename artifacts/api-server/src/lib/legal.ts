// Re-exports the shared legal-configuration source so this file's existing
// import path (used by middlewares/auth.ts, routes/legal.ts, and app.ts) keeps
// resolving unchanged. The implementation lives in @workspace/legal so the
// scripts package (which may not import from an artifact, see the
// pnpm-workspace skill) can use the exact same source for admin account
// creation.
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { legalConfiguration, type LegalConfiguration } from "@workspace/legal";

export * from "@workspace/legal";

// legalConfiguration()'s cwd-based default assumes the process is started from
// a two-level-deep artifact directory (artifacts/api-server). On the published
// site the production command starts from the workspace root instead, which
// makes that default resolve to a nonexistent Policy_Documents folder and
// breaks /terms and /privacy. The API server is always built into a single
// bundled file (dist/index.mjs, see build.mjs), so import.meta.url here always
// resolves to that one file's own location in both development and
// production, regardless of the directory the process was started from -- the
// same principle scripts/src/create-admin.ts already uses for its own
// one-level-deep root. Every API server code path reads legal configuration
// through this file's currentLegalConfiguration(), so computing the root once
// here, rather than relying on the library's cwd-based default, covers all of
// them.
const API_SERVER_WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export function currentLegalConfiguration(): LegalConfiguration {
  return legalConfiguration(process.env, API_SERVER_WORKSPACE_ROOT);
}
