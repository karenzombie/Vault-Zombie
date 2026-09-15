import { Link } from "wouter";
import { Gift, CircleCheck, Mail } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Stage 4. Built from the `m-gift` screen of the marketing mockup. The
 * call to action goes to the existing `/gifts/purchase` route (Build
 * Stages Stage 4) — no new checkout flow was built and the existing one
 * was not modified. Lockbox is free and not giftable (Addendum 1 section
 * 2), so it is never listed among the gift options. Shadows on the hero
 * card and step cards match the treatment already used on /pricing and
 * the home page (Addendum 1 section 3).
 */

const STEPS = [
  { n: 1, name: "You buy it", desc: "The gifter picks Safe, Vault, or Deep Vault and receives a redemption code and a printable gift card.", icon: Gift },
  { n: 2, name: "They redeem it", desc: "The recipient enters the code, becomes the owner, and builds prompts for their own milestone.", icon: CircleCheck },
  { n: 3, name: "You hear back", desc: "The gifter is notified when the recipient activates the vault.", icon: Mail },
];

export default function GiftPage() {
  return (
    <MarketingLayout>
      <section className="py-24 px-6 bg-background">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Gift a vault</h2>
            <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">The present they open for years.</h1>
            <p className="text-lg text-text-2 mb-10">
              Buy a vault for a couple, a new parent, or a graduate. They redeem it, write their own prompts, and every reveal is a reminder it came from you.
            </p>
            <Link href="/gifts/purchase" className={cn(buttonVariants({ size: "lg" }), "font-bold text-[17px] shadow-lg")}>
              Gift a vault
            </Link>
          </div>

          <div className="rounded-2xl overflow-hidden shadow-xl border border-hairline">
            <div className="bg-ink px-8 py-8 text-center">
              <div className="font-display text-xl text-white">
                <span>Vault</span><span className="text-brass">Zombie</span>
              </div>
              <div className="font-display text-2xl text-brass mt-4">You&rsquo;ve been gifted a vault!</div>
            </div>
            <div className="bg-white px-8 py-8 text-center">
              <div className="text-sm text-gray">Redemption code</div>
              <div className="font-display text-3xl text-ink tracking-widest mt-2">VZ-4K9-ROSA</div>
              <div className={cn(buttonVariants({ size: "lg" }), "w-full mt-6 font-bold pointer-events-none")}>
                Redeem your vault
              </div>
              <p className="text-sm text-gray mt-4">Codes never expire and are single use.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-white border-t border-hairline">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">How gifting works</h2>
            <h3 className="text-3xl md:text-4xl font-bold text-ink mb-4">Three steps, one gift.</h3>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step) => (
              <div key={step.n} className="p-8 rounded-2xl border border-hairline bg-background shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze mb-6">
                  <step.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-ink mb-3">{step.n}. {step.name}</h4>
                <p className="text-text-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
