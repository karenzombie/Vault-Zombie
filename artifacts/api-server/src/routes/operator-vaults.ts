import { asc, eq } from "drizzle-orm";
import {
  AddCustomPromptBody,
  ChangeSealedVaultEventDateBody,
  ChangeSealedVaultEventDateParams,
  CreateOperatorVaultBody,
  CreateOperatorVaultResponse,
  DeleteOperatorVaultParams,
  GetSealedVaultDateInfoParams,
  GetVaultSetupDetailParams,
  ListOperatorVaultTypesResponse,
  PreviewSealedVaultDateChangeParams,
  PreviewSealedVaultDateChangeBody,
  PreviewVaultScheduleBody,
  PreviewVaultScheduleParams,
  ReorderVaultPromptsBody,
  ToggleVaultPromptBody,
  ToggleVaultPromptParams,
  UpdateVaultSetupBody,
} from "@workspace/api-zod";
import {
  addCustomPrompt,
  changeSealedVaultEventDate,
  db,
  deleteOperatorVault,
  getSealedVaultDateInfo,
  getVaultSetupDetail,
  listOperatorVaults,
  listVaultPrompts,
  previewSealedVaultEventDateChange,
  previewVaultSchedule,
  reorderVaultPrompts,
  spendEntitlementForNewVault,
  toggleVaultPrompt,
  updateDraftVaultSetup,
  vaultTypesTable,
} from "@workspace/db";
import { Router, type IRouter } from "express";
import { requireOperator } from "../middlewares/auth";

const operatorVaultsRouter: IRouter = Router();

operatorVaultsRouter.get("/operator/vaults", requireOperator, async (req, res, next) => {
  try {
    const vaults = await listOperatorVaults(req.account!.id);
    res.json({ vaults });
  } catch (error) { next(error); }
});

operatorVaultsRouter.get("/operator/vault-types", requireOperator, async (_req, res, next) => {
  try {
    const vaultTypes = await db.select({
      id: vaultTypesTable.id,
      slug: vaultTypesTable.slug,
      name: vaultTypesTable.name,
      requiredSubjectTokens: vaultTypesTable.requiredSubjectTokens,
    }).from(vaultTypesTable)
      .where(eq(vaultTypesTable.isRetired, false))
      .orderBy(asc(vaultTypesTable.displayOrder));
    res.json(ListOperatorVaultTypesResponse.parse(vaultTypes));
  } catch (error) { next(error); }
});

operatorVaultsRouter.post("/operator/vaults", requireOperator, async (req, res, next) => {
  try {
    const body = CreateOperatorVaultBody.parse(req.body);
    const result = await spendEntitlementForNewVault({
      operatorId: req.account!.id,
      billingRecordId: body.billingRecordId,
      vaultTypeId: body.vaultTypeId,
      name: body.name,
      subjectValues: body.subjectValues,
    });
    if (result.kind === "unavailable") {
      res.status(409).json({ error: "This entitlement is missing, already spent, or not paid." });
      return;
    }
    res.status(201).json(CreateOperatorVaultResponse.parse({ vaultId: result.vault.id }));
  } catch (error) { next(error); }
});

operatorVaultsRouter.post("/operator/vaults/:vaultId/delete", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = DeleteOperatorVaultParams.parse(req.params);
    const updated = await deleteOperatorVault(vaultId, req.account!.id);
    res.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message.includes("not found, not owned")) {
      res.status(404).json({ error: error.message });
      return;
    }
    next(error);
  }
});

function notFoundOr(error: unknown, res: any, next: any, needle: string) {
  if (error instanceof Error && error.message.toLowerCase().includes(needle)) {
    res.status(404).json({ error: error.message });
    return;
  }
  next(error);
}

function badRequestOr(error: unknown, res: any, next: any) {
  if (error instanceof Error) {
    res.status(400).json({ error: error.message });
    return;
  }
  next(error);
}

/** Zod's date-format fields coerce request input to JS Date; the setup functions store
 * plain YYYY-MM-DD strings (drizzle date columns are string-mode), so normalize here. */
function dateStr(value: Date | null | undefined): string | null | undefined {
  if (value === null) return null;
  if (value === undefined) return undefined;
  return value.toISOString().slice(0, 10);
}

operatorVaultsRouter.get("/operator/vaults/:vaultId/setup", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetVaultSetupDetailParams.parse(req.params);
    const detail = await getVaultSetupDetail(vaultId, req.account!.id);
    res.json(detail);
  } catch (error) { notFoundOr(error, res, next, "not found"); }
});

operatorVaultsRouter.patch("/operator/vaults/:vaultId/setup", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetVaultSetupDetailParams.parse(req.params);
    const body = UpdateVaultSetupBody.parse(req.body);
    const detail = await updateDraftVaultSetup({
      vaultId, operatorId: req.account!.id, planTier: body.planTier, revealSchedule: body.revealSchedule,
      anchorDate: dateStr(body.anchorDate), milestoneDate: dateStr(body.milestoneDate), milestoneLabel: body.milestoneLabel,
    });
    res.json(detail);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

operatorVaultsRouter.post("/operator/vaults/:vaultId/setup/schedule-preview", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = PreviewVaultScheduleParams.parse(req.params);
    void vaultId;
    const body = PreviewVaultScheduleBody.parse(req.body);
    // Setup happens before the real seal date is known, so the preview is computed
    // against today's date as a stand-in seal date. This is a plumbing default, not
    // a product decision: previewVaultSchedule's proposedSealDate only affects which
    // side of "already passed" a date falls on, not the schedule's cadence.
    const proposedSealDate = new Date().toISOString().slice(0, 10);
    const revealSlots = await previewVaultSchedule({
      anchorDate: dateStr(body.anchorDate), proposedSealDate, planTier: body.planTier, schedule: body.schedule,
      milestoneDate: dateStr(body.milestoneDate), milestoneLabel: body.milestoneLabel,
    });
    res.json({ revealSlots });
  } catch (error) { badRequestOr(error, res, next); }
});

operatorVaultsRouter.get("/operator/vaults/:vaultId/prompts", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetVaultSetupDetailParams.parse(req.params);
    const prompts = await listVaultPrompts(vaultId, req.account!.id);
    res.json({ prompts });
  } catch (error) { notFoundOr(error, res, next, "not found"); }
});

operatorVaultsRouter.post("/operator/vaults/:vaultId/prompts", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetVaultSetupDetailParams.parse(req.params);
    const body = AddCustomPromptBody.parse(req.body);
    const prompt = await addCustomPrompt({ vaultId, operatorId: req.account!.id, ...body });
    res.status(201).json(prompt);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

operatorVaultsRouter.put("/operator/vaults/:vaultId/prompts/order", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetVaultSetupDetailParams.parse(req.params);
    const body = ReorderVaultPromptsBody.parse(req.body);
    const prompts = await reorderVaultPrompts({ vaultId, operatorId: req.account!.id, orderedVaultQuestionIds: body.orderedVaultQuestionIds });
    res.json({ prompts });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

operatorVaultsRouter.patch("/operator/vaults/:vaultId/prompts/:vaultQuestionId", requireOperator, async (req, res, next) => {
  try {
    const { vaultId, vaultQuestionId } = ToggleVaultPromptParams.parse(req.params);
    const body = ToggleVaultPromptBody.parse(req.body);
    const prompt = await toggleVaultPrompt({ vaultId, operatorId: req.account!.id, vaultQuestionId, enabled: body.enabled });
    res.json(prompt);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

operatorVaultsRouter.get("/operator/vaults/:vaultId/date-change", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetSealedVaultDateInfoParams.parse(req.params);
    const info = await getSealedVaultDateInfo(vaultId, req.account!.id);
    res.json(info);
  } catch (error) { notFoundOr(error, res, next, "not found"); }
});

operatorVaultsRouter.post("/operator/vaults/:vaultId/date-change", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = ChangeSealedVaultEventDateParams.parse(req.params);
    const body = ChangeSealedVaultEventDateBody.parse(req.body);
    const result = await changeSealedVaultEventDate({ vaultId, operatorId: req.account!.id, newAnchorDate: dateStr(body.newAnchorDate)! });
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

operatorVaultsRouter.post("/operator/vaults/:vaultId/date-change/preview", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = PreviewSealedVaultDateChangeParams.parse(req.params);
    const body = PreviewSealedVaultDateChangeBody.parse(req.body);
    const result = await previewSealedVaultEventDateChange({ vaultId, operatorId: req.account!.id, newAnchorDate: dateStr(body.newAnchorDate)! });
    res.json({ revealSlots: result.revealSlots });
  } catch (error) {
    if (error instanceof Error && error.message.toLowerCase().includes("not found")) { res.status(404).json({ error: error.message }); return; }
    badRequestOr(error, res, next);
  }
});

export default operatorVaultsRouter;
