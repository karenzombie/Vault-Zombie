# VaultZombie Marketing Site, Build Stages (v1)

This document covers the public marketing site only. It does not change the operator app, the
guest screens, or the admin panel.

---

## How to work through this document

Work one stage at a time, in order. At the end of every stage, STOP and report. Do not begin the
next stage until you are told to.

Follow these instructions exactly as written. Do not deviate from them, do not substitute your
own approach, and do not build anything this document does not describe. If any instruction here
is unclear, contradicts something you find in the codebase, or cannot be built as written, STOP
and ask before writing code. Asking is always correct. Guessing is not.

If you notice something outside the current stage that looks wrong, report it at the stage gate.
Do not fix it.

The standing rules in `replit.md` apply throughout, including ADDENDUMS GOVERN.

Governing documents, all in `Vault_Zombie_Initial_Build_Files/`:

- `VaultZombie-Build-Brief-v2.md`, plus its addendums. Section 5 is the source of truth for
  pricing and tiers. Section 13 governs what marketing copy may and may not claim. Section 15 is
  the design system.
- `vaultzombie-style-guide.html`, the source of truth for color, typography, radius, and spacing.
- `mockup_vaultzombie-marketing.html`, which shows all seven pages. Guidance on layout and
  content, not an exact spec.
- `vaultzombie-pricing.html`, the pricing page mockup. Guidance only.

Where the mockup and the Build Brief disagree, the Build Brief wins.

---

## What already exists

- `artifacts/vault-zombie/src/pages/public/landing.tsx` is the current public home page, routed at
  `/` in `App.tsx`. It is one long scrolling page with five stacked sections, and it has the
  pricing tiers built into the bottom of it.
- The gift purchase flow already exists at `/gifts/purchase`, `/gifts/checkout/success`, and
  `/gifts/checkout/cancelled`. Do not rebuild or modify it.
- `artifacts/vault-zombie/public/` holds `vault_zombie_png.png`, `vaultzombie_text.png`,
  `favicon.svg`, and the vault art. This is the folder the app serves static files from.
- `Policy_Documents/` at the repository root holds four PDF files, two current and two outdated.

The goal of this work is a marketing site of seven separate routed pages, not one long page a
visitor has to scroll through and scroll back up. That separation is the point of the work.

---

## The seven pages and their routes

| Page | Route |
|---|---|
| Home | `/` |
| How it works | `/how-it-works` |
| Vault types | `/vault-types` |
| Pricing | `/pricing` |
| Gift a vault | `/gift` |
| About | `/about` |
| Legal | `/legal` |

Every one of these is a real route with its own page component. None of them is an anchor link to
a section of another page. A visitor landing directly on `/pricing` sees the pricing page.

---

## The shared shell

Every one of the seven pages uses the same header and the same footer.

### Header

Left: the logo `vault_zombie_png.png` next to the wordmark image `vaultzombie_text.png`, matching
how `landing.tsx` already renders them. The pair links to `/`.

Right, in this order: a hamburger menu button, then `Sign in`, then `Sign up`.

The hamburger holds the page links, so the header stays short on a phone:

- How it works
- Vault types
- Pricing
- Gift a vault
- About

The hamburger is a real menu on every screen size, not only on mobile. It opens on click, closes
on click outside, closes on the Escape key, and closes when a link inside it is chosen. It is
keyboard reachable and its open state is exposed to assistive technology.

`Sign in` and `Sign up` stay visible outside the hamburger at all sizes. Wire them to the same
destinations the current header in `landing.tsx` uses. Do not invent new authentication routes.

### Footer

The footer carries, as links:

How it works, Vault types, Pricing, Gift a vault, About, Contact, Terms, Privacy.

Then this line, exactly: `Sealed predictions, unlocked over time. A Zombie Platforms product.`

- `Contact` is a mailto link to `info@zombieplatforms.com`.
- `Terms` and `Privacy` open the PDF files described in Stage 5, each in a new browser tab.

---

## Design rules

Build on the style guide's tokens. The mockup uses several things that are not adopted and must
not be carried across:

- The rust-orange accent `#C4573A`. Use the style guide's Ink and Brass instead.
- The Caveat script typeface. Use only Tilt Warp for display and Afacad Flux for everything else.
- Box shadows. There are no shadows anywhere. Elevation comes from hairline borders and
  background contrast.
- The mockup's larger radius scale. Use the style guide's radius tokens.

Other rules that hold across all seven pages:

- Tilt Warp is for the wordmark and hero display only, never for functional headings.
- Never set body copy in bronze. It fails contrast at small sizes.
- One primary action per view.
- Keep neutrals warm. No cool grays.
- Every page needs visible focus styles on interactive elements. This is an accessibility
  requirement, not optional.
- No dark mode.

---

## Copy the Build Brief overrides

Section 13 of the Build Brief forbids marketing copy that claims nobody at VaultZombie can open a
vault, because an admin manual unlock exists. It equally forbids advertising that override. The
promise is stated as it applies to users.

Two lines in the mockup break that rule and must be replaced with the text below. Use this
wording exactly. Do not write your own version and do not carry the mockup's wording across.

On the About page, under the heading `Sealed, on purpose`, replace the mockup's paragraph with:

> Nothing opens early. No guest, no host, and no gifter can read a prediction before its reveal
> date, and the product is built from the ground up to keep it that way.

On the Legal page, under the heading `Sealed means sealed`, replace the mockup's paragraph with:

> Guesses stay locked until their reveal date. No guest, host, or gifter can read sealed content
> before then, and dashboards show counts, never the words inside.

If you find any other copy in the mockup making a similar claim, STOP and report it rather than
rewriting it yourself.

---

# Stage 1: The shell and the routes

Build the shared header and footer, and register all seven routes.

- Create a shared layout component that renders the header, the page content, and the footer.
- Register the seven routes listed above in `App.tsx`.
- `/` continues to render the existing `landing.tsx` for now, wrapped in the new layout. Do not
  change its content in this stage.
- The other six routes render placeholder page components containing only the page name as a
  heading, inside the shared layout.
- Build the hamburger menu fully in this stage, with all the behavior described above.
- Build the footer fully in this stage, except the Terms and Privacy links, which point nowhere
  until Stage 5. Leave them out rather than linking them to a placeholder.

Do not touch the guest screens, the operator app, the admin panel, or the gift purchase flow.

**STOP and report:**

- The files added and changed, with the reason for each.
- Confirmation that all seven routes load and that the hamburger opens, closes on outside click,
  closes on Escape, and is keyboard reachable.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

---

# Stage 2: Home and Pricing

This stage splits the existing long page into two.

### Pricing at `/pricing`

Build the pricing page from the `m-pricing` screen of the marketing mockup and from
`vaultzombie-pricing.html`.

Four tiers, in this order, with these values taken from Build Brief section 5. Section 5 governs,
not the mockup, if they ever differ:

| Tier | Price | Guests | Runs up to | Schedules |
|---|---|---|---|---|
| Lockbox | Free | 10 | 3 months | Weekly Sprint, or Monthly x3 |
| Safe | $19 once | 50 | 3 years | above, plus Monthly Year and Half-then-Annual |
| Vault | $39 once | 100 | 5 years | all schedules |
| Deep Vault | $59 once | 250 | 10 years, plus milestone | all schedules |

The page also states that every plan is a one-time payment with no subscriptions, that every plan
can be given as a gift, that each paid plan adds to the schedules of the ones below it, and that
going over the guest count at an event keeps every answer and offers an upgrade afterward.

Each tier's call to action goes to the same destination the existing pricing section in
`landing.tsx` already uses for that tier. Do not invent new checkout routes.

### Home at `/`

Rework `landing.tsx` into a home page that teases rather than tells everything.

- Remove the pricing section entirely. It now lives at `/pricing`.
- Keep the hero, and keep the sections the `m-home` screen of the mockup shows.
- Where the home page summarizes something that now has its own page, end that section with a
  link to the full page. How it works links to `/how-it-works`, the vault types summary links to
  `/vault-types`, and a pricing mention links to `/pricing`.
- The home page must be meaningfully shorter than it is now. A visitor should be able to reach
  the footer without a long scroll.

**STOP and report:**

- The files added and changed, with the reason for each.
- Confirmation that the four tiers on `/pricing` match the table above exactly.
- Confirmation that no pricing content remains on `/`.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

---

# Stage 3: How it works, and Vault types

### How it works at `/how-it-works`

Build from the `m-how` screen of the mockup. It covers the three step flow, the reveal schedule
section explaining that the host chooses the tempo and that every reveal date is counted from the
event date, and the scoring section with its three outcomes:

- Full, `Called it`, an exact match.
- Half, `Close`, inside the range the host set.
- Zero, `Nope`, a miss.

The reveal schedules and scoring behavior must match Build Brief sections 4 and 8. If the mockup
and the brief differ on any detail here, follow the brief and report the difference.

### Vault types at `/vault-types`

Build from the `m-types` screen of the mockup. Ten vault types, each with its prompt count,
category count, and one sample prompt.

Do not take the counts from the mockup. Take them from `Vault_Zombie_Initial_Build_Files/question-metadata.json`,
which is the imported source for the question banks. If any count in the mockup disagrees with
that file, the file wins and you report the difference.

The page also states that prompts fill in real names automatically and that a host can retire any
prompt they would rather skip.

**STOP and report:**

- The files added and changed, with the reason for each.
- The ten vault types with the prompt and category counts you used, and the source you took each
  from.
- Any place the mockup disagreed with the Build Brief or the metadata file.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

---

# Stage 4: Gift a vault

Build `/gift` from the `m-gift` screen of the mockup.

The page covers what gifting is, a three step explanation, and a call to action.

The three steps, matching Build Brief section 5:

1. You buy it. The gifter picks Safe, Vault, or Deep Vault and receives a redemption code and a
   printable gift card.
2. They redeem it. The recipient enters the code, becomes the owner, and builds prompts for their
   own milestone.
3. You hear back. The gifter is notified when the recipient activates the vault.

The page states that codes never expire and are single use.

The primary call to action goes to the existing `/gifts/purchase` route. Do not build a new gift
purchase flow, and do not modify the existing one.

Lockbox is not giftable. Only Safe, Vault, and Deep Vault are. Do not show Lockbox as a gift
option.

**STOP and report:**

- The files added and changed, with the reason for each.
- Confirmation that the call to action reaches the existing gift purchase flow and that nothing
  in that flow was modified.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

---

# Stage 5: About, Legal, and the policy documents

### About at `/about`

Build from the `m-about` screen of the mockup: the origin paragraph, and the two panels
`Sealed, on purpose` and `Heirloom, not horror`.

Use the replacement copy given above for `Sealed, on purpose`.

The contact section shows the email address `info@zombieplatforms.com` as a mailto link. Do not
build a contact form. The mockup shows a name, email, message form with a send button. It is not
being built. Do not build any inbound message handling.

Do not use the address shown in the mockup. `info@zombieplatforms.com` is the only contact
address on this site.

### The policy documents

`Policy_Documents/` at the repository root currently holds four PDF files. Two are current and
two are outdated:

- Current: `VaultZombie-Privacy-Policy-v2.pdf` and `VaultZombie-Terms-and-Conditions-v2.pdf`
- Outdated: `VaultZombie-Privacy-Policy.pdf` and `VaultZombie-Terms-and-Conditions.pdf`

Copy only the two v2 files into `artifacts/vault-zombie/public/` so the app serves them. Leave
the outdated pair where it is and do not link to it anywhere.

If either v2 file is not present in `Policy_Documents/`, STOP and report that. Do not link the
outdated files in their place.

### Legal at `/legal`

Build from the `m-legal` screen of the mockup. It carries the plain-language summary in four
parts: `What we store`, `Sealed means sealed`, `Your cover photo`, and `Payments`.

Use the replacement copy given above for `Sealed means sealed`.

Below the summary, two buttons: `Read full Terms` and `Read full Privacy Policy`. Each opens its
PDF in a new browser tab, never in the current tab. Use `target="_blank"` with
`rel="noopener noreferrer"`.

Wire the footer's `Terms` and `Privacy` links to the same two PDFs, also in a new tab.

**STOP and report:**

- The files added and changed, with the reason for each.
- Confirmation that both v2 PDFs are present in `artifacts/vault-zombie/public/`, and that
  nothing links to the outdated pair.
- Confirmation that the Terms and Privacy links open in a new tab from both the Legal page and
  the footer.
- Confirmation that no contact form was built.
- The result of `pnpm run typecheck`.
- The output of `git status` and `git diff --stat` across the full working tree.

Then STOP. The marketing site is complete at the end of this stage.
