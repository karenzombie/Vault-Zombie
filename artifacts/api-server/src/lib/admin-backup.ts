import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import { pool } from "@workspace/db";

const CODE_REPOSITORY = "karenzombie/vault_zombie_codebase";
const REPOSITORY = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const CORE_TABLES = ["accounts", "audit_events", "vaults", "vault_questions", "reveal_slots", "guests", "submissions", "answers", "question_outcomes", "answer_verdicts", "billing_records", "stripe_webhook_events", "refund_attempts", "gifts", "overage_events", "vault_types", "subcategories", "questions", "question_options", "email_deliveries", "backup_runs"];
const MARKER_PATH = ".vault-zombie-backup-repository.json";
const MARKER = '{"format":"vault-zombie-backup-repository","version":1,"application":"VaultZombie"}\n';
export type BackupConfig = { repository: string; token: string };
export type Artifact = { path: string; bytes: Buffer; sha256: string };

export class BackupConfigurationError extends Error {
  constructor(readonly missingVariables: string[]) {
    super(`Backup configuration missing: ${missingVariables.join(", ")}.`);
  }
}
export function backupConfig(env = process.env): BackupConfig {
  const repositoryValue = env.VAULT_ZOMBIE_BACKUP_REPOSITORY?.trim();
  const token = env.VAULT_ZOMBIE_BACKUP_GITHUB_TOKEN?.trim();
  const missing = [
    !repositoryValue && "VAULT_ZOMBIE_BACKUP_REPOSITORY",
    !token && "VAULT_ZOMBIE_BACKUP_GITHUB_TOKEN",
  ].filter(Boolean);
  if (missing.length) throw new BackupConfigurationError(missing as string[]);
  const repository = repositoryValue!;
  if (!REPOSITORY.test(repository) || repository.toLowerCase().endsWith(".git") || repository.toLowerCase() === CODE_REPOSITORY) {
    throw new Error("VAULT_ZOMBIE_BACKUP_REPOSITORY must be a dedicated owner/name backup repository (not a URL, .git path, or the code repository).");
  }
  return { repository, token: token! };
}

/** RFC4180 convention: an unquoted \\N is SQL NULL; every non-null is quoted. */
export const csvCell = (value: unknown) => {
  if (value === null || value === undefined) return "\\N";
  const text = Buffer.isBuffer(value) ? `base64:${value.toString("base64")}`
    : value instanceof Date ? value.toISOString()
      : typeof value === "object" ? JSON.stringify(value)
        : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};
export function parseCsvRecord(record: string): string[] {
  const result: string[] = []; let value = ""; let quoted = false;
  for (let index = 0; index < record.length; index++) {
    const char = record[index]!;
    if (quoted && char === '"' && record[index + 1] === '"') { value += '"'; index++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { result.push(value); value = ""; }
    else value += char;
  }
  if (quoted) throw new Error("Invalid RFC4180 CSV header.");
  result.push(value); return result;
}
const quoteIdent = (value: string) => `"${value.replaceAll('"', '""')}"`;
const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");
export class BackupProcessError extends Error {
  constructor(readonly executable: string, readonly exitCode: number | null, stderr = "") {
    super(`${executable} failed${exitCode == null ? "" : ` (exit ${exitCode})`}: ${stderr.replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED]").replace(/gh[opsu]_[A-Za-z0-9_]+/g, "[REDACTED]").slice(0, 1000) || "no diagnostic output"}`);
  }
}
function pgEnvironment() {
  const url = new URL(process.env.DATABASE_URL!);
  return { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGSSLMODE: url.searchParams.get("sslmode") ?? "prefer" };
}
async function execute(executable: string, args: string[], options: { env?: NodeJS.ProcessEnv; maxBytes?: number } = {}) {
  const max = options.maxBytes ?? 128 * 1024 * 1024;
  return await new Promise<Buffer>((resolve, reject) => {
    const child = spawn(executable, args, { env: options.env, stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = []; const stderr: Buffer[] = []; let outSize = 0; let errSize = 0; let overflow = false; let spawnFailed = false;
    child.stdout.on("data", (chunk: Buffer) => { outSize += chunk.length; if (outSize <= max) stdout.push(chunk); else overflow = true; });
    child.stderr.on("data", (chunk: Buffer) => { errSize += chunk.length; if (errSize <= 64 * 1024) stderr.push(chunk); });
    child.once("error", () => { spawnFailed = true; });
    child.once("close", (code) => {
      if (spawnFailed || code !== 0 || overflow) reject(new BackupProcessError(executable, code, overflow ? "output exceeded safe limit" : Buffer.concat(stderr).toString("utf8")));
      else resolve(Buffer.concat(stdout));
    });
  });
}
const run = async (command: string, args: string[], env?: NodeJS.ProcessEnv) => { await execute(command, args, { env, maxBytes: 1024 * 1024 }); };
const runCopy = async (sql: string, output: string) => {
  const bytes = await execute("psql", ["--no-psqlrc", "--quiet", "--tuples-only", "-v", "ON_ERROR_STOP=1", "-c", sql], { env: pgEnvironment() });
  await writeFile(output, bytes, { mode: 0o600 });
};

async function version(command: string): Promise<string> {
  return new Promise((resolve) => {
    const child = spawn(command, ["--version"]);
    let output = "";
    child.stdout.on("data", (data) => { output += data; });
    child.once("error", () => resolve("unavailable"));
    child.once("exit", () => resolve(output.trim() || "unavailable"));
  });
}

export async function createSnapshot(snapshotId: string, requestId: string, generatedAt: string) {
  const temp = await mkdtemp(join(tmpdir(), "vault-zombie-backup-"));
  let client: any;
  try {
    await chmod(temp, 0o700);
    const root = join(temp, "backups", snapshotId);
    await mkdir(join(root, "tables"), { recursive: true, mode: 0o700 });
    client = await pool.connect();
    await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const exported = await client.query("SELECT pg_export_snapshot() AS snapshot") as { rows: Array<{ snapshot: string }> };
    const snapshot = exported.rows[0]!.snapshot;
    const tables = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name",
    ) as { rows: Array<{ table_name: string }> };
    const names = tables.rows.map((row: { table_name: string }) => row.table_name);
    const absent = CORE_TABLES.filter((name) => !names.includes(name));
    if (absent.length) throw new Error(`Backup aborted: expected core tables are missing: ${absent.join(", ")}.`);

    // DATABASE_URL is passed only as an inherited environment variable; it is never logged.
    await run("pg_dump", ["--format=custom", "--no-owner", "--no-privileges", `--snapshot=${snapshot}`, "--file", join(root, "database.dump")], pgEnvironment());
    await run("pg_restore", ["--list", join(root, "database.dump")]);
    const inventory: Array<{ table: string; columns: Array<{ name: string; dataType: string; udtName: string }>; rows: number; csv: string }> = [];
    for (const table of names) {
      const columnsResult = await client.query(
        "SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table],
      ) as { rows: Array<{ column_name: string; data_type: string; udt_name: string }> };
      const columns = columnsResult.rows.map((row) => ({ name: row.column_name, dataType: row.data_type, udtName: row.udt_name }));
      const rows = await client.query(`SELECT count(*)::integer AS count FROM public.${quoteIdent(table)}`);
      const csvPath = join(root, "tables", `${table}.csv`);
      const copy = `BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY; SET TRANSACTION SNAPSHOT '${snapshot}'; COPY (SELECT * FROM public.${quoteIdent(table)} ORDER BY ctid) TO STDOUT WITH (FORMAT CSV, HEADER true, NULL '\\N', FORCE_QUOTE *); COMMIT;`;
      await runCopy(copy, csvPath);
      const header = (await readFile(csvPath, "utf8")).split(/\r?\n/, 1)[0];
      if (JSON.stringify(parseCsvRecord(header)) !== JSON.stringify(columns.map((column) => column.name))) throw new Error(`Backup CSV header validation failed for ${table}.`);
      inventory.push({ table, columns, rows: Number(rows.rows[0]!.count), csv: `tables/${table}.csv` });
    }
    await client.query("COMMIT");
    client.release(); client = undefined;
    const dumpVersion = await version("pg_dump");
    const pgVersion = (await pool.query<{ version: string }>("SHOW server_version")).rows[0]!.version;
    const artifacts: Artifact[] = [];
    const add = async (path: string, artifactPath = path) => {
      const bytes = await readFile(join(root, path));
      artifacts.push({ path: artifactPath, bytes, sha256: sha256(bytes) });
    };
    await add("database.dump");
    for (const item of inventory) await add(item.csv);
    const manifest = {
      format: "vault-zombie-backup", version: 1, snapshotId, requestId, generatedAt,
      sourcePostgreSqlVersion: pgVersion, pgDumpVersion: dumpVersion, sealedAnswersIncluded: true,
      tables: inventory, artifacts: artifacts.map(({ path, bytes, sha256: digest }) => ({ path, bytes: bytes.length, sha256: digest })),
    };
    await writeFile(join(root, "RECOVERY.md"), recovery(snapshotId), { mode: 0o600 });
    await writeFile(join(temp, "RECOVERY.md"), rootRecovery(), { mode: 0o600 });
    await add("RECOVERY.md", "snapshot/RECOVERY.md");
    const rootRecoveryArtifact = await readFile(join(temp, "RECOVERY.md"));
    const rootRecoverySha256 = sha256(rootRecoveryArtifact);
    manifest.artifacts = artifacts.map(({ path, bytes, sha256: digest }) => ({ path: path.replace(/^snapshot\//, ""), bytes: bytes.length, sha256: digest }));
    Object.assign(manifest, { rootRecoverySha256 });
    await writeFile(join(root, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
    await add("MANIFEST.json");
    artifacts.push({ path: "RECOVERY.md", bytes: rootRecoveryArtifact, sha256: rootRecoverySha256 });
    artifacts.push({ path: MARKER_PATH, bytes: Buffer.from(MARKER), sha256: sha256(MARKER) });
    // Validate the manifest's non-self inventory before any network call.
    for (const item of manifest.artifacts) {
      const artifact = artifacts.find((candidate) => candidate.path.replace(/^snapshot\//, "") === item.path);
      if (!artifact || artifact.sha256 !== item.sha256) throw new Error("Backup artifact integrity validation failed.");
    }
    return { temp, artifacts, manifest, rootRecoverySha256, manifestSha256: sha256(await readFile(join(root, "MANIFEST.json"))), contentSha256: sha256(artifacts.map((a) => `${a.path}:${a.sha256}`).sort().join("\n")) };
  } catch (error) {
    if (client) { await client.query("ROLLBACK").catch(() => undefined); client.release(); }
    await rm(temp, { recursive: true, force: true });
    throw error;
  }
}

export async function removeSnapshot(temp: string) { await rm(temp, { recursive: true, force: true }); }
function recovery(snapshotId: string) { return `# Snapshot recovery\n\nVerify SHA-256 values in MANIFEST.json before use. The custom dump is authoritative: restore with \`pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" database.dump\`. CSV files are portable reference exports. This snapshot (${snapshotId}) includes plaintext sealed answers; secrets and Clerk/Stripe/Resend/provider configuration are not included.\n`; }
function rootRecovery() { return `# VaultZombie backup recovery\n\nEach commit contains one restore-ready custom PostgreSQL dump and UTF-8 RFC4180 CSV files. Verify every artifact SHA-256 against its MANIFEST.json, then restore the dump with \`pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" backups/<snapshot>/database.dump\`. The dump is the source of truth; CSVs are for inspection or migration. Sealed answers are plaintext. Secrets, authentication, and provider configuration are not backed up and must be configured separately. This private repository's Git history deliberately retains data after files are deleted; treat all history as sensitive.\n`; }

async function github(config: BackupConfig, path: string, init?: RequestInit) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(`https://api.github.com${path}`, { ...init, headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`, "X-GitHub-Api-Version": "2022-11-28", ...init?.headers } });
    const rateLimited = response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0");
    if (response.ok || (response.status < 500 && !rateLimited)) return response;
    if (attempt === 2) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const reset = Number(response.headers.get("x-ratelimit-reset"));
    const delay = Number.isFinite(retryAfter) ? retryAfter * 1000
      : Number.isFinite(reset) && reset > 0 ? Math.max(0, reset * 1000 - Date.now())
        : 250 * (attempt + 1);
    await new Promise((resolve) => setTimeout(resolve, Math.min(delay, 30_000)));
  }
  throw new Error("Unreachable");
}
async function json(config: BackupConfig, path: string, init?: RequestInit) {
  const response = await github(config, path, init);
  if (!response.ok) throw new Error(`GitHub backup request failed (${response.status}).`);
  return response.json() as Promise<any>;
}
export async function reconcileRemoteSnapshot(config: BackupConfig, snapshotId: string, requestId: string, manifestSha256: string) {
  const repo = await json(config, `/repos/${config.repository}`);
  const branch = repo.default_branch || "main";
  const commits = await json(config, `/repos/${config.repository}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(`backups/${snapshotId}/MANIFEST.json`)}&per_page=10`);
  for (const commit of Array.isArray(commits) ? commits : []) {
    const remote = await json(config, `/repos/${config.repository}/contents/backups/${encodeURIComponent(snapshotId)}/MANIFEST.json?ref=${commit.sha}`);
    const bytes = Buffer.from(remote.content.replace(/\s/g, ""), "base64");
    const parsed = JSON.parse(bytes.toString("utf8"));
    if (sha256(bytes) === manifestSha256 && parsed.requestId === requestId && parsed.snapshotId === snapshotId) return { branch, commitSha: commit.sha };
  }
  return undefined;
}
async function gitPush(config: BackupConfig, branch: string, parent: string | undefined, snapshotId: string, artifacts: Artifact[]) {
  const temp = await mkdtemp(join(tmpdir(), "vault-zombie-git-"));
  try {
    await chmod(temp, 0o700);
    const askpass = join(temp, "askpass.sh");
    await writeFile(askpass, '#!/bin/sh\ncase "$1" in *Username*) printf %s x-access-token;; *) printf %s "$VAULT_ZOMBIE_GIT_TOKEN";; esac\n', { mode: 0o700 });
    const index = join(temp, "index");
    const env = { ...process.env, GIT_ASKPASS: askpass, GIT_TERMINAL_PROMPT: "0", VAULT_ZOMBIE_GIT_TOKEN: config.token, GIT_INDEX_FILE: index };
    await run("git", ["init", "--quiet", temp], env);
    await run("git", ["-C", temp, "remote", "add", "origin", `https://github.com/${config.repository}.git`], env);
    if (parent) {
      await run("git", ["-C", temp, "fetch", "--quiet", "--filter=blob:none", "--depth=1", "origin", `refs/heads/${branch}`], env);
      await run("git", ["-C", temp, "read-tree", "FETCH_HEAD"], env);
    }
    for (const artifact of artifacts) {
      const repositoryPath = artifact.path === "RECOVERY.md" || artifact.path === MARKER_PATH ? artifact.path : `backups/${snapshotId}/${artifact.path.replace(/^snapshot\//, "")}`;
      const file = join(temp, "artifact");
      await writeFile(file, artifact.bytes, { mode: 0o600 });
      const blob = (await execute("git", ["-C", temp, "hash-object", "-w", file], { env })).toString("utf8").trim();
      await run("git", ["-C", temp, "update-index", "--add", "--cacheinfo", `100644,${blob},${repositoryPath}`], env);
    }
    const tree = (await execute("git", ["-C", temp, "write-tree"], { env })).toString("utf8").trim();
    const commitArgs = ["-C", temp, "-c", "user.name=VaultZombie Backup", "-c", "user.email=backup@vaultzombie.invalid", "commit-tree", tree, "-m", `VaultZombie backup ${snapshotId}`];
    if (parent) commitArgs.push("-p", "FETCH_HEAD");
    const commit = (await execute("git", commitArgs, { env })).toString("utf8").trim();
    await run("git", ["-C", temp, "push", "--quiet", "origin", `${commit}:refs/heads/${branch}`], env);
    return commit;
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}
export async function pushSnapshot(config: BackupConfig, snapshotId: string, artifacts: Artifact[]) {
  const repo = await json(config, `/repos/${config.repository}`);
  if (!repo.private || !repo.permissions?.push) throw new Error("Backup repository must be private and the backup token must have write access.");
  const branch = repo.default_branch || "main";
  if (artifacts.some((artifact) => artifact.bytes.length > 100 * 1024 * 1024)) throw new Error("Backup aborted: a GitHub file exceeds the 100MB limit.");
  const total = artifacts.reduce((sum, artifact) => sum + artifact.bytes.length, 0);
  if (total > 90 * 1024 * 1024) throw new Error("Backup aborted: snapshot is too large for one GitHub commit request.");
  for (let attempt = 0; attempt < 3; attempt++) {
    const refResponse = await github(config, `/repos/${config.repository}/git/ref/heads/${encodeURIComponent(branch)}`);
    const ref: any = refResponse.ok ? await refResponse.json() : undefined;
    if (!ref && refResponse.status !== 404 && refResponse.status !== 409) throw new Error(`GitHub backup request failed (${refResponse.status}).`);
    if (ref) {
      const headCommit = await json(config, `/repos/${config.repository}/git/commits/${ref.object.sha}`);
      const rootTree = await json(config, `/repos/${config.repository}/git/trees/${headCommit.tree.sha}`);
      const allowed = new Set([MARKER_PATH, "RECOVERY.md", "backups"]);
      if (!rootTree.tree?.every((entry: { path: string }) => allowed.has(entry.path))) throw new Error("Backup repository has unexpected root paths.");
      const marker = await json(config, `/repos/${config.repository}/contents/${MARKER_PATH}?ref=${encodeURIComponent(branch)}`);
      if (Buffer.from(marker.content.replace(/\s/g, ""), "base64").toString("utf8") !== MARKER) throw new Error("Backup repository marker is missing or invalid.");
      const previous = await json(config, `/repos/${config.repository}/commits?sha=${encodeURIComponent(branch)}&path=${encodeURIComponent(`backups/${snapshotId}/MANIFEST.json`)}&per_page=1`);
      const existing = Array.isArray(previous) ? previous.find((commit) => commit.commit?.message === `VaultZombie backup ${snapshotId}`) : undefined;
      if (existing?.sha) {
        const remote = await json(config, `/repos/${config.repository}/contents/backups/${encodeURIComponent(snapshotId)}/MANIFEST.json?ref=${existing.sha}`);
        const expected = artifacts.find((artifact) => artifact.path === "MANIFEST.json");
        const decoded = Buffer.from(remote.content.replace(/\s/g, ""), "base64");
        if (!expected || !decoded.equals(expected.bytes)) throw new Error("Remote backup manifest does not match the persisted snapshot identity.");
        const parsed = JSON.parse(decoded.toString("utf8"));
        if (parsed.snapshotId !== snapshotId || typeof parsed.requestId !== "string") throw new Error("Remote backup manifest identity is invalid.");
        return { branch, commitSha: existing.sha };
      }
    }
    try {
      const commitSha = await gitPush(config, branch, ref?.object.sha, snapshotId, artifacts);
      return { branch, commitSha };
    } catch (error) {
      if (attempt === 2) throw error;
      const manifest = artifacts.find((artifact) => artifact.path === "MANIFEST.json");
      const parsed = manifest ? JSON.parse(manifest.bytes.toString("utf8")) : undefined;
      const reconciled = manifest && parsed ? await reconcileRemoteSnapshot(config, snapshotId, parsed.requestId, manifest.sha256) : undefined;
      if (reconciled) return reconciled;
    }
  }
  throw new Error("Backup push retry limit exceeded.");
}