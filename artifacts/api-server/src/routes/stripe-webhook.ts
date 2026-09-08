import type { RequestHandler } from "express";

export const EXPECTED_STRIPE_EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_failed",
  "payment_intent.payment_failed",
  "charge.dispute.created",
] as const;

export const stripeWebhookBoundary: RequestHandler = (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    req.log.error("STRIPE_WEBHOOK_SECRET is not configured");
    res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is required before Stripe webhooks can be accepted." });
    return;
  }
  res.status(501).json({
    error: "Stripe webhook signature verification and event handling are not implemented yet.",
    expectedEvents: EXPECTED_STRIPE_EVENTS,
  });
};