---
name: Server-side image upload processing pattern
description: When a Vault Zombie upload must be re-encoded, resized, or stripped of metadata server-side, skip the object-storage skill's presigned-URL flow.
---

For uploads that must be validated by content and processed before storage (resize, re-encode, strip EXIF/GPS), the browser sends the raw file bytes to an Express route (`express.raw()` scoped to the image content types, no multer/upload library), and the server decodes it with `sharp`, processes it, then writes the result to GCS itself.

**Why:** the object-storage skill's default pattern has the browser PUT directly to a presigned GCS URL, which stores the client's raw bytes unprocessed. That is incompatible with any requirement to re-encode, resize, or scrub metadata before the file is persisted.

**How to apply:** extend `ObjectStorageService` with additive methods (e.g. a `uploadEntityBuffer(buffer, contentType, subdir)` that writes to a random key under `PRIVATE_OBJECT_DIR` and returns a normalized `/objects/...` path, and a `deleteObjectEntity(objectPath)`) rather than changing the GCS client/credential wiring the skill says not to touch. `sharp` strips all metadata on `.toBuffer()`/`.toFormat()` unless `.withMetadata()` is explicitly called; call `.rotate()` before `.resize()` so EXIF orientation is applied before that tag is discarded. Verified concretely: a JPEG with injected EXIF (orientation 6 + GPS) round-tripped through `sharp(...).rotate().resize(...).toBuffer()` reports no `exif`/`icc` field afterward.
