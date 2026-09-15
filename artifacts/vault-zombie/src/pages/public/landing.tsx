import { Link } from "wouter";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Shield, Check, Tag, ArrowRight, PenLine, QrCode, Unlock } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Stage 2 rework: this page now teases rather than tells everything. The
 * full pricing grid moved to /pricing, and the sections below summarize
 * what now lives on their own pages, ending with a link to each. Section
 * order and content follow the `m-home` screen of the marketing mockup.
 */

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

const STEPS = [
  { n: 1, name: "Create", desc: "Set your event date and pick how often predictions unlock.", icon: PenLine },
  { n: 2, name: "Share", desc: "Guests scan your QR code and seal a prediction. No app, no account.", icon: QrCode },
  { n: 3, name: "Reveal", desc: "Predictions unlock on your schedule. See who called it.", icon: Unlock },
];

const BOARD = [
  { name: "Aunt Rosa", pct: 92 },
  { name: "Dev", pct: 78 },
  { name: "Priya", pct: 64 },
  { name: "Marcus", pct: 51 },
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

function VaultTypesTeaser() {
  return (
    <section className="py-24 bg-white px-6 border-y border-hairline">
      <div className="max-w-6xl mx-auto">
        <div className="max-w-2xl mb-12">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Works for any milestone</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">Not just weddings.</h3>
          <p className="text-lg text-text-2">
            Ten kinds of vault, each with its own bank of prompts. Pick the one that fits the moment and your guests do the rest.
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-10">
          {VAULT_TYPES.map((type) => (
            <div key={type.name} className="p-4 rounded-xl border border-hairline bg-background text-center hover-elevate transition-transform">
              <div
                className="h-10 w-10 mx-auto mb-3 bg-[hsl(var(--bronze))]"
                style={{
                  WebkitMask: `url("${import.meta.env.BASE_URL}vault-art/${type.icon}") no-repeat center / contain`,
                  mask: `url("${import.meta.env.BASE_URL}vault-art/${type.icon}") no-repeat center / contain`,
                }}
              />
              <h4 className="font-bold text-sm text-ink">{type.name}</h4>
            </div>
          ))}
        </div>
        <Link href="/vault-types" className={cn(buttonVariants({ variant: "secondary" }), "font-bold")}>
          See all vault types <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </section>
  );
}

function HowItWorksSteps() {
  return (
    <section className="py-24 px-6 bg-background">
      <div className="max-w-5xl mx-auto text-center">
        <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">It's simple</h2>
        <h3 className="text-3xl md:text-4xl font-bold text-ink mb-12">How it works</h3>
        <div className="grid md:grid-cols-3 gap-8 text-left mb-10">
          {STEPS.map((step) => (
            <div key={step.n} className="p-6 rounded-2xl border border-hairline bg-white shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze mb-4">
                <step.icon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-ink mb-2">{step.n}. {step.name}</h4>
              <p className="text-text-2">{step.desc}</p>
            </div>
          ))}
        </div>
        <Link href="/how-it-works" className={cn(buttonVariants({ variant: "secondary" }), "font-bold")}>
          See the full walkthrough <ArrowRight className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </section>
  );
}

function Moment() {
  return (
    <section className="py-24 px-6 bg-white border-y border-hairline">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">The best part</h2>
        <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">Open it on a day that means something.</h3>
        <p className="text-lg text-text-2">
          Your first anniversary, the day the baby arrives, a milestone birthday. Each reveal brings back what everyone guessed, and the moment they find out who was right.
        </p>
      </div>
    </section>
  );
}

function Payoff() {
  return (
    <section className="py-24 bg-ink text-primary-foreground px-6">
      <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-brass mb-3">The payoff</h2>
          <h3 className="text-3xl md:text-4xl font-bold text-brass-lt mb-4">Who knew you best?</h3>
          <p className="text-gray leading-relaxed mb-8 max-w-md">
            When predictions come true, the guesses that got it right climb the board. By the final drop, one guest is crowned the one who knew you best.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }), "font-bold")}>See pricing</Link>
            <Link href="/sign-up" className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "font-bold bg-white")}>Create your vault</Link>
          </div>
        </div>
        <div className="bg-ink-2 border border-text-2 rounded-2xl p-6">
          <h4 className="text-brass-lt font-bold mb-4">Who knew you best</h4>
          <div className="space-y-3">
            {BOARD.map((b, i) => (
              <div key={b.name} className="flex items-center gap-3 text-sm">
                <span className="w-5 text-gray">{i + 1}</span>
                <span className="flex-1 text-white">{b.name}</span>
                <div className="flex-1 h-2 rounded-full bg-ink overflow-hidden">
                  <div className="h-full bg-brass" style={{ width: `${b.pct}%` }} />
                </div>
                <span className="text-gray w-10 text-right">{b.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustBar() {
  return (
    <section className="py-10 px-6 bg-white">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-bold text-ink">
        <span className="flex items-center gap-2"><Check className="w-4 h-4 text-bronze" /> Easy to set up</span>
        <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-bronze" /> Sealed and private</span>
        <span className="flex items-center gap-2"><Tag className="w-4 h-4 text-bronze" /> One-time payment</span>
      </div>
    </section>
  );
}

export default function Landing() {
  return (
    <MarketingLayout>
      <Hero />
      <VaultTypesTeaser />
      <HowItWorksSteps />
      <Moment />
      <Payoff />
      <TrustBar />
    </MarketingLayout>
  );
}
