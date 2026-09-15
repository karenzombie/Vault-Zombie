import { GetGuestVaultParams, SubmitGuestPredictionBody, SubmitGuestPredictionParams } from "@workspace/api-zod";
import { readGuestForm, submitGuestAnswers } from "@workspace/db";
import { enqueueEmail } from "@workspace/db";
import { sendEmailNow } from "../lib/mail";
import { Router, type IRouter } from "express";

const guestRouter: IRouter = Router();
const attempts = new Map<string, { count: number; resetAt: number }>();

function limited(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const value = attempts.get(key);
  if (!value || value.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  value.count += 1;
  return value.count > limit;
}

guestRouter.get("/guest/:token", async (req, res, next) => {
  try {
    const { token } = GetGuestVaultParams.parse(req.params);
    if (
      limited(`read-link:${token}`, 240, 10 * 60_000) ||
      limited(`read-source:${req.ip}`, 60, 10 * 60_000)
    ) return res.status(429).json({ error: "Try again shortly." });
    const form = await readGuestForm(token);
    if (!form) return res.status(404).json({ error: "Guest link not found." });
    return res.json(form);
  } catch (error) { return next(error); }
});

guestRouter.post("/guest/:token/submissions", async (req, res, next) => {
  try {
    const { token } = SubmitGuestPredictionParams.parse(req.params);
    const input = SubmitGuestPredictionBody.parse(req.body);
    if (input.website) return res.status(201).json({ accepted: true, createVaultUrl: "/" });
    if (
      limited(`write-link:${token}`, 120, 60 * 60_000) ||
      limited(`write-source:${req.ip}`, 8, 60 * 60_000)
    ) return res.status(429).json({ error: "Too many attempts. Try again later." });
    const result = await submitGuestAnswers(token, input);
    // G1: predictions sealed, to the guest — queued and sent immediately (build brief
    // addendum 2, section 6.1). The submission itself is already committed above, so a
    // failed or slow send here never affects the guest's response.
    if (result.guestEmail) {
      try {
        const row = await enqueueEmail({ dedupeKey: `guest-submission:${result.submissionId}`, eventType: "guest_submission_confirmation", recipientEmail: result.guestEmail, recipientGuestId: result.guestId, vaultId: result.vaultId, payload: { vaultName: result.vaultName } });
        if (row) void sendEmailNow(row.id, "guest_submission_confirmation");
      } catch (error) { req.log.error({ err: error, submissionId: result.submissionId }, "Guest confirmation email enqueue failed"); }
    }
    // H7: guest limit reached, to the host — only on the submission that first takes the
    // vault over its cap (see submitGuestAnswers' newOverageEventId).
    if (result.newOverageEventId && result.operatorEmail) {
      try {
        const row = await enqueueEmail({ dedupeKey: `overage-initial:${result.newOverageEventId}`, eventType: "operator_overage_initial", recipientEmail: result.operatorEmail, vaultId: result.vaultId, payload: { vaultName: result.vaultName } });
        if (row) void sendEmailNow(row.id, "operator_overage_initial");
      } catch (error) { req.log.error({ err: error, vaultId: result.vaultId }, "Guest limit reached email enqueue failed"); }
    }
    return res.status(201).json({
      accepted: true,
      createVaultUrl: `/?ref=${encodeURIComponent(result.referrerCode)}`,
    });
  } catch (error) {
    if (error instanceof Error && (
      error.message.includes("invalid") ||
      error.message.includes("Answer") ||
      error.message.includes("range") ||
      error.message.includes("Select")
    )) return res.status(400).json({ error: error.message });
    return next(error);
  }
});

export default guestRouter;