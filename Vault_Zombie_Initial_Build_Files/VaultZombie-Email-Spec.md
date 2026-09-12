# Vault Zombie: Email Specification

**Status:** Current and authoritative for all email.

This document specifies every email Vault Zombie sends: who receives it, what triggers it, its exact copy, its layout and styling, and the screens that email depends on (the recipient email field on the gift page and unsubscribe management).

Where this document differs from the Master Build Brief section 11, Master Build Brief section 8.1 step 4, or the Report Design Guide section 7 part D, **this document governs.**

---

## 1. Global rules

1. **Sending service:** Resend, through the existing email outbox and worker.
2. **From:** `Vault Zombie <noreply@vaultzombie.com>`.
3. **Environments:** development sends real email to the actual recipient, the same as production. Do not add a redirect, allowlist, or send guard.
4. **Out of scope:** Clerk's own emails (sign-up verification code, password reset). Clerk sends and styles those. Do not build or restyle them.
5. **Copy is final.** Use every subject line, heading, and sentence exactly as written in section 6, including emoji in subject lines. Do not reword, shorten, or add copy. If a sentence cannot be made accurate for a real situation, stop and report it.
6. **Brackets:** text in `[brackets]` is filled in automatically. Lines marked "Only if" or "If" appear only when that condition is true.
7. **Every email has two versions:** an HTML version (section 3) and a plain-text version carrying the same content in the same order.
8. **No attachments.** Ever. Everything is in the email body or behind a link.
9. **Links:** every link is an absolute URL built from `VAULT_ZOMBIE_APP_URL`.
10. **Wording:** visible copy says "host," never "operator." Internal code and database names stay as they are.
11. **Formats:**
    - Dates: `March 14, 2027`. Payment and purchase dates use US Pacific time.
    - Money: `$19.00`.
    - Elapsed time (like "sealed them [2 years] ago"): plain words, rounded to the largest sensible unit, such as `3 weeks`, `6 months`, `2 years`.
12. **Plan values** (tier name, guest limit, how long reveals run) always come from the same plan configuration the app already uses. Never hardcode them in a template. For reference: Lockbox 10 guests and 3 months, Safe 50 guests and 3 years, Vault 100 guests and 5 years, Deep Vault 250 guests and 10 years.
13. **Sealed rule:** no email ever shows a prediction's answer before its reveal date. Sealed-status emails show counts and dates only.
14. **One email per trigger.** Each email is sent at most once for its trigger, using the existing dedupe key pattern. Section 5 lists the rule for each.

---

## 2. Footer (every email)

```
Zombie Platforms LLC
Questions? info@zombieplatforms.com. This mailbox isn't monitored, so please don't reply to this email.
```

- `info@zombieplatforms.com` is a `mailto:` link.
- The Host receipt (H3) uses `Questions about your purchase?` in place of `Questions?`.
- Guest emails (G1 and G2) add this line below the footer, with "Unsubscribe from this vault" as the link:

```
Don't want emails about [vault name]? Unsubscribe from this vault. If you do, you won't hear when your predictions for [vault name] unlock or how they turned out. Emails from any other vault you're part of won't change.
```

---

## 3. Layout and styling

Build email-safe HTML: table-based layout, inline styles, 600px maximum width, centered. It must render correctly in Gmail (web and app), Apple Mail, iOS Mail, and Outlook.

### 3.1 Fonts

- Font stack for all text: `'Afacad Flux', Helvetica, Arial, sans-serif`. Many email apps, including Gmail, do not load custom fonts and fall back to Helvetica or Arial. That is expected.
- Tilt Warp is not used in email.

| Element | Size | Weight | Color |
|---|---|---|---|
| Eyebrow (small line above the main heading) | 13px | 600 | Bronze `#8A6D3B` |
| Main heading | 28px | 700 | Ink `#1C1B19` |
| Section heading | 17px | 600 | Ink `#1C1B19` |
| Body text | 16px, line height 1.5 | 400 | Ink `#1C1B19` |
| Footer and fine print | 13px | 400 | Text 2 `#55514A` |
| Gift code | 24px, letter spacing 0.14em | 700 | Ink `#1C1B19` |

Links are Bronze `#8A6D3B` and underlined. Bronze is never used for paragraph text.

### 3.2 Structure, top to bottom

1. **Page background:** Parchment `#F6F4F0`.
2. **Content card:** White `#FFFFFF`, 1px border Hairline `#E4DED4`, 12px corner radius where the email app supports it. No shadows anywhere.
3. **Header band:** Tan, Brass Light `#E7D6B4`, spanning the full card width. Both logo images centered side by side:
   - The vault icon: `vault_zombie_png.png`
   - The wordmark: `vaultzombie_text.png`
   - Both are served from the web app's public folder as absolute URLs, with alt text `Vault Zombie`.
   - **Never place the logos on a dark background.** They contain black details that disappear on dark colors.
4. **Eyebrow and main heading,** centered.
5. **Body sections,** in the order shown for each email in section 6.
6. **Footer,** outside the card on the parchment background, centered.

### 3.3 Blocks

- **Highlight band:** Bronze Wash `#F0E9DC` background, spanning the card width. Holds the email's key item (a gift code, a link, a score).
- **Code or link box:** inside a highlight band. White background, 2px dashed Brass `#C9A96A` border, centered. Gift codes use the gift code style above. Links use body text size.
- **Dark band:** Ink `#1C1B19` background, spanning the card width. Its heading is Brass Light `#E7D6B4`, and its body text is Parchment `#F6F4F0`. Stat tiles inside it have an Ink background, a 1px Text 2 `#55514A` border, the number in Brass `#C9A96A` at 24px bold, and the label in Parchment at 13px. Logos never appear in a dark band.
- **Button:** Ink `#1C1B19` background, Brass Light `#E7D6B4` text at 16px weight 600, 8px corner radius, about 14px by 28px padding, centered. Build it as a table-based button so it renders in Outlook.
- **Numbered steps:** each number in a 26px Ink circle with a Brass Light number, the step text to its right.
- **Receipt table:** one row per line, rows separated by 1px Hairline rules. The Total row is bold, with a 2px Ink rule above and below it.
- **Checklist (H2):** completed steps show a check mark (✓) in Bronze. Incomplete steps show an empty box (☐) in Text 2.
- **Result tags and score tiles (G2):**

| Result | Text color | Background |
|---|---|---|
| Came true | Green `#4E7A46` | `#E7EFE4` |
| Sort of | Bronze `#8A6D3B` | Bronze Wash `#F0E9DC` |
| Nope | Rust `#A24B3A` | `#F2E3DF` |
| Keepsake (no score) | Text 2 `#55514A` | Parchment `#F6F4F0` |

The rank tile uses an Ink background with the number in Brass and the label in Parchment.

---

## 4. Icons

A small set of flat silhouette icons that sit to the left of the heading or line they belong to.

### 4.1 The set

| Icon | Meaning |
|---|---|
| Lock | Sealed |
| Open lock | Unlocked or reveal ready |
| Hourglass | Reveal timing, waiting |
| Calendar | Reveal dates |
| Gift box | Gifts |
| Key | Gift codes |
| QR code | Sharing a vault |
| Group of people | Guests and guest limits |
| Trophy | Results and scoring |
| Pencil | Setup and adding prompts |
| Receipt | Receipts |

### 4.2 Sourcing

- Flat single-color silhouettes released under CC0, from the same three sources listed in `VaultZombie-Art-Assets.md`: Openclipart, freesvg.org, and publicdomainvectors.org.
- Add an "Email icons" section to `VaultZombie-Art-Assets.md` listing each icon with its source page URL and license.
- Each icon is produced in two colors: Bronze `#8A6D3B` for light backgrounds and Brass `#C9A96A` for the dark band.

### 4.3 Format and size

- **PNG only.** Gmail does not display SVG images.
- Generate the PNGs once and commit them as static files in the web app's public folder under `email-icons/`. Export at 2x resolution for sharp display.
- Do not add an npm package to the app to generate them. If producing the PNGs requires a new dependency or tool, stop and report before proceeding.
- **Display size: 18px tall, never larger than 20px.** Icons must never overwhelm the text.
- Place each icon immediately to the left of its heading or line, vertically centered, with about 8px of space before the text.
- Icons are decorative: `alt=""`.

---

## 5. Email map

| ID | Email | Recipient | Trigger | Sent at most once per |
|---|---|---|---|---|
| H1 | Welcome | Host | The host's account is created after sign-up | Account |
| H2 | Vault created | Host | A host creates a new vault (draft) | Vault |
| H3 | Host receipt | Host who paid | A verified Stripe webhook activates a plan purchase or an upgrade. Not sent for gift purchases or gift redemptions. | Billing record |
| H4 | Vault sealed | Host | A vault is sealed | Vault |
| H5 | Reveal ready | Host | A reveal date arrives | Reveal |
| H6 | Unmarked reveal nudge | Host | 3 days after a reveal opens, if any scoreable prediction in that reveal still has no result marked | Reveal |
| H7 | Guest limit reached | Host | A vault goes over its guest limit | Guest limit event |
| H8 | Guest limit reminder | Host | The guest limit event is still unresolved and one of the vault's reveal dates is within the next 7 days | Guest limit event |
| G1 | Predictions sealed | Guest | A guest submits, if they left an email and are subscribed | Submission |
| G2 | Results | Guest | Every scoreable prediction that guest has in a reveal has its result marked, if they left an email and are subscribed | Guest per reveal |
| F1 | Gift purchase | Gifter | A verified Stripe webhook marks a gift purchased | Gift |
| F2 | Gift for you | Gift recipient | Same moment as F1, only if the gifter entered a recipient email | Gift |
| F3 | Gift redeemed | Gifter | A gift code is redeemed successfully | Gift |

### 5.1 Rules that apply across emails

- **No guest unlock email.** Guests are never emailed when predictions unlock. The only guest email at reveal time is G2, once results are marked. Remove the existing guest "reveal" email (event type `reveal_guest`) and do not send it anywhere, including from the admin manual unlock.
- **One results email per reveal.** A guest with predictions in several reveals gets one G2 per reveal, never one per prediction.
- **Keepsake predictions** never block G2. G2 waits only for scoreable predictions to be marked.
- **Admin manual unlock:** host emails (H5) and guest results emails (G2) for a reveal the admin opened early stay off by default. They send only if the admin checks the matching email option on that unlock action. The same opt-in governs H6 for that reveal.
- **Unsubscribed guests** get no G1 or G2 for that vault. Host and gifter emails have no unsubscribe, since they are transactional.
- **Gifter email fallback:** if the gift page's receipt email was left blank, send F1 and F3 to the email the buyer entered on the Stripe payment page.

### 5.2 Mapping to existing email event types

| ID | Existing event type | Action |
|---|---|---|
| H1 | none | Add |
| H2 | none | Add |
| H3 | none | Add |
| H4 | `operator_vault_sealed` | Replace content |
| H5 | `reveal_operator` | Replace content |
| H6 | none | Add |
| H7 | `operator_overage_initial` | Replace content |
| H8 | `operator_overage_escalation` | Replace content |
| G1 | `guest_submission_confirmation` | Replace content |
| G2 | `guest_personal_report` | Replace content and apply the rules in 5.1 |
| F1 | `gift_delivery` | Replace content. The admin "resend gift email" action also sends F1. |
| F2 | none | Add |
| F3 | none | Add |
| none | `reveal_guest` | Remove |

### 5.3 Link destinations

| Link | Destination |
|---|---|
| Create your first vault | The screen where a host starts a new vault |
| Finish setting up your vault / Continue setting up your vault | That vault's setup screen |
| Open your vault | That vault's host page |
| Open your reveal | That reveal's page in the host area |
| Get your QR code and printable cards | That vault's share screen |
| Review your options | The guest limit decision on that vault's host page |
| Guest link | That vault's guest link |
| Redeem link | `/gifts/redeem` |
| Sign up for your own Vault | The sign-up page, carrying the existing referrer code |
| Unsubscribe from this vault | The unsubscribe page in section 7 |

If a destination screen does not exist yet, link to the closest existing host page for that vault, and list each such link in your report so it can be updated when the screen is built.

---

## 6. Email copy

Every email uses the header band, footer, and styling from sections 2 and 3. `[icon: name]` marks where an icon from section 4 sits.

---

### F1. Gift purchase (to the gifter)

**Subject:** Thank you for your gift! Your Vault Zombie code is inside

**Eyebrow:** Gift secured
**Main heading:** Thank you for your gift!

You just gave someone a [tier] vault from Vault Zombie. Their friends and family will seal predictions about their future, and the predictions unlock over time so everyone can see who called it.

**[Highlight band] [icon: key] Your gift code**
[Code box: gift code]
The code never expires.

**[icon: gift box] How to give it**
Pass the code along however you like: forward this email, write it in a card, or print the gift card from your confirmation page.
Only if a recipient email was entered: We also sent the code directly to [recipient email].

**How they redeem it** (numbered steps)
1. Go to [redeem link]
2. Sign up for a free account, or sign in
3. Enter the code, and their [tier] vault is ready to set up

We'll email you when they redeem it.

**[Dark band] [icon: group] What's included in [tier]**
Stat tiles: [guest limit] guests · [duration] of reveals

**[icon: receipt] Your receipt** (receipt table)
- [tier] vault (gift) · [amount]
- Date · [purchase date]
- Payment ID · [Stripe payment ID]
- Only if a To or From name was entered: To and from · [To name], from [From name]
- **Total · [amount]**

Changed your mind? You can get a refund within 90 days of purchase, as long as the gift hasn't been redeemed. Contact info@zombieplatforms.com.

---

### F2. Gift for you (to the gift recipient)

Sent only if the gifter entered a recipient email. Never shows the price.

**Subject:** [From name] gave you a Vault Zombie vault! 🎁
If no From name was entered: You've been given a Vault Zombie vault! 🎁

**Eyebrow:** A gift for you
**Main heading:** You've been given a gift!

Hi [To name],
If no To name was entered: Hi there,

[From name] gave you a [tier] vault from Vault Zombie.
If no From name was entered: You've been given a [tier] vault from Vault Zombie.

**[icon: gift box] What is Vault Zombie?**
It's a way to collect sealed predictions about your future from the people who know you best, at a wedding, a new baby, a graduation, a new job, or any big moment. The predictions stay sealed, even from you, and unlock over time so everyone can see who called it.

**[Highlight band] [icon: key] Your gift code**
[Code box: gift code]

**How to redeem it** (numbered steps)
1. Go to [redeem link]
2. Sign up for a free account, or sign in if you already have one
3. Enter your code, and your [tier] vault is ready to set up

Your code never expires, so redeem it whenever you're ready.

**[Dark band] [icon: group] What's included in [tier]**
Stat tiles: [guest limit] guests · [duration] of reveals

---

### F3. Gift redeemed (to the gifter)

**Subject:** Your gift was redeemed! 🎉

**Eyebrow:** Gift redeemed
**Main heading:** Your gift landed!

Good news: [To name] just redeemed the [tier] vault you gave them.
If no To name was entered: The [tier] vault you gave was just redeemed.

Now they can set it up, choose their prompts, and invite their people to start predicting.

Thank you for sharing Vault Zombie.

**[Highlight band] [icon: gift box] Gift details**
- Gift: [tier] vault
- Code: [gift code]
- Purchased: [purchase date]
- Redeemed: [redemption date]

---

### H1. Welcome

Sign-up collects no name, so there is no name greeting.

**Subject:** Welcome to Vault Zombie! Let's build your first vault

**Eyebrow:** Welcome aboard
**Main heading:** Welcome to Vault Zombie!

You just started something your people will be talking about for years.

**[Highlight band] [icon: lock] How it works** (numbered steps)
1. Create a vault for your big moment and choose the prompts your guests will answer.
2. Share your QR code or link. Guests answer in about a minute, with no account needed.
3. Each prediction seals the moment it's submitted. Not even you can peek.
4. Predictions unlock on the reveal schedule you choose, and you mark who called it.

**[Button] Create your first vault**

**[Dark band] [icon: QR code] Tips for a great turnout**
- Put your QR code where no one can miss it, like a table card or your welcome sign.
- Add a few prompts of your own. The personal ones get the best answers.
- Keep it light. Guests can answer in about a minute, so nudge them to jump in.

Start free with a Lockbox vault, or choose Safe, Vault, or Deep Vault for bigger events and longer reveals.

---

### H2. Vault created

A new vault may not have a name yet, so this email uses the vault type.

**Subject:** Your [vault type] vault is saved! Here's what's next

**Eyebrow:** Vault started
**Main heading:** Your vault is saved!

Nice start. Your [vault type] vault on the [tier] plan is saved, so you can finish setting it up whenever you're ready. Drafts never expire.

**[Button] Finish setting up your vault**

**[Highlight band] [icon: pencil] Your setup checklist**
Each step shows ✓ if that vault already has it, or ☐ if not:
- Choose your vault type
- Add the names for your vault
- Set your event date
- Choose your reveal schedule
- Pick your prompts, and add your own
- Choose how guests see the prompts: one at a time, or all on one page
- Pick a cover
- Seal your vault

**[icon: lock] Before you seal, remember**
- Guests can't answer until your vault is sealed.
- Once sealed, your prompts, reveal schedule, and reveal dates are locked in for good. Take a final look before you seal.
- After sealing, you'll get your share link, QR code, and printable cards.

**[Dark band] [icon: group] Your plan includes**
Stat tiles: [guest limit] guests · [duration] of reveals

---

### H3. Host receipt

Sent for a plan purchase or an upgrade. A new vault may not have a name yet, so the email does not use one.

**Subject:** Your Vault Zombie receipt
Upgrade: Your Vault Zombie upgrade receipt

**Eyebrow:** Payment received
**Main heading:** Thank you for your purchase!

Your [tier] plan is active and ready to go.
Upgrade: Your vault is now upgraded from [previous tier] to [tier].

**[Button] Continue setting up your vault**
Upgrade: **[Button] Open your vault**

**[Dark band] [icon: group] What's included in [tier]**
Stat tiles: [guest limit] guests · [duration] of reveals
Upgrade only, below the tiles: Your upgrade raises your guest limit. Your reveal schedule and dates stay exactly as they were when you sealed the vault.

**[icon: receipt] Your receipt** (receipt table)
- Item · [tier] plan
  Upgrade: Item · Upgrade from [previous tier] to [tier]
- Date · [payment date]
- Payment ID · [Stripe payment ID]
- **Total · [amount charged]**

Keep this email for your records.

Footer uses `Questions about your purchase?` (section 2).

---

### H4. Vault sealed

**Subject:** [vault name] is sealed and ready for guests! 🔒

**Eyebrow:** Vault sealed
**Main heading:** Your vault is ready for guests!

[vault name] is sealed and live. Time to get your people predicting.

**[Highlight band] [icon: QR code] Share with your guests**
[Link box: guest link]
Guests can use this link or scan your QR code. They answer in about a minute and never need an account.

**[Button] Get your QR code and printable cards**

**[icon: lock] What sealing means**
Your prompts, reveal schedule, and reveal dates are now locked in. Every prediction seals the moment a guest submits it. No one can read one before its reveal date, not even you.

**[Dark band] Your vault at a glance**
- [icon: group] Guest limit: [guest limit]
- [icon: hourglass] Reveal schedule: [reveal schedule name]
- [icon: calendar] First reveal: [first reveal date]

**What happens next** (numbered steps)
1. Guests answer and seal their predictions.
2. We email you the moment a reveal is ready to open.
3. You mark the results, and your guests find out who called it.

---

### H5. Reveal ready

**Subject:** It's reveal day for [vault name]! 🔓

**Eyebrow:** Reveal ready
**Main heading:** It's time to open your vault!

A batch of predictions in [vault name] just unlocked. Your guests sealed these [elapsed time since sealing] ago, and now you get to see who called it.

**[Highlight band] [icon: open lock] This reveal**
- [icon: calendar] Reveal: [reveal label], [reveal date]
- [icon: group] [guest count] guests are waiting on [prediction count] predictions

**[Button] Open your reveal**

**[icon: trophy] How marking works**
For each question, enter what really happened, just once. Vault Zombie scores every guest's answer for you as **came true**, **sort of**, or **nope**. You can change any result with one tap.

**[Dark band] Your guests are waiting**
Guests only find out how they did once you mark the results, so try not to leave them hanging.

---

### H6. Unmarked reveal nudge

**Subject:** Your guests are waiting 👀

**Eyebrow:** Still sealed
**Main heading:** Somebody out there is dying to know

Your latest reveal in [vault name] opened [days since the reveal opened] days ago, and it's still unmarked. Somewhere out there, a few people are quietly wondering if they called it, and they can't find out until you open it.

**[Highlight band] [icon: hourglass] Waiting on you**
- [icon: group] [guest count] guests
- [icon: open lock] [unmarked prediction count] predictions ready to mark

**[Button] Open your reveal**

It only takes a few minutes. Enter what really happened, and we'll score everyone for you.

---

### H7. Guest limit reached

**Subject:** [vault name] was a hit! Your vault went over its guest limit

**Eyebrow:** Guest limit reached
**Main heading:** More people wanted in!

[vault name] is on the [tier] plan, which allows [guest limit] guests, and [total guest count] guests sealed predictions.

**[Highlight band] [icon: group] [over-limit guest count] guests' predictions are on hold**
They're safe, and nothing has been deleted. Until you decide, they're held back from reveals.

**[icon: lock] Your options**
- Upgrade to [upgrade tier] for [upgrade price] and keep every prediction
- Stay on [tier], and the [over-limit guest count] most recent guests' predictions are removed

[upgrade tier] is the lowest tier whose guest limit covers every guest, and [upgrade price] is the upgrade difference the app already charges. If no tier covers every guest, or the vault is already on Deep Vault, show only the second option.

**[Button] Review your options**

Upgrading only raises your guest limit. Your reveal schedule and dates stay the same.

---

### H8. Guest limit reminder

**Subject:** Reminder: [over-limit guest count] guests' predictions are still on hold

**Eyebrow:** Reveal coming up
**Main heading:** Don't leave anyone out of the reveal

Your next reveal for [vault name] is [next reveal date], [days until the reveal] days from now. The [over-limit guest count] extra guests' predictions are still on hold and won't be included unless you decide before then.

**[Button] Review your options**

---

### G1. Predictions sealed (to the guest)

Never shows any answer. Counts and dates only.

**Subject:** Your predictions for [vault name] are sealed! 🔒

**Eyebrow:** Sealed tight
**Main heading:** Thanks for playing, [guest name]!
If no guest name: Thanks for playing!

Your predictions for [vault name] are locked in. No one can read them before they unlock, not even the hosts.

**[Highlight band] [icon: lock] [prediction count] predictions sealed**
One line per reveal date, earliest first:
- [icon: calendar] [count] unlock on [reveal date]

**[icon: hourglass] What happens next**
When it's time, we'll email you to let you know how your predictions turned out and whether you called it. Sit tight. The future takes a little while to get here.

**[Dark band] Having fun?**
Got a wedding, a baby, or a big year coming up? Start a vault of your own.
**[Button] Sign up for your own Vault**

Footer includes the guest unsubscribe line (section 2).

---

### G2. Results (to the guest)

Guests never see results anywhere else, so this email is the guest's full results for that reveal. Keep it compact and report-like: no extra paragraphs between prediction rows. Include only the predictions from this one reveal.

**Subject:** The results are in! Did you call it for [vault name]? 🏆

**Eyebrow:** Results are in
**Main heading:** Remember those predictions, [guest name]?
If no guest name: Remember those predictions?

You sealed them [elapsed time since submission] ago for [vault name]. They've unlocked, and the hosts marked how they turned out.

**[Highlight band] [icon: trophy] Your score this reveal**
One row of four small tiles, using the colors in section 3.3:
- [count] came true
- [count] sort of
- [count] nope
- #[rank] of [guest count] guests (omit this tile if no rank is available)

**[icon: open lock] Your predictions**
A compact table, one row per prediction from this reveal:
- Left side: the prompt in 15px weight 600, then `You said: [answer]` in 14px Text 2. Number answers include their unit. Name-pick and multiple-choice answers show the option label.
- Only if the host left a note: a third line, `Host's note: [note]`, in 13px Gray `#8A857C`.
- Right side: the result tag, **Came true**, **Sort of**, **Nope**, or **Keepsake** for keepsake prompts.
- Rows separated by 1px Hairline rules.

**[icon: calendar] What's next**
If this guest has predictions in a later reveal: Your next predictions unlock on [next reveal date]. We'll email you when the results are in.
Otherwise: That was your final reveal for [vault name]. Thanks for being part of it from the start.

**[Dark band] Having fun?**
Got a wedding, a baby, or a big year coming up? Start a vault of your own.
**[Button] Sign up for your own Vault**

Footer includes the guest unsubscribe line (section 2).

---

## 7. Unsubscribe management

### 7.1 Scope

- Unsubscribing applies to one guest at one vault. It never affects the same email address in any other vault.
- An unsubscribed guest gets no G1 or G2 for that vault.

### 7.2 Guest unsubscribe page

The unsubscribe link in G1 and G2 opens a branded page in the web app, styled like the emails: tan header band with both logos, parchment background, white card.

To protect guests from email security scanners that open links automatically, **opening the link must not unsubscribe anyone by itself.** The page sends the signed unsubscribe request from the browser after it loads, using the existing signed per-guest token.

**Page copy after unsubscribing:**

**You're unsubscribed from [vault name]**

You won't get any more emails about this vault. That means you won't hear when your predictions unlock or how they turned out.

This only affects [vault name]. If you're a guest in any other Vault Zombie vault, those emails haven't changed.

**[Button] Changed my mind, keep sending emails**

**After the guest clicks the button,** the page re-subscribes them using the same signed token and shows:

**You're back on the list!**
We'll email you when the results for your predictions in [vault name] are in.

If the token is invalid, the page shows: **This link isn't valid.** Questions? info@zombieplatforms.com

### 7.3 Admin control

- In the admin panel, wherever the admin views a vault's guests, each guest shows an email status of **Subscribed** or **Unsubscribed** for that vault, with a switch to change it either way.
- The admin never sees a guest's answers through this control. It changes subscription status only.
- Guests with no email show **No email**, with no switch.

---

## 8. Gift page: recipient email field

On the gift purchase page (`/gifts/purchase`):

1. Add an optional field below the To and From fields:
   - Label: **Their email (optional)**
   - Helper text: Want us to send the code straight to them? We'll email it the moment your payment goes through.
   - Placeholder: `their@email.com`
2. Replace the current line under the receipt email field ("We will not email the recipient. You will receive a printable card after purchase.") with:
   You'll get a receipt with the gift code, plus a printable gift card right after purchase.
3. Validate the recipient email format. If it is invalid, show an inline error under the field and do not start checkout.
4. Store the recipient email on the gift record in a new nullable field. It is never printed on the gift card and never shown on any page.
5. F2 sends to this address when the verified Stripe webhook marks the gift purchased.

---

## 9. Done when

- All thirteen emails in section 5 send on their triggers, with the copy in section 6, the styling in section 3, and the icons in section 4.
- Every email renders correctly in Gmail, Apple Mail, and Outlook, with a matching plain-text version.
- No guest unlock email exists anywhere, including the admin manual unlock.
- The unsubscribe page, re-subscribe button, and admin email status switch work as specified in section 7.
- The gift page has the optional recipient email field, and F2 sends to it.
