import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guestRouter from "./guest";
import operatorRevealRouter from "./operator-reveals";
import operatorReportsRouter from "./operator-reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guestRouter);
router.use(operatorRevealRouter);
router.use(operatorReportsRouter);

export default router;
