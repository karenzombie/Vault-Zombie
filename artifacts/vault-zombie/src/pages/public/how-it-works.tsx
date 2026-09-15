import { PenLine, QrCode, Unlock, Clock, CalendarClock } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Stage 3. Built from the `m-how` screen of the marketing mockup. The
 * three-step flow, the reveal schedule section, and the scoring section
 * were checked against Build Brief sections 4 and 8 — no disagreements
 * found; the mockup's wording and values match the brief.
 */

const STEPS = [
  { n: 1, name: "Create", desc: "Pick a vault type, set your event date, choose how often guesses unlock, and curate your prompts.", icon: PenLine },
  { n: 2, name: "Share", desc: "Share the QR code however you like. Print it on your invites, set it out at the venue, or drop it into an email or text. Guests scan and seal a guess in about a minute.", icon: QrCode },
  { n: 3, name: "Reveal", desc: "On each date, that batch of guesses opens. You mark what really happened, and the scoreboard updates.", icon: Unlock },
];

const SCHEDULES = [
  { name: "Weekly Sprint", desc: "A reveal every week for eight weeks. Built for short, fun events." },
  { name: "Monthly x3", desc: "A reveal each month for three months. A quick taste of the whole idea." },
  { name: "Monthly Year", desc: "A reveal every month for thirteen months. A full first-year ritual." },
  { name: "Half-then-Annual", desc: "One reveal at six months, then every anniversary. A long range with an early payoff." },
  { name: "Annual Keepsake", desc: "A reveal every year, up to your plan's limit. The classic long-range life vault." },
];

const OUTCOMES = [
  { tier: "Full", label: "Called it", desc: "An exact match. The guess lands dead on.", color: "text-bronze" },
  { tier: "Half", label: "Close", desc: "Inside the range you set. Near-misses still climb the board.", color: "text-brass" },
  { tier: "Zero", label: "Nope", desc: "A miss. Wild guesses earn nothing.", color: "text-gray" },
];

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
      <section className="py-24 px-6 text-center bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">How it works</h2>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">Seal a guess today. Unlock it when it matters.</h1>
          <p className="text-lg text-text-2">
            Turn your event into a game that plays out over years. Here is the whole thing, start to finish.
          </p>
        </div>
      </section>

      <section className="py-4 px-6 bg-white border-y border-hairline">
        <div className="max-w-6xl mx-auto py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="p-8 rounded-2xl border border-hairline bg-background shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze mb-6">
                  <step.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-ink mb-3">{step.n}. {step.name}</h3>
                <p className="text-text-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">The reveal schedule</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">You choose the tempo.</h3>
            <p className="text-lg text-text-2">
              At setup you pick one schedule. It sets the exact dates guests choose from, and how the story unfolds.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SCHEDULES.map((s) => (
              <div key={s.name} className="p-8 rounded-2xl border border-hairline bg-white shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-ink mb-3">{s.name}</h4>
                <p className="text-text-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
            <div className="p-8 rounded-2xl border border-hairline bg-bronze-wash shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-bronze mb-6">
                <CalendarClock className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-ink mb-3">Anchored to your day</h4>
              <p className="text-text-2 leading-relaxed">Every reveal date is counted from your event date, so anniversaries land on the anniversary.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white border-t border-hairline">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Scoring</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">How the scoreboard adds up.</h3>
            <p className="text-lg text-text-2">
              You enter what really happened once per prompt, and the app scores every guest from it. No marking by hand.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {OUTCOMES.map((o) => (
              <div key={o.tier} className="p-8 rounded-2xl border border-hairline bg-background text-center shadow-sm">
                <div className={`font-display text-3xl mb-2 ${o.color}`}>{o.tier}</div>
                <h4 className="font-bold text-ink mb-2">{o.label}</h4>
                <p className="text-sm text-text-2 leading-relaxed">{o.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray max-w-2xl mx-auto mt-10">
            Just-for-fun keepsake prompts never touch the score. They are there for the memories.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
