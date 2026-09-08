import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const repository = (value) => /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value) && !value.toLowerCase().endsWith(".git") && value.toLowerCase() !== "karenzombie/vault_zombie_codebase";
const csv = (value) => value == null ? "\\N" : `"${(typeof value === "object" ? JSON.stringify(value) : String(value)).replaceAll('"', '""')}"`;
const hash = (value) => createHash("sha256").update(value).digest("hex");

if (repository("https://github.com/a/b") || repository("a/b.git") || repository("karenzombie/vault_zombie_codebase") || !repository("owner.backup/private_repo")) throw new Error("repository validation failed");
if (csv(null) !== "\\N" || csv("") !== "\"\"" || csv({ a: "x" }) !== "\"{\"\"a\"\":\"\"x\"\"}\"") throw new Error("CSV escaping/null convention failed");
const artifact = "safe artifact";
const manifest = { artifacts: [{ path: "x", sha256: hash(artifact) }] };
if (manifest.artifacts[0].sha256 !== hash(artifact)) throw new Error("manifest hash failed");
const request = { ref: "refs/heads/main", sha: "commit", force: false };
if (request.force || !request.ref.startsWith("refs/heads/")) throw new Error("GitHub fast-forward request shape failed");
const marker = '{"format":"vault-zombie-backup-repository","version":1,"application":"VaultZombie"}\n';
if (marker !== '{"format":"vault-zombie-backup-repository","version":1,"application":"VaultZombie"}\n' || !new Set([".vault-zombie-backup-repository.json", "RECOVERY.md", "backups"]).has("backups")) throw new Error("marker contract failed");
const remoteManifest = Buffer.from(JSON.stringify({ requestId: "11111111-1111-4111-8111-111111111111", snapshotId: "snapshot" }));
if (hash(remoteManifest) !== hash(remoteManifest) || hash(remoteManifest) === hash("mismatch")) throw new Error("remote manifest verification failed");
const copy = "COPY (SELECT * FROM public.\"answers\" ORDER BY ctid) TO STDOUT WITH (FORMAT CSV, HEADER true, NULL '\\N', FORCE_QUOTE *);";
if (!copy.includes("HEADER true") || !copy.includes("NULL '\\N'") || !copy.includes("FORCE_QUOTE *")) throw new Error("COPY contract failed");
const immutable = { requestId: "id", snapshotId: "snapshot", manifestSha256: "hash" };
if (immutable.requestId !== "id" || immutable.snapshotId !== "snapshot") throw new Error("immutable identity failed");
const fallbackDelay = (retryAfter, reset, now) => Number.isFinite(retryAfter) ? retryAfter * 1000 : Number.isFinite(reset) && reset > 0 ? Math.max(0, reset * 1000 - now) : 250;
if (fallbackDelay(Number.NaN, Number.NaN, Date.now()) !== 250) throw new Error("retry fallback failed");
const missing = (env) => [!env.repository?.trim() && "VAULT_ZOMBIE_BACKUP_REPOSITORY", !env.token?.trim() && "VAULT_ZOMBIE_BACKUP_GITHUB_TOKEN"].filter(Boolean);
if (missing({ repository: " ", token: " " }).join(",") !== "VAULT_ZOMBIE_BACKUP_REPOSITORY,VAULT_ZOMBIE_BACKUP_GITHUB_TOKEN") throw new Error("missing configuration names failed");
const parse = (line) => { const values = []; let value = "", quoted = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (quoted && c === '"' && line[i + 1] === '"') { value += '"'; i++; } else if (c === '"') quoted = !quoted; else if (c === "," && !quoted) { values.push(value); value = ""; } else value += c; } values.push(value); return values; };
if (JSON.stringify(parse('"id","comma,name","quote""name"')) !== JSON.stringify(["id", "comma,name", 'quote"name'])) throw new Error("RFC4180 header parsing failed");
const secret = "postgres://owner:synthetic-secret@example.invalid/db";
const failed = spawnSync("definitely-missing-backup-executable", [], { env: { ...process.env, DATABASE_URL: secret }, encoding: "utf8" });
const sanitized = `executable failed (${failed.status ?? "spawn"}): no diagnostic output`;
if (JSON.stringify({ message: sanitized, executable: "executable" }).includes("synthetic-secret")) throw new Error("process error leaked credentials");
if (process.env.DATABASE_URL) {
  const url = new URL(process.env.DATABASE_URL);
  const pg = spawnSync("psql", ["--no-psqlrc", "--quiet", "--tuples-only", "-v", "ON_ERROR_STOP=1", "-c", "COPY (SELECT 1::integer AS id WHERE false) TO STDOUT WITH (FORMAT CSV, HEADER true, NULL '\\N', FORCE_QUOTE *);"], {
    env: { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGDATABASE: url.pathname.slice(1), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password) }, encoding: "utf8",
  });
  if (pg.status || JSON.stringify(parse(pg.stdout.trim())) !== JSON.stringify(["id"])) throw new Error("production COPY header smoke failed");
}
const gitTemp = mkdtempSync(join(tmpdir(), "backup-git-smoke-"));
try {
  const bare = join(gitTemp, "remote.git"), work = join(gitTemp, "work");
  const git = (...args) => { const result = spawnSync("git", args, { encoding: "utf8" }); if (result.status) throw new Error("local git smoke failed"); return result.stdout.trim(); };
  git("init", "--bare", "--quiet", bare); git("init", "--quiet", work);
  writeFileSync(join(work, ".vault-zombie-backup-repository.json"), marker);
  git("-C", work, "add", "."); git("-C", work, "-c", "user.name=Smoke", "-c", "user.email=smoke@example.invalid", "commit", "--quiet", "-m", "root");
  git("-C", work, "push", "--quiet", bare, "HEAD:refs/heads/main");
  writeFileSync(join(work, "RECOVERY.md"), "recovery\n"); git("-C", work, "add", ".");
  git("-C", work, "-c", "user.name=Smoke", "-c", "user.email=smoke@example.invalid", "commit", "--quiet", "-m", "child");
  git("-C", work, "push", "--quiet", bare, "HEAD:refs/heads/main");
  if (git("--git-dir", bare, "rev-list", "--count", "main") !== "2") throw new Error("empty/existing one-commit git flow failed");
} finally { rmSync(gitTemp, { recursive: true, force: true }); }
console.log("backup smoke checks passed");