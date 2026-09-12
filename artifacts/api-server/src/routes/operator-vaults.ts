import { asc, eq } from "drizzle-orm";
import {
  CreateOperatorVaultBody,
  CreateOperatorVaultResponse,
  DeleteOperatorVaultParams,
  ListOperatorVaultTypesResponse,
} from "@workspace/api-zod";
import { db, deleteOperatorVault, listOperatorVaults, spendEntitlementForNewVault, vaultTypesTable } from "@workspace/db";
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

export default operatorVaultsRouter;
