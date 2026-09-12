import { Link } from "wouter";
import { useGetBillingPrices } from "@workspace/api-client-react";
import { PLAN_POLICY, type PlanTier, type RevealSchedule } from "@workspace/db/schedule";
import { buttonVariants } from "@/components/ui/button";
import { getTierLabel, cn } from "@/lib/utils";

/**
 * The tier chooser (Flow1 Build Stages 1.5). Shown on the empty dashboard and
 * reused wherever a host picks a plan. Guest caps, durations, and tempos all
 * read from PLAN_POLICY; only the fixed marketing copy (summaries, report
 * tiers, keepsake/cover-photo inclusion) is the literal text from the spec,
 * since PLAN_POLICY carries no such fields.
 */

const TIER_ORDER: PlanTier[] = ["lockbox", "safe", "vault", "deep_vault"];

const SCHEDULE_LABELS: Record<RevealSchedule, string> = {
  weekly_sprint: "Weekly Sprint",
  monthly_x3: "Monthly x3",
  monthly_year: "Monthly Year",
  half_then_annual: "Half-then-Annual",
  annual_keepsake: "Annual Keepsake",
};

const TIER_SUMMARY: Record<PlanTier, string> = {
  lockbox: "A free taste, for a small group and a short run.",
  safe: "For a full guest list and a few years of reveals.",
  vault: "More guests, more tempos, and five years of reveals.",
  deep_vault: "The long game, with a finale worth framing.",
};

const TIER_REPORTS: Record<PlanTier, string> = {
  lockbox: "Results on screen",
  safe: "Full reports, including the scoreboard, by-area breakdown, and reveal timeline",
  vault: "Full reports, including the scoreboard, by-area breakdown, and reveal timeline",
  deep_vault: "Full reports plus the grand finale keepsake",
};

function formatDuration(years: number): string {
  if (years < 1) return `${Math.round(years * 12)} months`;
  return `${years} year${years === 1 ? "" : "s"}`;
}

/** Reveal-tempo copy per tier: the full list for the first tier, then "Those plus …"
 * for schedules newly added since the last tier whose schedule set actually changed. */
function tempoCopy(tier: PlanTier): string {
  const index = TIER_ORDER.indexOf(tier);
  const schedules = PLAN_POLICY[tier].schedules;
  if (index === 0) return schedules.map((s) => SCHEDULE_LABELS[s]).join(", ");

  let previousIndex = index - 1;
  while (previousIndex > 0 && PLAN_POLICY[TIER_ORDER[previousIndex]].schedules.length === schedules.length) {
    previousIndex -= 1;
  }
  const previousSchedules = PLAN_POLICY[TIER_ORDER[previousIndex]].schedules;
  const added = schedules.filter((s) => !previousSchedules.includes(s));
  if (added.length === 0) return tempoCopy(TIER_ORDER[previousIndex]);
  return `Those plus ${added.map((s) => SCHEDULE_LABELS[s]).join(" and ")}`;
}

function formatPrice(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amountCents / 100);
}

export function TierChooser() {
  const { data: prices, isLoading, isError } = useGetBillingPrices();
  const paidPrices = prices?.filter((p) => p.fromTier === "lockbox") ?? [];

  function priceFor(tier: PlanTier): string | null {
    if (tier === "lockbox") return "Free";
    const price = paidPrices.find((p) => p.targetTier === tier);
    return price ? formatPrice(price.amountCents, price.currency) : null;
  }

  return (
    <div className="w-full">
      {isError && (
        <div className="text-center p-6 bg-bronze-wash rounded-xl border border-hairline mb-8">
          <p className="text-destructive font-bold">Unable to load current pricing. Please try again later.</p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
        {TIER_ORDER.map((tier) => {
          const policy = PLAN_POLICY[tier];
          const price = priceFor(tier);
          const label = getTierLabel(tier);
          return (
            <div key={tier} className="bg-background rounded-2xl border border-hairline p-6 flex flex-col shadow-sm">
              <h4 className="font-display text-2xl text-ink mb-1">{label}</h4>
              {isLoading ? (
                <div className="h-9 w-20 bg-hairline rounded animate-pulse my-1" />
              ) : (
                <div className="font-display text-3xl text-ink mb-1">
                  {price ?? "—"}
                  {price && price !== "Free" && <span className="font-sans text-base text-gray font-normal"> once</span>}
                </div>
              )}
              <p className="text-sm text-text-2 mb-5">{TIER_SUMMARY[tier]}</p>

              <dl className="space-y-3 flex-1 text-sm mb-6">
                <Row label="Guests" value={`Up to ${policy.guestCap}`} />
                <Row label="Reveals run for" value={formatDuration(policy.durationYears)} />
                <Row label="Reveal tempos" value={tempoCopy(tier)} />
                <Row label="Reports" value={TIER_REPORTS[tier]} />
                <Row label="Printable keepsake" value={tier === "lockbox" ? "Not included" : "Included"} />
                <Row label="Cover photo upload" value={tier === "lockbox" ? "Not included" : "Included"} />
              </dl>

              <Link
                href={`/operator/vaults/new?tier=${tier}`}
                data-testid={`button-choose-${tier}`}
                className={cn(buttonVariants({ variant: tier === "lockbox" ? "secondary" : "default" }), "w-full")}
              >
                {tier === "lockbox" ? "Start free" : `Choose ${label}`}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-t border-hairline pt-3 first:border-0 first:pt-0">
      <dt className="text-xs font-bold uppercase tracking-wide text-gray">{label}</dt>
      <dd className="text-ink">{value}</dd>
    </div>
  );
}
