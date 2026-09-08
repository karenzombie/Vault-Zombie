import { optOutGuestEmail } from "@workspace/db";
import { Router, type IRouter } from "express";
import { verifyUnsubscribeToken } from "../lib/mail";

const emailRouter: IRouter = Router();
emailRouter.get("/email/unsubscribe/:guestId", async (req, res, next) => {
  try {
    const token = typeof req.query.token === "string" ? req.query.token : "";
    if (!verifyUnsubscribeToken(req.params.guestId, token)) return res.status(400).send("Invalid unsubscribe link.");
    await optOutGuestEmail(req.params.guestId);
    return res.type("html").send("<p>Guest email preferences updated. You will receive no further Vault Zombie guest emails.</p>");
  } catch (error) { return next(error); }
});
export default emailRouter;