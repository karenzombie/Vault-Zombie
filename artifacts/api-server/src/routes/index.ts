import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import guestRouter from "./guest";
import operatorRevealRouter from "./operator-reveals";
import operatorReportsRouter from "./operator-reports";
import billingRouter from "./billing";
import giftRouter from "./gifts";
import adminBillingRouter from "./admin-billing";
import emailRouter from "./email";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(guestRouter);
router.use(operatorRevealRouter);
router.use(operatorReportsRouter);
router.use(billingRouter);
router.use(giftRouter);
router.use(adminBillingRouter);
router.use(emailRouter);

export default router;
