// Re-exports the shared legal-configuration source so this file's existing
// import path (used by middlewares/auth.ts, routes/legal.ts, and app.ts) keeps
// resolving unchanged. The implementation lives in @workspace/legal so the
// scripts package (which may not import from an artifact, see the
// pnpm-workspace skill) can use the exact same source for admin account
// creation.
export * from "@workspace/legal";
