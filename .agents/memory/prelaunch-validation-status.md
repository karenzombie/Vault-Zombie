---
name: Prelaunch validation status
description: How to describe verification before real content and vault data are imported.
---

Treat guest submission, reveal scoring, and reports as build/typecheck-passing
only until the owner authorizes real-data end-to-end validation before launch.
Keep the development database empty and never seed placeholder questions.

**Why:** The owner explicitly chose to defer real-data validation rather than
pause the build before reports.

**How to apply:** Do not claim a guest submitted, a reveal opened, or a score or
report was verified against real data. Preserve the strict importer requirement
of exactly zero unresolved metadata items; never relax it to enable testing.