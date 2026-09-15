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
import { sendGuestReportIfEligible } from "../lib/mail";

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
    const result = await resolveRevealQuestionOutcome(vaultId, req.account!.id, revealSlotId, vaultQuestionId, input);
    // G2: results, to each affected guest — the verdict write above has committed, so
    // for each guest just marked, check whether this was their last unmarked scoreable
    // prediction in this reveal and send immediately if so (build brief addendum 2,
    // section 6.1).
    for (const guestId of result.affectedGuestIds) void sendGuestReportIfEligible(vaultId, req.account!.id, guestId, revealSlotId);
    return res.json(result);
  } catch (error) {
    if (revealError(error, res)) return;
    return next(error);
  }
});

operatorRevealRouter.put("/operator/vaults/:vaultId/reveals/:revealSlotId/questions/:vaultQuestionId/clusters/:clusterKey/verdict", requireOperator, async (req, res, next) => {
  try {
    const { vaultId, revealSlotId, vaultQuestionId, clusterKey } = OverrideRevealTextClusterVerdictParams.parse(req.params);
    const { tier } = OverrideRevealTextClusterVerdictBody.parse(req.body);
    const result = await overrideRevealTextClusterVerdict(vaultId, req.account!.id, revealSlotId, vaultQuestionId, clusterKey, tier);
    // G2, same as above: an override can also be the action that completes a guest's
    // reveal.
    for (const guestId of result.affectedGuestIds) void sendGuestReportIfEligible(vaultId, req.account!.id, guestId, revealSlotId);
    return res.json(result);
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