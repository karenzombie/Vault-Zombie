---
name: GitHub tree upload limits
description: Reliable code-backup uploads through the installed GitHub connection.
---

Upload changed files as sequential base64 Git blobs, then create a SHA-only tree,
commit, and ref update. Keep requests below 10 per second.

**Why:** Large inline tree payloads are blocked by the connector's Cloudflare
edge, and parallel blob uploads trigger the connector's per-Repl rate limit.

**How to apply:** Use the remote head's tree as `base_tree`, upload blobs at
roughly 5 requests per second, create one commit, update the branch once, and
verify the resulting remote head SHA.