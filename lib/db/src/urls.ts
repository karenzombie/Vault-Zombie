/**
 * App-wide link builders that are not specific to one part of the codebase. Every consumer
 * that needs to build the same URL (the email renderer today, the stage 5 share screen later)
 * imports these instead of re-deriving the base URL or the path shape.
 */

function appBaseUrl() {
  const value = process.env.VAULT_ZOMBIE_APP_URL;
  if (!value) throw new Error("VAULT_ZOMBIE_APP_URL must be configured before app links can be created.");
  return value.replace(/\/$/, "");
}

/** The guest link for a vault, built from its raw (unhashed) guest token. */
export function guestLinkUrl(guestToken: string) {
  return `${appBaseUrl()}/g/${guestToken}`;
}
