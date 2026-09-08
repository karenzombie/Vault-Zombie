import { Router, type IRouter } from "express";
import { requireAdmin, requireOperator } from "../middlewares/auth";

const authRouter: IRouter = Router();

authRouter.get("/auth/me", requireOperator, (req, res) => {
  res.json({
    account: {
      id: req.account!.id,
      displayName: req.account!.displayName,
      email: req.account!.email,
      role: req.account!.role,
    },
  });
});

authRouter.get(
  "/admin/auth-status",
  requireOperator,
  requireAdmin,
  (req, res) => {
    res.json({
      authenticated: true,
      role: "admin",
      freshMfaWindowMinutes: 5,
    });
  },
);

export default authRouter;