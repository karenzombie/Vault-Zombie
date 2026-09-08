---
name: Prelaunch email and admin constraints
description: Owner-confirmed boundaries for transactional email and protected admin verification before accounts exist.
---

Real transactional email must remain disabled outside production. Do not add a test-send route, development allowlist, override, or other path that can send real mail from development.

**Why:** The owner explicitly accepted development no-send behavior and deferred all real delivery verification.

**How to apply:** Preserve the production-only delivery guard when changing the mailer or worker. Validate development behavior through durable queue state and logs only.

Protected operator and admin screens must not be exposed through a development bypass, seeded account, self-granted role, or agent-created login.

**Why:** No operator or admin account exists yet, and the owner accepted that authenticated surfaces cannot currently be visually inspected.

**How to apply:** Keep server-side database roles and normal authentication intact. Report protected visual-verification limits plainly until the owner creates an account.