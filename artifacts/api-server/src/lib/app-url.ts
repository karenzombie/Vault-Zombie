/**
 * Returns the trusted public application origin used in Stripe redirects and
 * printable gift data. Request-controlled Host and Origin headers are
 * deliberately excluded.
 */
export function getTrustedAppUrl(): string {
  const configured = process.env.VAULT_ZOMBIE_APP_URL?.trim();
  if (configured) {
    let parsed: URL;
    try {
      parsed = new URL(configured);
    } catch {
      throw new Error("VAULT_ZOMBIE_APP_URL must be a valid absolute HTTPS URL.");
    }
    if (parsed.protocol !== "https:") {
      throw new Error("VAULT_ZOMBIE_APP_URL must use HTTPS.");
    }
    return parsed.origin;
  }

  const domain = process.env.REPLIT_DOMAINS
    ?.split(",")
    .map((value) => value.trim())
    .find(Boolean);
  if (domain) {
    const host = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!host) throw new Error("The first REPLIT_DOMAINS entry is invalid.");
    return `https://${host}`;
  }

  throw new Error(
    "A trusted application URL is unavailable: configure VAULT_ZOMBIE_APP_URL or provide REPLIT_DOMAINS.",
  );
}