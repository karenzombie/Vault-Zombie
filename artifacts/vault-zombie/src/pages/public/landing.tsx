import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn, getTierLabel } from "@/lib/utils";
import { useGetBillingPrices } from "@workspace/api-client-react";
import { Shield, Clock, Users, Unlock, Gift, Check, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing-layout";

const fadeUp: any = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const staggerContainer: any = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const SCHEDULES = [
  { name: "Weekly Sprint", desc: "A reveal every week for 8 weeks. Best for short, fun events." },
  { name: "Monthly x3", desc: "A reveal each month for 3 months. The free tier taste." },
  { name: "Monthly Year", desc: "A reveal every month for 13 months. A full first-year ritual." },
  { name: "Half-then-Annual", desc: "One reveal at 6 months, then every anniversary. For early payoff." },
  { name: "Annual Keepsake", desc: "A reveal every year up to the plan limit. Classic long-range life vault." },
];

const VAULT_TYPES = [
  { name: "Marriage", desc: "When they wed, how long till kids.", icon: "marriage.svg" },
  { name: "Couple", desc: "For dating, moving in, and life together.", icon: "couple.svg" },
  { name: "New Baby", desc: "Birth weight, first words, and eye color.", icon: "new-baby.svg" },
  { name: "Child Growth", desc: "Milestones as they grow up.", icon: "child-growth.svg" },
  { name: "College", desc: "Major changes, dorm life, and graduation.", icon: "college.svg" },
  { name: "Job / Occupation", desc: "Promotions, pivots, and career moves.", icon: "job.svg" },
  { name: "Travel", desc: "A big trip and what it brings.", icon: "travel.svg" },
  { name: "Retirement", desc: "Life after the last workday.", icon: "retirement.svg" },
  { name: "New Business", desc: "Whether the idea takes off.", icon: "new-business.svg" },
  { name: "New Year", desc: "What the year ahead holds.", icon: "new-year.svg" }
];

function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="relative flex flex-col items-center overflow-hidden px-4 pb-24 pt-16 sm:px-6 sm:pb-32 sm:pt-24">
      <motion.div
        className="max-w-4xl mx-auto text-center relative z-10"
        initial={reduceMotion ? false : "hidden"}
        animate="visible"
        variants={staggerContainer}
      >
        <motion.h1 variants={fadeUp} className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-[84px] text-ink leading-[1.05] md:leading-[1.02] tracking-tight mb-8">
          Sealed predictions,<br className="hidden md:block" /> unlocked over time.
        </motion.h1>
        <motion.p variants={fadeUp} className="text-lg md:text-2xl text-text-2 mb-10 max-w-2xl mx-auto leading-relaxed">
          Create a meaningful future-prediction vault for life's big events. Invite account-free guests to seal their guesses, and reveal them on one of five schedules over weeks, months, or years.
        </motion.p>
        <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }), "w-full sm:w-auto font-bold text-[17px] shadow-lg")}>
            Create your vault
          </Link>
          <Link href="/gifts/purchase" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full sm:w-auto font-bold text-[17px] bg-white")}>
            Gift a vault
          </Link>
        </motion.div>
      </motion.div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] md:w-[800px] md:h-[800px] bg-bronze-wash rounded-full opacity-60 blur-3xl -z-10 pointer-events-none" />
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="py-24 bg-white px-6 border-y border-hairline">
      <div className="max-w-6xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">You set the pace</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">Five reveal schedules</h3>
          <p className="text-lg text-text-2">
            You decide how your vault opens. Hosts choose among five reveal schedules. Unlocks happen automatically when the time comes.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
          {SCHEDULES.map((s, i) => (
             <div key={i} className="p-8 rounded-2xl border border-hairline bg-background hover-elevate transition-transform shadow-sm">
               <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze mb-6">
                 <Calendar className="w-6 h-6" />
               </div>
               <h4 className="text-xl font-bold text-ink mb-3">{s.name}</h4>
               <p className="text-text-2 leading-relaxed">{s.desc}</p>
             </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VaultTypes() {
  return (
    <section className="py-24 px-6 relative bg-background">
      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16 items-start">
        <div className="lg:w-1/3 lg:sticky lg:top-32">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">For every milestone</h2>
          <h3 className="text-4xl md:text-5xl font-bold text-ink mb-6">Ten vault types ready to go</h3>
          <p className="text-lg text-text-2 mb-8 leading-relaxed">
            Start with hundreds of curated questions for life's biggest events. You can curate our lists, drop the ones you don't want, and write your own custom prompts. There is a meaningful time capsule for whatever chapter comes next.
          </p>
          <Link href="/sign-up" className={cn(buttonVariants({ variant: "secondary" }), "font-bold")}>
            Explore questions <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
        <div className="lg:w-2/3 grid grid-cols-1 sm:grid-cols-2 gap-6 w-full">
          {VAULT_TYPES.map((type) => (
            <div key={type.name} className="bg-white rounded-xl border border-hairline overflow-hidden hover-elevate transition-transform shadow-[0_18px_34px_-26px_rgba(28,27,25,0.35)] flex flex-col">
              {type.icon && (
                <div className="h-28 bg-bronze-wash flex items-center justify-center">
                   <div
                    className="h-16 w-16 bg-[hsl(var(--bronze))]"
                    style={{
                      WebkitMask: `url("${import.meta.env.BASE_URL}vault-art/${type.icon}") no-repeat center / contain`,
                      mask: `url("${import.meta.env.BASE_URL}vault-art/${type.icon}") no-repeat center / contain`,
                    }}
                  />
                </div>
              )}
              <div className={cn("p-5 flex-1 flex flex-col justify-center", !type.icon && "py-8")}>
                <h4 className="font-bold text-lg text-ink mb-1">{type.name}</h4>
                <p className="text-sm text-text-2 leading-relaxed">{type.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Trust() {
  return (
    <section className="py-24 bg-ink text-primary-foreground px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-12 text-center relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-2 border border-text-2 flex items-center justify-center text-brass mb-6">
            <Users className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-brass-lt mb-3">Account-free for guests</h4>
          <p className="text-gray leading-relaxed max-w-xs">
            Guests scan a QR code and answer in seconds. No apps to install, no passwords to remember.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-2 border border-text-2 flex items-center justify-center text-brass mb-6">
            <Shield className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-brass-lt mb-3">Sealed securely</h4>
          <p className="text-gray leading-relaxed max-w-xs">
            Every prediction stays completely locked. Nobody—not even the host—can peek before the reveal date.
          </p>
        </div>
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-ink-2 border border-text-2 flex items-center justify-center text-brass mb-6">
            <Gift className="w-8 h-8" />
          </div>
          <h4 className="text-xl font-bold text-brass-lt mb-3">Yours to keep</h4>
          <p className="text-gray leading-relaxed max-w-xs">
            No subscriptions. One payment unlocks your vault for years, and every plan can be given as a gift.
          </p>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const { data: prices, isLoading, isError } = useGetBillingPrices();

  const paidTiers = prices?.filter(p => p.fromTier === 'lockbox') || [];

  const formatPrice = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  const getTierPrice = (tierId: string) => {
    const tier = paidTiers.find(p => p.targetTier === tierId);
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
    <section className="py-32 px-6 bg-white border-t border-hairline">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Pricing</h2>
          <h3 className="font-display text-4xl md:text-5xl text-ink mb-6">One payment. Yours to keep.</h3>
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
            <h4 className="font-display text-2xl text-ink mb-2">Lockbox</h4>
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
            <h4 className="font-display text-2xl text-ink mb-2">Safe</h4>
            {renderPrice('safe')}
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
            <h4 className="font-display text-2xl text-ink mb-2">Vault</h4>
            {renderPrice('vault')}
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
            <h4 className="font-display text-2xl text-ink mb-2">Deep Vault</h4>
            {renderPrice('deep_vault')}
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

export default function Landing() {
  return (
    <MarketingLayout>
      <Hero />
      <HowItWorks />
      <VaultTypes />
      <Trust />
      <Pricing />
    </MarketingLayout>
  );
}
