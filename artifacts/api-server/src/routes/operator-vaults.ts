import { DeleteOperatorVaultParams } from "@workspace/api-zod";
import { deleteOperatorVault, listOperatorVaults } from "@workspace/db";
import { Router, type IRouter } from "express";
import { requireOperator } from "../middlewares/auth";

const operatorVaultsRouter: IRouter = Router();

operatorVaultsRouter.get("/operator/vaults", requireOperator, async (req, res, next) => {
  try {
    const vaults = await listOperatorVaults(req.account!.id);
    res.json({ vaults });
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
