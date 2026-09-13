import { realpathSync, statSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type LegalConfiguration = {
  termsDocument: string;
  termsVersion: string;
  privacyDocument: string;
  privacyVersion: string;
  termsPath: string;
  privacyPath: string;
};
export class LegalConfigurationError extends Error {}

function configuredPdf(name: string, value: string | undefined, root: string): { document: string; path: string } {
  const document = value?.trim();
  if (!document) throw new LegalConfigurationError(`${name} is required.`);
  if (basename(document) !== document || !document.toLowerCase().endsWith(".pdf")) {
    throw new LegalConfigurationError(`${name} must name a root-level PDF document.`);
  }
  const path = resolve(root, document);
  try {
    if (dirname(path) !== root || !statSync(path).isFile() || !realpathSync(path).startsWith(`${root}/`)) {
      throw new LegalConfigurationError(`${name} must reference an existing root-level PDF document.`);
    }
  } catch (error) {
    if (error instanceof LegalConfigurationError) throw error;
    throw new LegalConfigurationError(`${name} must reference an existing root-level PDF document.`);
  }
  return { document, path };
}

// Callers running as a two-level-deep workspace package (artifacts/<name>, the
// depth every bundled server process runs at) get the correct workspace root
// from this cwd-based default with no argument needed. A caller running from a
// different depth (for example the one-level-deep scripts package) must pass
// its own correctly computed root as the second argument to legalConfiguration
// instead of relying on this default.
const WORKSPACE_ROOT = resolve(process.cwd(), "../..");

export function legalConfiguration(env = process.env, root = WORKSPACE_ROOT): LegalConfiguration {
  const termsVersion = env.VAULT_ZOMBIE_TERMS_VERSION?.trim();
  const privacyVersion = env.VAULT_ZOMBIE_PRIVACY_VERSION?.trim();
  if (!termsVersion) throw new LegalConfigurationError("VAULT_ZOMBIE_TERMS_VERSION is required.");
  if (!privacyVersion) throw new LegalConfigurationError("VAULT_ZOMBIE_PRIVACY_VERSION is required.");
  const terms = configuredPdf("VAULT_ZOMBIE_TERMS_DOCUMENT", env.VAULT_ZOMBIE_TERMS_DOCUMENT, root);
  const privacy = configuredPdf("VAULT_ZOMBIE_PRIVACY_DOCUMENT", env.VAULT_ZOMBIE_PRIVACY_DOCUMENT, root);
  return { termsDocument: terms.document, termsVersion, privacyDocument: privacy.document, privacyVersion, termsPath: terms.path, privacyPath: privacy.path };
}

export function currentLegalConfiguration(): LegalConfiguration {
  return legalConfiguration();
}

type SignupIntentPayload = { n: string; e: number; t: string; p: string; a: number };
export type SignupIntent = SignupIntentPayload & { token: string; tokenHash: string; expiresAt: Date; acceptedAt: Date };
const b64 = (value: Buffer | string) => Buffer.from(value).toString("base64url");
function intentSecret(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new LegalConfigurationError("SESSION_SECRET is required to issue legal signup intents.");
  return Buffer.from(secret);
}
function sign(encoded: string) { return b64(createHmac("sha256", intentSecret()).update(encoded).digest()); }
export function createLegalSignupIntent(config: LegalConfiguration, now = new Date()): SignupIntent {
  const expiresAt = new Date(now.getTime() + 15 * 60_000);
  const payload: SignupIntentPayload = { n: b64(randomBytes(32)), e: expiresAt.getTime(), t: config.termsVersion, p: config.privacyVersion, a: now.getTime() };
  const encoded = b64(JSON.stringify(payload));
  const token = `${encoded}.${sign(encoded)}`;
  return { ...payload, token, tokenHash: createHash("sha256").update(token).digest("hex"), expiresAt, acceptedAt: now };
}
export function verifyLegalSignupIntent(token: unknown, now = new Date()): SignupIntentPayload | undefined {
  if (typeof token !== "string" || token.length > 4096) return undefined;
  const [encoded, signature, extra] = token.split(".");
  if (!encoded || !signature || extra || !/^[A-Za-z0-9_-]+$/.test(encoded) || !/^[A-Za-z0-9_-]+$/.test(signature)) return undefined;
  const expected = Buffer.from(sign(encoded));
  const supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return undefined;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignupIntentPayload;
    if (!payload || typeof payload.n !== "string" || !/^[A-Za-z0-9_-]{40,}$/.test(payload.n) || typeof payload.e !== "number" || typeof payload.a !== "number" || typeof payload.t !== "string" || typeof payload.p !== "string" || payload.e <= now.getTime() || payload.a > now.getTime() || payload.a >= payload.e) return undefined;
    return payload;
  } catch { return undefined; }
}
export const legalSignupIntentHash = (token: string) => createHash("sha256").update(token).digest("hex");
