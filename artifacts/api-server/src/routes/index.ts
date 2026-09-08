import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guestRouter from "./guest";
import operatorRevealRouter from "./operator-reveals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guestRouter);
router.use(operatorRevealRouter);

export default router;
