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
import adminVaultsRouter from "./admin-vaults";
import adminLifecycleRouter from "./admin-lifecycle";
import adminExportRouter from "./admin-export";
import adminContentRouter from "./admin-content";

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
router.use(adminVaultsRouter);
router.use(adminLifecycleRouter);
router.use(adminExportRouter);
router.use(adminContentRouter);

export default router;
