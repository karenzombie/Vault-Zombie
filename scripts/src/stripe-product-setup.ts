import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  throw new Error("STRIPE_SECRET_KEY is required to configure Vault Zombie Stripe Prices.");
}
if (!secretKey.startsWith("sk_test_")) {
  throw new Error("STRIPE_SECRET_KEY must be a Stripe test secret key beginning with sk_test_.");
}

const stripe = new Stripe(secretKey);
const catalogMetadata = { catalog: "vault_zombie", catalog_version: "1" };

const definitions = [
  { key: "initial_safe", name: "Vault Zombie Safe", amount: 1900 },
  { key: "initial_vault", name: "Vault Zombie Vault", amount: 3900 },
  { key: "initial_deep_vault", name: "Vault Zombie Deep Vault", amount: 5900 },
  { key: "upgrade_safe_to_vault", name: "Vault Zombie Safe to Vault upgrade", amount: 2000 },
  { key: "upgrade_safe_to_deep_vault", name: "Vault Zombie Safe to Deep Vault upgrade", amount: 4000 },
  { key: "upgrade_vault_to_deep_vault", name: "Vault Zombie Vault to Deep Vault upgrade", amount: 2000 },
] as const;

async function findCatalogProduct() {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (
      product.metadata.catalog === catalogMetadata.catalog &&
      product.metadata.catalog_version === catalogMetadata.catalog_version &&
      product.metadata.product_key === "one_time_payments"
    ) return product;
  }
  return stripe.products.create({
    name: "Vault Zombie one-time payments",
    metadata: { ...catalogMetadata, product_key: "one_time_payments" },
  });
}

async function setup() {
  const product = await findCatalogProduct();
  for (const definition of definitions) {
    let found = false;
    for await (const price of stripe.prices.list({ active: true, type: "one_time", limit: 100 })) {
      if (
        price.currency === "usd" &&
        price.metadata.catalog === catalogMetadata.catalog &&
        price.metadata.catalog_version === catalogMetadata.catalog_version &&
        price.metadata.price_key === definition.key
      ) {
        if (price.unit_amount !== definition.amount || price.product !== product.id) {
          throw new Error(`Existing Stripe Price ${definition.key} does not match its governed definition.`);
        }
        found = true;
        break;
      }
    }
    if (!found) {
      await stripe.prices.create({
        currency: "usd",
        unit_amount: definition.amount,
        product: product.id,
        metadata: { ...catalogMetadata, price_key: definition.key },
      });
    }
  }
}

setup().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : "Stripe product setup failed."}\n`);
  process.exitCode = 1;
});