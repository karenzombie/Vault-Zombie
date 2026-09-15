import { MarketingLayout } from "@/components/marketing-layout";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Stage 5. Built from the `m-legal` screen of the marketing mockup. The
 * "Sealed means sealed" paragraph uses the replacement copy the Build
 * Stages document supplies rather than the mockup's wording, for the
 * same Build Brief section 13 reason as the About page.
 *
 * "Read full Terms" and "Read full Privacy Policy" open the two v2 PDFs
 * copied into `public/` in a new tab (`target="_blank"` with
 * `rel="noopener noreferrer"`), never the outdated pair. The footer's
 * Terms and Privacy links point at the same two files, also new-tab.
 *
 * The card shadow matches the treatment already used on /pricing and the
 * home page (Addendum 1 section 3).
 */
const TERMS_HREF = `${import.meta.env.BASE_URL}VaultZombie-Terms-and-Conditions-v2.pdf`;
const PRIVACY_HREF = `${import.meta.env.BASE_URL}VaultZombie-Privacy-Policy-v2.pdf`;

const SUMMARY = [
  {
    heading: "What we store",
    body: "The less we hold, the less there is to lose. Guests give a guess and an email so we can tell them when it unlocks, and they can opt out of the email. No guest accounts, no addresses, no phone numbers.",
  },
  {
    heading: "Sealed means sealed",
    body: "Guesses stay locked until their reveal date. No guest, host, or gifter can read sealed content before then, and dashboards show counts, never the words inside.",
  },
  {
    heading: "Your cover photo",
    body: "If you upload one, we strip location data from it on the way in, resize it, and store it under a random name. It is shown at your event and is never treated as sealed content.",
  },
  {
    heading: "Payments",
    body: "Handled by Stripe. Card details never touch our servers. Purchases are one-time and gift codes are single use.",
  },
];

export default function LegalPage() {
  return (
    <MarketingLayout>
      <section className="py-24 px-6 bg-background">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Legal</h2>
          <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">Terms &amp; privacy.</h1>
          <p className="text-lg text-text-2 mb-12">
            The plain-language version lives here. The full documents are linked at the bottom of every page.
          </p>

          <div className="rounded-2xl border border-hairline bg-white shadow-sm p-8 md:p-10 space-y-8">
            {SUMMARY.map((item) => (
              <div key={item.heading}>
                <h3 className="text-xl font-bold text-ink mb-2">{item.heading}</h3>
                <p className="text-text-2 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href={TERMS_HREF}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-read-terms"
              className={cn(buttonVariants({ size: "lg" }), "font-bold")}
            >
              Read full Terms
            </a>
            <a
              href={PRIVACY_HREF}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="link-read-privacy"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }), "font-bold")}
            >
              Read full Privacy Policy
            </a>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
