import {
  GetOperatorScoreboardParams,
  ListUnlockedRevealWorkParams,
  OverrideRevealTextClusterVerdictBody,
  OverrideRevealTextClusterVerdictParams,
  ResolveRevealQuestionOutcomeBody,
  ResolveRevealQuestionOutcomeParams,
} from "@workspace/api-zod";
import {
  getOperatorScoreboard,
  listUnlockedRevealWork,
  overrideRevealTextClusterVerdict,
  RevealScoringError,
  resolveRevealQuestionOutcome,
} from "@workspace/db";
import { Router, type IRouter, type Response } from "express";
import { requireOperator } from "../middlewares/auth";

const operatorRevealRouter: IRouter = Router();

function revealError(error: unknown, res: Response) {
  if (error instanceof RevealScoringError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
}

operatorRevealRouter.get("/operator/vaults/:vaultId/reveals/unlocked", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = ListUnlockedRevealWorkParams.parse(req.params);
    return res.json(await listUnlockedRevealWork(vaultId, req.account!.id));
  } catch (error) {
    if (revealError(error, res)) return;
    return next(error);
  }
});

operatorRevealRouter.put("/operator/vaults/:vaultId/reveals/:revealSlotId/questions/:vaultQuestionId/outcome", requireOperator, async (req, res, next) => {
  try {
    const { vaultId, revealSlotId, vaultQuestionId } = ResolveRevealQuestionOutcomeParams.parse(req.params);
    const input = ResolveRevealQuestionOutcomeBody.parse(req.body);
    return res.json(await resolveRevealQuestionOutcome(vaultId, req.account!.id, revealSlotId, vaultQuestionId, input));
  } catch (error) {
    if (revealError(error, res)) return;
    return next(error);
  }
});

operatorRevealRouter.put("/operator/vaults/:vaultId/reveals/:revealSlotId/questions/:vaultQuestionId/clusters/:clusterKey/verdict", requireOperator, async (req, res, next) => {
  try {
    const { vaultId, revealSlotId, vaultQuestionId, clusterKey } = OverrideRevealTextClusterVerdictParams.parse(req.params);
    const { tier } = OverrideRevealTextClusterVerdictBody.parse(req.body);
    return res.json(await overrideRevealTextClusterVerdict(vaultId, req.account!.id, revealSlotId, vaultQuestionId, clusterKey, tier));
  } catch (error) {
    if (revealError(error, res)) return;
    return next(error);
  }
});

operatorRevealRouter.get("/operator/vaults/:vaultId/scoreboard", requireOperator, async (req, res, next) => {
  try {
    const { vaultId } = GetOperatorScoreboardParams.parse(req.params);
    return res.json(await getOperatorScoreboard(vaultId, req.account!.id));
  } catch (error) {
    if (revealError(error, res)) return;
    return next(error);
  }
});

export default operatorRevealRouter;