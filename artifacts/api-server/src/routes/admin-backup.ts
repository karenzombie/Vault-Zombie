import { and, eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { backupRunsTable, db, pool, runSensitiveAdminAction } from "@workspace/db";
import { sensitiveAdminGuards } from "../middlewares/auth";
import { backupConfig, createSnapshot, reconcileRemoteSnapshot, removeSnapshot, pushSnapshot } from "../lib/admin-backup";

const router: IRouter = Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const snapshotId = () => new Date().toISOString().replace(/[:.]/g, "-").replace("Z", "Z");
const safe = (run: typeof backupRunsTable.$inferSelect) => ({
  backupRunId: run.id, requestId: run.requestId, snapshotId: run.snapshotId, generatedAt: run.createdAt.toISOString(),
  repository: run.repository, branch: run.branch, commitSha: run.commitSha,
  tableCount: run.tableCount, rowCount: run.rowCount, artifactCount: run.artifactCount, status: run.status,
});

router.post("/admin/backup", ...sensitiveAdminGuards, async (req, res, next) => {
  let release: (() => Promise<void>) | undefined;
  let temp: string | undefined;
  let runAcquired = false;
  try {
    const { reason, confirmation, requestId, plaintextHistoryAcknowledged } = req.body ?? {};
    if (typeof reason !== "string" || !reason.trim() || confirmation !== "PUSH BACKUP" || plaintextHistoryAcknowledged !== true || typeof requestId !== "string" || !UUID.test(requestId)) {
      throw new Error("Provide a reason, type PUSH BACKUP exactly, acknowledge plaintext Git history, and provide a valid requestId.");
    }
    // This deliberately happens before acquiring a snapshot or contacting GitHub.
    const config = backupConfig();
    const lock = await pool.connect();
    await lock.query("SELECT pg_advisory_lock(hashtext('vault_zombie_manual_backup'))");
    release = async () => { await lock.query("SELECT pg_advisory_unlock(hashtext('vault_zombie_manual_backup'))"); lock.release(); };

    let [run] = await db.select().from(backupRunsTable).where(eq(backupRunsTable.requestId, requestId)).limit(1);
    runAcquired = true;
    if (run?.status === "completed") { res.json(safe(run)); return; }
    if (!run) {
      [run] = await db.insert(backupRunsTable).values({
        requestId, actorAccountId: req.account!.id, snapshotId: snapshotId(), repository: config.repository, status: "pending",
      }).returning();
    }
    let pushed: { branch: string; commitSha: string };
    if (run.commitSha && run.branch) pushed = { branch: run.branch, commitSha: run.commitSha };
    else if (run.manifestSha256) {
      const reconciled = await reconcileRemoteSnapshot(config, run.snapshotId, requestId, run.manifestSha256);
      if (!reconciled) throw new Error("Backup outcome is ambiguous; the original artifacts are unavailable. Do not reuse this requestId.");
      pushed = reconciled;
      await db.update(backupRunsTable).set({ status: "github_pushed", branch: pushed.branch, commitSha: pushed.commitSha }).where(eq(backupRunsTable.id, run.id));
    }
    else {
      const snapshot = await createSnapshot(run.snapshotId, requestId, run.createdAt.toISOString());
      temp = snapshot.temp;
      // Persist this exact manifest identity before the external side effect.
      await db.update(backupRunsTable).set({
        status: "identity_persisted",
        manifestSha256: snapshot.manifestSha256, contentSha256: snapshot.contentSha256,
        metadata: { generatedAt: snapshot.manifest.generatedAt, requestId, rootRecoverySha256: snapshot.rootRecoverySha256 },
        tableCount: snapshot.manifest.tables.length,
        rowCount: snapshot.manifest.tables.reduce((total, table) => total + table.rows, 0),
        artifactCount: snapshot.artifacts.length,
      }).where(eq(backupRunsTable.id, run.id));
      [run] = await db.select().from(backupRunsTable).where(eq(backupRunsTable.id, run.id)).limit(1);
      pushed = await pushSnapshot(config, run.snapshotId, snapshot.artifacts);
      await db.update(backupRunsTable).set({ status: "github_pushed", branch: pushed.branch, commitSha: pushed.commitSha }).where(eq(backupRunsTable.id, run.id));
    }
    [run] = await db.select().from(backupRunsTable).where(eq(backupRunsTable.id, run.id)).limit(1);
    if (run.status === "completed") { res.json(safe(run)); return; }
    const result = await runSensitiveAdminAction({
      actor: req.account!, action: "backup_push", targetType: "backup_run", targetId: run.id, reason,
      details: { repository: config.repository, branch: pushed.branch, commitSha: pushed.commitSha, snapshotId: run.snapshotId, tableCount: run.tableCount ?? 0, rowCount: run.rowCount ?? 0, artifactCount: run.artifactCount ?? 0, manifestSha256: run.manifestSha256 ?? "pending", contentSha256: run.contentSha256 ?? "pending", sealedAnswersIncluded: true },
    }, async (tx) => {
      await tx.execute(sql`select id from backup_runs where id = ${run.id} for update`);
      const [current] = await tx.select().from(backupRunsTable).where(eq(backupRunsTable.id, run.id)).limit(1);
      if (!current) throw new Error("Backup run disappeared before completion.");
      if (current.status === "completed") throw new Error("Backup run was already completed.");
      await tx.update(backupRunsTable).set({ status: "completed", completedAt: new Date(), branch: pushed.branch, commitSha: pushed.commitSha }).where(and(eq(backupRunsTable.id, run.id), eq(backupRunsTable.status, "github_pushed")));
      return current;
    });
    const [completed] = await db.select().from(backupRunsTable).where(eq(backupRunsTable.id, result.id)).limit(1);
    res.json(safe(completed!));
    return;
  } catch (error) {
    // Only operational errors are retained; neither repository credential is ever recorded.
    const message = error instanceof Error ? error.message : "Backup failed.";
    if (!message.startsWith("Backup configuration missing:")) {
      const requestId = req.body?.requestId;
      if (runAcquired && typeof requestId === "string" && UUID.test(requestId)) {
        await db.update(backupRunsTable).set({ status: "failed_definite", error: message.slice(0, 500) }).where(and(eq(backupRunsTable.requestId, requestId), eq(backupRunsTable.status, "pending"))).catch(() => undefined);
        await db.update(backupRunsTable).set({ status: "awaiting_reconciliation", error: message.slice(0, 500) }).where(and(eq(backupRunsTable.requestId, requestId), eq(backupRunsTable.status, "identity_persisted"))).catch(() => undefined);
      }
    }
    next(error);
    return;
  } finally {
    if (temp) await removeSnapshot(temp);
    if (release) await release();
  }
});
export default router;