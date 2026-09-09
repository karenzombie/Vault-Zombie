---
name: Versioned legal consent evidence
description: Security rules for binding an operator's explicit acceptance to exact legal-document versions.
---

Exact signup consent evidence must come from a short-lived, server-signed, single-use intent whose versions and timestamp are stored server-side. Clerk `unsafeMetadata` may carry the signed token but is never authoritative evidence itself.

**Why:** Clerk intentionally lets the frontend write unsafe metadata. Trusting raw version fields there allows a user to attribute a generic Clerk legal timestamp to document versions they did not accept. Reloading legal configuration within one request also creates a version-rotation race.

**How to apply:** Capture one immutable legal-configuration snapshot per request. Use it through display-version validation, intent signing/storage, and consent insertion. Atomically consume the intent with local account creation and the append-only consent row. Re-consent also validates and inserts from one snapshot.