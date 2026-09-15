import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useGetBillingPrices } from "@workspace/api-client-react";
import { Check } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Pricing content moved here from the old landing.tsx pricing section
 * (Stage 2). Values match Build Brief section 5. Each tier's call to
 * action goes to the same destination the old landing.tsx section used
 * (/sign-up for all four) — no new checkout routes were invented.
 */
function Pricing() {
  const { data: prices, isLoading, isError } = useGetBillingPrices();

  const paidTiers = prices?.filter((p) => p.fromTier === "lockbox") || [];

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getTierPrice = (tierId: string) => {
    const tier = paidTiers.find((p) => p.targetTier === tierId);
    if (!tier) return null;
    return formatPrice(tier.amountCents, tier.currency);
  };

  const renderPrice = (tierId: string) => {
    if (isLoading) return <div className="h-10 w-24 bg-hairline rounded animate-pulse my-1" />;
    const price = getTierPrice(tierId);
    if (!price) return <div className="font-display text-4xl text-ink mb-1">—<span className="font-sans text-lg text-gray font-normal"> once</span></div>;
    return <div className="font-display text-4xl text-ink mb-1">{price}<span className="font-sans text-lg text-gray font-normal"> once</span></div>;
  };

  return (
    <section className="py-32 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Pricing</h2>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">One payment. Yours to keep.</h1>
          <p className="text-lg text-text-2">
            No subscriptions, ever. Every plan is a one-time payment, and every plan can be given as a gift.
          </p>
        </div>

        {isError && (
          <div className="text-center p-8 bg-background rounded-2xl border border-hairline max-w-2xl mx-auto mb-12">
            <p className="text-destructive font-bold mb-2">Unable to load current pricing.</p>
            <p className="text-text-2">Please try again later.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Lockbox (Free) */}
          <div className="bg-background rounded-2xl border border-hairline p-8 flex flex-col hover-elevate transition-transform shadow-sm">
            <h3 className="font-display text-2xl text-ink mb-2">Lockbox</h3>
            <div className="font-display text-4xl text-ink mb-1">Free</div>
            <p className="text-sm text-gray mb-8">for short events</p>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Up to 10 guests</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Runs up to 3 months</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Weekly Sprint or Monthly x3</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Built-in cover art</span></li>
            </ul>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>Start free</Link>
          </div>

          {/* Safe */}
          <div className="bg-background rounded-2xl border border-hairline p-8 flex flex-col hover-elevate transition-transform shadow-sm">
            <h3 className="font-display text-2xl text-ink mb-2">Safe</h3>
            {renderPrice("safe")}
            <p className="text-sm text-gray mb-8">for a first year</p>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Up to 50 guests</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Runs up to 3 years</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Adds Monthly Year & Half-then-Annual</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Scoreboard and area breakdown</span></li>
            </ul>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>Choose Safe</Link>
          </div>

          {/* Vault (Featured) */}
          <div className="bg-background rounded-2xl border-2 border-vault-accent p-8 flex flex-col relative shadow-xl hover-elevate transition-transform transform md:-translate-y-2">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--vault-accent)] text-ink text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest whitespace-nowrap shadow-md">
              Most Popular
            </div>
            <h3 className="font-display text-2xl text-ink mb-2">Vault</h3>
            {renderPrice("vault")}
            <p className="text-sm text-gray mb-8">the full experience</p>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Up to 100 guests</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Runs up to 5 years</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>All five reveal schedules</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Upload your own cover photo</span></li>
            </ul>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "default" }), "w-full shadow-md text-lg h-12")}>Choose Vault</Link>
          </div>

          {/* Deep Vault */}
          <div className="bg-background rounded-2xl border border-hairline p-8 flex flex-col hover-elevate transition-transform shadow-sm">
            <h3 className="font-display text-2xl text-ink mb-2">Deep Vault</h3>
            {renderPrice("deep_vault")}
            <p className="text-sm text-gray mb-8">a decade-long keepsake</p>

            <ul className="space-y-4 mb-10 flex-1">
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Up to 250 guests</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Runs up to 10 years</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Milestone grand finale reveal</span></li>
              <li className="flex gap-3 text-text-2 items-start"><Check className="w-5 h-5 text-bronze shrink-0 mt-0.5" /> <span>Certificate keepsake</span></li>
            </ul>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "secondary" }), "w-full")}>Choose Deep Vault</Link>
          </div>
        </div>

        <p className="text-center text-sm text-gray max-w-2xl mx-auto mt-12">
          Each paid plan adds to the schedules of the ones below it. Go over your guest count at the event? We keep every answer and simply offer an upgrade after.
        </p>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <MarketingLayout>
      <Pricing />
    </MarketingLayout>
  );
}
