import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guestRouter from "./guest";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guestRouter);

export default router;
