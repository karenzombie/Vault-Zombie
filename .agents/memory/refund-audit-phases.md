---
name: Refund audit phases
description: Durable audit and reconciliation boundary for Stripe refunds.
---

Refund orchestration uses two sensitive-action transactions around the external Stripe call: an atomically audited durable intent/reservation first, then an atomically audited local completion.

**Why:** Holding a database transaction across Stripe is unsafe, but a refund attempt or ambiguous Stripe result must never exist without an immutable audit trail. A confirmed external success also must not be downgraded if local completion fails.

**How to apply:** Keep Stripe outside database transactions and reuse the persisted idempotency key. Preserve monotonic unresolved states, including a durable `stripe_succeeded` recovery state, until the completion transaction updates entitlements/refund state and writes the completion audit exactly once.