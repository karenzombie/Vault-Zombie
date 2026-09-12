import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { answersTable, db, guestsTable, revealSlotsTable, runSensitiveAdminAction, submissionsTable, vaultsTable } from "@workspace/db";
import { sensitiveAdminGuards } from "../middlewares/auth";

/** The only direct sealed-answer read in the application. Do not reuse outside this full export. */
const router: IRouter = Router();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const csv = (values: unknown[]) => values.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",");

router.post("/admin/full-export", ...sensitiveAdminGuards, async (req, res, next) => {
  try {
    const { reason, confirmation } = req.body ?? {};
    if (typeof reason !== "string" || confirmation !== "EXPORT SEALED DATA") throw new Error("Type EXPORT SEALED DATA and provide a reason.");
    const result = await runSensitiveAdminAction({ actor: req.account!, action: "admin_full_export", targetType: "admin_export", targetId: req.account!.id, reason, details: { sealedAnswersIncluded: true } }, async (tx) => {
      const rows = await tx.select({ vaultId: vaultsTable.id, vaultName: vaultsTable.name, guest: guestsTable.displayName, answerType: answersTable.answerType, textValue: answersTable.textValue, numberValue: answersTable.numberValue, optionId: answersTable.optionId, revealDate: revealSlotsTable.revealDate, unlockOverrideAt: answersTable.unlockOverrideAt, createdAt: answersTable.createdAt })
        .from(answersTable).innerJoin(submissionsTable, eq(answersTable.submissionId, submissionsTable.id)).innerJoin(guestsTable, eq(submissionsTable.guestId, guestsTable.id)).innerJoin(vaultsTable, eq(submissionsTable.vaultId, vaultsTable.id)).innerJoin(revealSlotsTable, eq(answersTable.revealSlotId, revealSlotsTable.id));
      const body = ["vault_id,vault_name,guest,answer_type,text_value,number_value,option_id,unlock_at,unlock_override_at,created_at", ...rows.map((row) => csv([row.vaultId, row.vaultName, row.guest, row.answerType, row.textValue, row.numberValue, row.optionId, row.revealDate, row.unlockOverrideAt?.toISOString(), row.createdAt.toISOString()]))].join("\n");
      return { body, count: rows.length };
    });
    res.attachment("vault-zombie-full-sealed-export.csv").type("text/csv").send(result.body);
  } catch (error) { next(error); }
});
export default router;