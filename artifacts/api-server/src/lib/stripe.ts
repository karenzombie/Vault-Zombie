import Stripe from "stripe";

export const STRIPE_PRICE_METADATA = {
  catalog: "vault_zombie",
  catalogVersion: "1",
} as const;

export const TIER_ORDER = {
  lockbox: 0,
  safe: 1,
  vault: 2,
  deep_vault: 3,
} as const;

export type PaidTier = "safe" | "vault" | "deep_vault";

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to create Stripe Checkout.");
  }
  if (!secretKey.startsWith("sk_test_")) {
    throw new Error("STRIPE_SECRET_KEY must be a Stripe test secret key beginning with sk_test_.");
  }
  return new Stripe(secretKey);
}

export function stripePriceKey(fromTier: keyof typeof TIER_ORDER, targetTier: PaidTier) {
  return fromTier === "lockbox"
    ? `initial_${targetTier}`
    : `upgrade_${fromTier}_to_${targetTier}`;
}

export async function findStripePrice(
  stripe: Stripe,
  fromTier: keyof typeof TIER_ORDER,
  targetTier: PaidTier,
) {
  const priceKey = stripePriceKey(fromTier, targetTier);
  const matches: Stripe.Price[] = [];
  for await (const price of stripe.prices.list({
    active: true,
    type: "one_time",
    limit: 100,
  })) {
    if (
      price.currency === "usd" &&
      price.metadata.catalog === STRIPE_PRICE_METADATA.catalog &&
      price.metadata.catalog_version === STRIPE_PRICE_METADATA.catalogVersion &&
      price.metadata.price_key === priceKey
    ) {
      matches.push(price);
    }
  }
  if (matches.length !== 1) {
    throw new Error(matches.length
      ? `Stripe Price ${priceKey} is ambiguous; exactly one fixed active USD Price is required.`
      : `Stripe Price ${priceKey} is not configured. Run the Stripe product setup script first.`);
  }
  return matches[0];
}