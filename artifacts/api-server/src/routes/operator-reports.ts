import {
  GetAnswersArchiveParams,
  GetAreaReportParams,
  GetFinaleReportParams,
  GetGuestPersonalReportParams,
  GetPrintArchiveParams,
  GetQuestionReportParams,
  GetRevealReportParams,
  GetTimelineReportParams,
  GetVaultHealthReportParams,
  GetVaultResultsSummaryParams,
} from "@workspace/api-zod";
import {
  getAnswersArchive,
  getAreaReport,
  getFinaleReport,
  getGuestPersonalReport,
  getPrintArchive,
  getQuestionReport,
  getRevealReport,
  getTimelineReport,
  getVaultHealthReport,
  getVaultResultsSummary,
  ReportError,
} from "@workspace/db";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { requireOperator } from "../middlewares/auth";

const operatorReportsRouter: IRouter = Router();

function reportError(error: unknown, res: Response) {
  if (error instanceof ReportError) {
    res.status(error.status).json({ error: error.message });
    return true;
  }
  return false;
}
function handler(parse: (value: unknown) => Record<string, string>, action: (params: Record<string, string>, operatorId: string) => Promise<unknown>) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      return res.json(await action(parse(req.params), req.account!.id));
    } catch (error) {
      if (reportError(error, res)) return;
      return next(error);
    }
  };
}

operatorReportsRouter.get("/operator/vaults/:vaultId/reports/health", requireOperator,
  handler((value) => GetVaultHealthReportParams.parse(value), (p, id) => getVaultHealthReport(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/reveals/:revealSlotId", requireOperator,
  handler((value) => GetRevealReportParams.parse(value), (p, id) => getRevealReport(p.vaultId, id, p.revealSlotId)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/questions/:vaultQuestionId", requireOperator,
  handler((value) => GetQuestionReportParams.parse(value), (p, id) => getQuestionReport(p.vaultId, id, p.vaultQuestionId)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/guests/:guestId", requireOperator,
  handler((value) => GetGuestPersonalReportParams.parse(value), (p, id) => getGuestPersonalReport(p.vaultId, id, p.guestId)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/summary", requireOperator,
  handler((value) => GetVaultResultsSummaryParams.parse(value), (p, id) => getVaultResultsSummary(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/areas", requireOperator,
  handler((value) => GetAreaReportParams.parse(value), (p, id) => getAreaReport(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/timeline", requireOperator,
  handler((value) => GetTimelineReportParams.parse(value), (p, id) => getTimelineReport(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/archive", requireOperator,
  handler((value) => GetAnswersArchiveParams.parse(value), (p, id) => getAnswersArchive(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/finale", requireOperator,
  handler((value) => GetFinaleReportParams.parse(value), (p, id) => getFinaleReport(p.vaultId, id)));
operatorReportsRouter.get("/operator/vaults/:vaultId/reports/print", requireOperator,
  handler((value) => GetPrintArchiveParams.parse(value), (p, id) => getPrintArchive(p.vaultId, id)));

export default operatorReportsRouter;