---
name: Prelaunch email and admin constraints
description: Owner-confirmed boundaries for transactional email and protected admin verification before accounts exist.
---

Development sends real transactional email through Resend to the actual recipient, the same as production. The owner tests only with her own designated test addresses. Do not add a redirect, allowlist, or send guard unless the owner asks.

Protected operator and admin screens must not be exposed through a development bypass, seeded account, self-granted role, or agent-created login.

**Why:** No operator or admin account exists yet, and the owner accepted that authenticated surfaces cannot currently be visually inspected.

**How to apply:** Keep server-side database roles and normal authentication intact. Report protected visual-verification limits plainly until the owner creates an account.