import { Heart, Users, Baby, Sprout, GraduationCap, Briefcase, Plane, Sunset, Rocket, PartyPopper } from "lucide-react";
import { MarketingLayout } from "@/components/marketing-layout";

/**
 * Stage 3, corrected by Marketing Site Build Stages Addendum 2. Prompt
 * counts, sub-category counts, and the one sample prompt per type all come
 * from the ten `vaultzombie-questions-<type>.md` bank files, not from
 * question-metadata.json (withdrawn as a source) and not from the mockup
 * where the mockup's sample prompt doesn't appear word for word in the
 * bank file. See the stop-gate report for the source of each value and
 * every place a mockup sample was replaced.
 */

const VAULT_TYPES = [
  { name: "Marriage", count: 112, categories: 8, sample: "What anniversary will they make the biggest deal of?", icon: Heart },
  { name: "Couple", count: 104, categories: 8, sample: "Where will the proposal happen?", icon: Users },
  { name: "New Baby", count: 96, categories: 8, sample: "What will the baby's first word be?", icon: Baby },
  { name: "Child Growth", count: 104, categories: 8, sample: "What instrument might Maya pick up?", icon: Sprout },
  { name: "College", count: 96, categories: 8, sample: "What will Jordan major in?", icon: GraduationCap },
  { name: "Job", count: 96, categories: 8, sample: "What job title will Sam hold in 5 years?", icon: Briefcase },
  { name: "Travel", count: 96, categories: 8, sample: "What will be Priya's favorite destination?", icon: Plane },
  { name: "Retirement", count: 96, categories: 8, sample: "What will Dave finally have time for?", icon: Sunset },
  { name: "New Business", count: 96, categories: 8, sample: "In how many years will Corner Coffee turn a profit?", icon: Rocket },
  { name: "New Year", count: 96, categories: 8, sample: "What resolution will Alex actually keep in 2027?", icon: PartyPopper },
];

export default function VaultTypesPage() {
  return (
    <MarketingLayout>
      <section className="py-24 px-6 bg-background">
        <div className="max-w-4xl mx-auto">
          <div className="max-w-xl mb-16">
            <h2 className="text-sm font-bold tracking-widest uppercase text-bronze mb-3">Vault types</h2>
            <h1 className="font-display text-4xl md:text-5xl text-ink mb-6">A vault for every milestone.</h1>
            <p className="text-lg text-text-2">
              Ten types at launch, over 900 prompts in all, each bank written for its moment. Flip on the ones you love and add your own.
            </p>
          </div>

          <div className="space-y-4">
            {VAULT_TYPES.map((type) => (
              <div key={type.name} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-6 rounded-2xl border border-hairline bg-white shadow-sm">
                <div className="w-12 h-12 rounded-xl bg-bronze-wash flex items-center justify-center text-bronze shrink-0">
                  <type.icon className="w-6 h-6" />
                </div>
                <div className="sm:w-56 shrink-0">
                  <div className="font-bold text-ink">{type.name}</div>
                  <div className="text-sm text-gray">{type.count} prompts · {type.categories} categories</div>
                </div>
                <div className="text-text-2 italic">&ldquo;{type.sample}&rdquo;</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray mt-8">
            Every prompt fills in the real names automatically, and you can retire any you would rather skip.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
