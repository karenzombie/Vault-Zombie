import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Stage 5. Built from the `m-about` screen of the marketing mockup. The
 * "Sealed, on purpose" paragraph uses the replacement copy the Build
 * Stages document supplies (the section above Stage 1, "Copy the Build
 * Brief overrides") rather than the mockup's wording, since the mockup's
 * version implies an admin cannot manually unlock a vault, which Build
 * Brief section 13 forbids claiming.
 *
 * The mockup's contact panel includes a name/email/message form. Per
 * explicit instruction, no contact form or inbound message handling was
 * built. The only contact address on the site is a mailto link to
 * info@zombieplatforms.com (not the mockup's hello@vaultzombie.com).
 *
 * The shadow on the contact panel matches the treatment already used on
 * /pricing and the home page (Addendum 1 section 3).
 */
export default function AboutPage() {
  return (
    <MarketingLayout>
      <section className="py-24 px-6 bg-background text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">About</h2>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">Made to be opened later.</h1>
          <p className="text-lg text-text-2">
            VaultZombie started with a simple thought at a friend&rsquo;s wedding: everyone there had an opinion about the years ahead, and none of it was written down. So we built a way to seal those guesses and open them when they finally come true.
          </p>
        </div>
      </section>

      <section className="pb-8 px-6 bg-white border-t border-hairline">
        <div className="max-w-6xl mx-auto pt-16 grid md:grid-cols-2 gap-8">
          <div className="p-8 rounded-2xl border border-hairline bg-background shadow-sm">
            <h3 className="text-xl font-bold text-ink mb-3">Sealed, on purpose</h3>
            <p className="text-text-2 leading-relaxed">
              Nothing opens early. No guest, no host, and no gifter can read a prediction before its reveal date, and the product is built from the ground up to keep it that way.
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-hairline bg-background shadow-sm">
            <h3 className="text-xl font-bold text-ink mb-3">Heirloom, not horror</h3>
            <p className="text-text-2 leading-relaxed">
              The look is archival and warm, meant to be kept. Our little safe-cracking zombie is here for the fun of it, not to spook anyone. He just really likes opening what was locked away.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl border border-hairline bg-bronze-wash/40 shadow-sm p-8 md:p-12 grid md:grid-cols-2 gap-8 items-start">
            <div>
              <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Contact</h2>
              <h3 className="text-2xl font-bold text-ink mb-3">Say hello.</h3>
              <p className="text-text-2">Questions about a vault, a gift, or your event? We answer every message.</p>
            </div>
            <div className="md:text-right">
              <a
                href="mailto:info@zombieplatforms.com"
                data-testid="link-contact-email"
                className="text-lg font-bold text-ink hover:text-bronze transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                info@zombieplatforms.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
