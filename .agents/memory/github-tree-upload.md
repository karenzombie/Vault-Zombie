---
name: GitHub tree upload limits
description: Reliable code-backup uploads through the installed GitHub connection.
---

Upload changed files as sequential base64 Git blobs, then create a SHA-only tree,
commit, and ref update. Keep requests below 10 per second.

Connector shell output may remove the tab from `git diff --name-status`; parse
the first status character by fixed width instead. It may also corrupt large
single-line or binary payloads, so read those bytes directly inside the impure
GitHub upload function rather than carrying base64 through shell callback output.

**Why:** Large inline tree payloads are blocked by the connector's Cloudflare
edge, and parallel blob uploads trigger the connector's per-Repl rate limit.

**How to apply:** Use the remote head's tree as `base_tree`, upload blobs at
roughly 5 requests per second, create one commit, update the branch once, and
verify the candidate tree before creating the commit and the resulting remote
head afterward.