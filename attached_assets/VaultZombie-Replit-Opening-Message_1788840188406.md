Before you write any code, read the specification set for this project. It is complete and settled. The files are in `Vault_Zombie_Initial_Build_Files/` in the workspace root. Every file named below is in that folder. If one appears to be missing, stop and tell me rather than substituting or inventing one.

## What we are building

A web app where a host creates a "vault" for a life event, guests submit sealed text predictions about the future, and those predictions unlock on a schedule over weeks, months, or years. At each unlock the outcome is recorded and a running "who knew you best" scoreboard tracks who called it.

Text predictions only. No video, no audio. Ten life event types at launch, not just weddings.

This is a full product build, not a prototype and not an MVP. Build what is written.

## Read these four, in this order

1. `VaultZombie-Build-Brief-v2.md`, the master specification, the whole thing. Sections 4, 8, 9, and 13 carry the logic that is easiest to get wrong.
2. `VaultZombie-Admin-Panel-Brief.md`
3. `VaultZombie-Report-Design-Guide.md`
4. `vaultzombie-style-guide.html`

Then look at the mockups for feel: `mockup_vaultzombie-marketing.html`, `mockup_vaultzombie-operator.html`, `mockup_vaultzombie-guest-admin.html`, `vaultzombie-pricing.html`, and the assembled report reference `vaultzombie-report-rich.html`.

The ten `vaultzombie-questions-*.md` files and `VaultZombie-Art-Assets.md` are seed content. Read them when you build the import, not before.

## Which document wins

When two documents disagree, resolve in this order, highest first:

1. `VaultZombie-Build-Brief-v2.md`, the master specification
2. `VaultZombie-Admin-Panel-Brief.md`, for the admin surface only
3. `VaultZombie-Report-Design-Guide.md`, for report and results surfaces only
4. `vaultzombie-style-guide.html`, for base design tokens

The mockups never win a disagreement. They are pictures, not specifications. Their purpose is to show layout and feel beyond what color and type tokens can convey. Do not read exact spacing, exact copy, or exact behavior out of them, and do not treat a detail that appears only in a mockup as a requirement.

## The five things most likely to be built wrong

Each of these is a place where the ordinary approach is the wrong approach here.

**1. Unlocking is computed, never stored.** Do not build a scheduled job that flips an unlocked flag. Each answer stores an `unlock_at` timestamp calculated at submission time, and every read of answer content filters on the unlock condition. A vault nobody touches for five years must still open correctly on its own. Brief section 4.

**2. The dependency policy is a hard constraint, not a preference.** The complete list of approved third party services is Clerk, Resend, Stripe, Replit Postgres, Replit object storage, and one private GitHub repository for manual backup only. Nothing else. No charting library, no PDF library or service, no QR code service, no CAPTCHA vendor, no date library, no analytics. Brief section 14 names each one and what replaces it. If you believe something outside that list is genuinely required, stop and ask rather than adding it.

**3. Charts are hand-built in SVG and CSS.** Every chart in the report design guide is buildable that way. This follows from the dependency policy above.

**4. Printables are print-styled HTML.** Gift cards, table cards, and the archive all use the browser's own print-to-PDF. Do not add a PDF generation library or service.

**5. Guests have no account and no identity.** No login, no app install. A guest reaches everything by QR code or link. Answers in progress are drafted in the guest's own browser and restored when the same link is reopened on the same device, because a server side draft would require a guest identity the product deliberately does not have. Brief section 7.

## The sealed rule

Sealed means sealed. No operator, guest, or gifter can open a vault or read answer content before its unlock time, through any surface, including any API response. In the ordinary course the admin sees counts and metadata only, never sealed answer content.

There is exactly one sanctioned exception: the MFA gated manual unlock control specified in the admin panel brief, which writes to the audit log every time it is used. Build that exception exactly as specified and nowhere else. Brief sections 3 and 13.

## Open items, do not invent answers

Brief section 19 lists nine items that are deliberately not yet decided. Cover art for five vault types, number units and bounds, the scoreable or keepsake flag per question, a warning color, per vault theme colors, the report tier mapping, and others.

Where you hit one of these, build the field, the token, or the structure so the decision drops in later without a rebuild, and flag it for me. Do not pick a value and proceed as though it were specified.

## Suggested build order

The specification is not written as a sequence, so treat this as a proposal rather than a requirement. Tell me if you would sequence it differently.

1. Data model, from brief section 9, plus the question bank import
2. Operator authentication and account, Clerk
3. Vault setup and the reveal schedule engine, brief sections 4 and 6
4. Guest link, QR code, and the answering screen in both layouts, brief section 7
5. Reveals, outcome resolution, and scoring, brief section 8
6. Reports, from the report design guide
7. Payments and gifting, brief sections 5 and 12
8. Emails, brief section 11
9. Admin panel, from the admin panel brief
10. Marketing site

## What to do now

Do not start coding yet.

Read the four specification documents, then come back to me with:

1. Confirmation that you have read all four and can see every file listed above.
2. Any questions, contradictions, or gaps you found. Quote the file and section so I can write the answer back into the right document.
3. Whether you agree with the suggested build order or would sequence it differently.

If anything is ambiguous at any point during the build, stop and ask before building past it. A wrong assumption that gets built on is more expensive to unwind than a question asked early.
