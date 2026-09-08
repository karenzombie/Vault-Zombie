# VaultZombie, Report Design Guide (v1.1)

**Status:** Standalone guide for building the report and results surfaces of VaultZombie. It sits alongside the master build brief and the style guide and does not replace either. Hand it to the builder as part of the document set. v1.1 corrects internal section references and matches the guest email wording to the master brief; no component or report changed.

**What this covers:** the visual language for every results surface, a component library with sample code, the data each report consumes, and the full list of reports to build.

**What this does not cover:** product logic, the reveal engine, pricing, security, and the content model. Those live in the master build brief and are the source of truth. Base color, type, radius, and spacing tokens live in the style guide and are the source of truth for those.

---

## 1. Sources of truth

This guide is self-contained enough to build from on its own. Where it leans on a sibling document, that document is handed to the builder in the same set:

- `VaultZombie-Build-Brief-v2.md` for product logic, the outcome record and scoring model, the sealed rule, tiers, and the reveal schedules.
- `vaultzombie-style-guide.html` for the base design tokens: the ten color tokens, Tilt Warp and Afacad Flux, the radius scale, and the 4px spacing scale.

Everything below is the report layer built on top of those.

---

## 2. Design language for reports

The goal is a report that is rich and dense, with a visual device in every block, while staying inside the VaultZombie brand. Hold to these:

- **In-brand, not infographic-template.** Ink, parchment, bronze, and brass carry the report. Semantic green and rust mark outcomes. No bright multi-color palettes.
- **No shadows.** Elevation comes from hairline borders and background tints, per the style guide. Do not add drop shadows or long shadows.
- **One hero moment.** The wax seal is the single bold graphic, used large in the masthead. Everything else stays quiet.
- **Icons are functional, not decoration.** Every stat, row, and section carries an icon that names what it is. They are a single flat line set, never novelty art.
- **Charts are hand-built in SVG and CSS.** Do not add a charting library. This matches the dependency policy in the master build brief. Every chart in this guide is buildable with plain SVG and CSS.
- **Warm neutrals only.** No cool grays.
- **Accessible floor.** Colorblind-safe (outcomes read by icon shape, not color alone), visible keyboard focus, responsive down to a narrow phone, reduced motion respected, print-safe for the keepsake.

---

## 3. Report tokens

Base tokens come from the style guide. The report layer adds the semantic and tint tokens below. The two semantic hexes are the ones the style guide already uses in its own do-and-don't list.

```css
:root {
  /* semantic outcomes */
  --success:#4E7A46;  --success-wash:#E7EFE4;   /* came true */
  --error:#A24B3A;    --error-wash:#F2E3DF;      /* nope */
  /* sort of reuses the brand bronze/brass */
  --sortof:#8A6D3B;   --sortof-wash:#F0E9DC;

  /* medallion tints, for the icon circles */
  --bronze-wash:#F0E9DC;  --brass-lt:#E7D6B4;
}
```

Outcome color mapping, fixed across every report:

- Came true, green `--success`.
- Sort of, bronze or brass `--sortof`.
- Nope, rust `--error`.

**Per-vault theme color.** The art system normalizes cover silhouettes to one token color so a vault can carry its own accent. Build the report to read a single `--vault-accent` variable, defaulting to `--bronze`, so a future per-vault theme swaps that one value. Do not hard-code bronze into component fills where the accent belongs. See open items in section 9.

---

## 4. Iconography

One flat line-icon set, drawn as an SVG sprite, colored with `currentColor` so each icon inherits its context color and can recolor to the vault accent. Include this sprite once per page and reference symbols with `<use>`.

```html
<svg style="display:none" xmlns="http://www.w3.org/2000/svg">
  <symbol id="ic-heart" viewBox="0 0 24 24"><path d="M12 20s-6.5-4.4-9-8.3C1.2 8.7 2.6 5 6.2 5c2 0 3.2 1.2 3.8 2.2C10.6 6.2 11.8 5 13.8 5c3.6 0 5 3.7 3.2 6.7C18.5 15.6 12 20 12 20z"/></symbol>
  <symbol id="ic-home" viewBox="0 0 24 24"><path d="M3.5 11.5 12 5l8.5 6.5"/><path d="M6 10.5V19h12v-8.5"/></symbol>
  <symbol id="ic-people" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 18a5.5 5.5 0 0 1 11 0"/><circle cx="16.5" cy="8.5" r="2.5"/><path d="M14.8 18a5 5 0 0 1 6.7-4.7"/></symbol>
  <symbol id="ic-plane" viewBox="0 0 24 24"><path d="M21 4 3 11l6 2 2 6z"/><path d="M21 4 11 15"/></symbol>
  <symbol id="ic-coin" viewBox="0 0 24 24"><ellipse cx="12" cy="8" rx="7" ry="3"/><path d="M5 8v6c0 1.7 3.1 3 7 3s7-1.3 7-3V8"/><path d="M5 11c0 1.7 3.1 3 7 3s7-1.3 7-3"/></symbol>
  <symbol id="ic-car" viewBox="0 0 24 24"><path d="M4 13l1.8-4.5A2 2 0 0 1 7.7 7h8.6a2 2 0 0 1 1.9 1.5L20 13"/><rect x="3.5" y="13" width="17" height="5" rx="1.5"/><circle cx="7.5" cy="18.5" r="1.4"/><circle cx="16.5" cy="18.5" r="1.4"/></symbol>
  <symbol id="ic-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></symbol>
  <symbol id="ic-star" viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.9.8-4.3 4.1 1 5.8L12 16.8 6.8 19.5l1-5.8L3.5 9.6l5.9-.8z"/></symbol>
  <symbol id="ic-trophy" viewBox="0 0 24 24"><path d="M8 5h8v3.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a2.5 2.5 0 0 0 2.7 3M16 6h2.5a2.5 2.5 0 0 1-2.7 3"/><path d="M12 12v3"/><path d="M9.5 19h5l-.7-3.5h-3.6z"/></symbol>
  <symbol id="ic-lock" viewBox="0 0 24 24"><rect x="6" y="11" width="12" height="8.5" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></symbol>
  <symbol id="ic-dial" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/><path d="M12 4v2.4M12 17.6V20M4 12h2.4M17.6 12H20"/></symbol>
  <symbol id="ic-rings" viewBox="0 0 24 24"><circle cx="9.5" cy="14" r="4.6"/><circle cx="15" cy="14" r="4.6"/><path d="M9.5 5l1.8 2.6-1.8 2.6-1.8-2.6z"/></symbol>
  <symbol id="ic-cap" viewBox="0 0 24 24"><path d="M12 6 21 10l-9 4-9-4z"/><path d="M7 12.5V16c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-3.5"/></symbol>
  <symbol id="ic-baby" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M6 20a6 6 0 0 1 12 0"/></symbol>
  <symbol id="ic-check" viewBox="0 0 24 24"><path d="M6 12.5l3.5 3.5 8-8.5"/></symbol>
  <symbol id="ic-x" viewBox="0 0 24 24"><path d="M7 7l10 10M17 7 7 17"/></symbol>
  <symbol id="ic-tilde" viewBox="0 0 24 24"><path d="M5 14q3-5 6.5 0t6.5 0"/></symbol>
  <symbol id="ic-person-fill" viewBox="0 0 20 26"><circle cx="10" cy="6" r="4"/><path d="M2 25a8 8 0 0 1 16 0z"/></symbol>
</svg>
```

Base icon style, and the medallion that wraps an icon in a tinted circle:

```css
.ic  { width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.med { border-radius:50%; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
.med.bronze { background:var(--bronze-wash);   color:var(--bronze); }
.med.brass  { background:var(--brass-lt);      color:var(--bronze); }
.med.green  { background:var(--success-wash);  color:var(--success); }
.med.rust   { background:var(--error-wash);    color:var(--error); }
```

Outcome icons, drawn as filled-circle badges so they carry both shape and color:

```html
<!-- came true -->
<svg width="22" height="22" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#E7EFE4" stroke="#4E7A46" stroke-width="2"/><path d="M11 17 l4 4 8 -9" fill="none" stroke="#4E7A46" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
<!-- sort of -->
<svg width="22" height="22" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#F0E9DC" stroke="#8A6D3B" stroke-width="2"/><path d="M10 19 q3.5 -5 7 0 t7 0" fill="none" stroke="#8A6D3B" stroke-width="2.6" stroke-linecap="round"/></svg>
<!-- nope -->
<svg width="22" height="22" viewBox="0 0 34 34"><circle cx="17" cy="17" r="15" fill="#F2E3DF" stroke="#A24B3A" stroke-width="2"/><path d="M12 12 l10 10 M22 12 l-10 10" stroke="#A24B3A" stroke-width="2.6" stroke-linecap="round"/></svg>
```

Icon by vault type, for mastheads and cover motifs: rings for Marriage, people for Couple, baby for New Baby, people for Child Growth, cap for College, star for Job, plane for Travel, star for Retirement, coin for New Business, star for New Year. Icon by area of life, for the by-area chart: heart for love, star for habits, people for kids and family, home for residence, plane for travel, coin for careers and money, car for cars and purchases, target for milestones and wildcards. Those eight areas are the Marriage sub-categories; for the other nine vault types, map each sub-category to the closest icon in the sprite at import, falling back to the target icon.

---

## 5. Component library

Each component below is a report building block. The distinctive ones carry sample code. Assemble reports from these, top to bottom.

### 5.1 Section header with medallion

Every section opens with a small medallion, an uppercase bronze label, and a one-line subhead.

```html
<div class="sec">
  <span class="med bronze"><svg class="ic"><use href="#ic-people"/></svg></span>
  <div><div class="h">The room</div><div class="s">14 guests sealed predictions.</div></div>
</div>
```

### 5.2 Stat callouts

A grid of headline numbers, each with an icon medallion, a big Tilt Warp number, and a label that carries context (a trend, a sample size). Never a bare number.

```html
<div class="callout">
  <span class="med green"><svg class="ic"><use href="#ic-check"/></svg></span>
  <div><div class="n">64%</div><div class="l"><b>called it</b> · up 6 points, n=14</div></div>
</div>
```

### 5.3 Ring gauge

A single headline percentage as a progress ring. Circumference for radius 54 is 2 x pi x 54, which is about 339.3. The filled length is the percentage times that circumference. For 64 percent, the filled length is about 217.

```html
<svg viewBox="0 0 140 140">
  <circle cx="70" cy="70" r="54" fill="none" stroke="#E4DED4" stroke-width="16"/>
  <circle cx="70" cy="70" r="54" fill="none" stroke="#4E7A46" stroke-width="16"
          stroke-linecap="round" stroke-dasharray="217.1 122.2" transform="rotate(-90 70 70)"/>
  <text x="70" y="68" text-anchor="middle" dominant-baseline="middle" font-family="Tilt Warp" font-size="36" fill="#1C1B19">64%</text>
  <text x="70" y="90" text-anchor="middle" font-size="12" fill="#8A857C">called it</text>
</svg>
```

Pair it with outcome breakdown rows: an outcome icon, a name, a mini bar, and a count, one row for came true, sort of, and nope.

### 5.4 Pictograph, the guest icon array

Represent the guests as one small figure each, colored by how sharp they were. This is the signature richness device. Green for the top of the board, bronze for those who called the majority, hairline for the rest.

```html
<span class="person" style="color:var(--success)"><svg viewBox="0 0 20 26"><use href="#ic-person-fill"/></svg></span>
<!-- repeat one span per guest, setting color to success, bronze, or hairline -->
```

```css
.person { width:20px; height:26px; }
.person svg { width:100%; height:100%; fill:currentColor; stroke:none; }
```

Follow it with a one-line caption in words, for example, nine of fourteen called more than half their predictions right.

### 5.5 Diverging bar, by area of life

Each area of life is one row: a category icon, the area name, then a bar that leans off a center line. Called it stretches right in green, missed stretches left in rust. Scale both sides against the largest single-side count across all rows, so lengths compare. Sort of is carried in the row label, not the bar.

```html
<div class="dvg-row">
  <span class="med bronze"><svg class="ic" style="color:var(--bronze)"><use href="#ic-heart"/></svg></span>
  <div class="dvg-body">
    <div class="dvg-top"><span class="dvg-name">Love &amp; Conflict</span><span class="dvg-meta">8 called · 0 missed</span></div>
    <div class="dvg-track">
      <div class="dvg-side left"><!-- miss fill grows leftward from center --></div>
      <div class="dvg-side"><div class="dvg-fill hit" style="width:100%">8</div></div>
    </div>
  </div>
</div>
```

```css
.dvg-track { position:relative; display:flex; height:16px; }
.dvg-track::before { content:""; position:absolute; left:50%; top:-2px; bottom:-2px; width:2px; background:var(--ink); transform:translateX(-50%); }
.dvg-side { width:50%; display:flex; align-items:center; }
.dvg-side.left { justify-content:flex-end; }
.dvg-fill.hit  { height:100%; background:var(--success); border-radius:0 6px 6px 0; }
.dvg-fill.miss { height:100%; background:var(--error);   border-radius:6px 0 0 6px; }
```

### 5.6 Reveal timeline

A vertical timeline of the reveal dates, one node per reveal, each a medallion whose icon shows the stage: a lock for the early reveals, a dial for the middle, a trophy for the milestone. Each node carries the reveal label, the share that came true, a mini bar, and a one-line note. A rail line runs behind the nodes.

```css
.timeline { position:relative; }
.timeline::before { content:""; position:absolute; left:23px; top:10px; bottom:26px; width:2px; background:var(--hairline); }
.tl-row  { display:grid; grid-template-columns:48px 1fr; gap:14px; padding-bottom:18px; }
.tl-node { width:48px; height:48px; border:2px solid var(--white); position:relative; z-index:1; }
```

### 5.7 Scoreboard, lollipop with spotlight and slices

Guests ranked by how many they called right, drawn as lollipop bars: a rank numeral, the name, a thin line ending in a dot. The leader is brass and carries a trophy. Below the list, two devices that keep the board encouraging rather than discouraging, since a flat ranking demotivates everyone but the winner:

- A "your standing" spotlight that names the reader's own rank and how many guests they are ahead of.
- Sliced mini-titles, so more than one guest wins something: sharpest on a given area, boldest guesser, dark-horse call. Each is a small card with an icon medallion.

```html
<div class="lolli lead"><span class="rank">1</span><div>
  <div class="lt"><span class="nm">Grandma Rose <svg class="ic"><use href="#ic-trophy"/></svg></span><span class="v">24 called</span></div>
  <div class="track"><div class="base"></div><div class="line" style="width:100%"></div><span class="dot" style="left:100%"></span></div>
</div></div>
```

### 5.8 Guesses vs the real answer, for number questions

For a number question, draw a horizontal axis scaled to the range of the guesses and the actual value. Plot each guess as a bronze dot, connect the range with a light line, and mark the actual value with a bold ink diamond and a label. Crown the closest guesser in the caption.

```html
<svg viewBox="0 0 320 74">
  <line x1="30" y1="40" x2="300" y2="40" stroke="#E4DED4" stroke-width="2"/>
  <line x1="84" y1="40" x2="246" y2="40" stroke="#8A6D3B" stroke-width="2" opacity="0.5"/>
  <circle cx="84" cy="40" r="6" fill="#8A6D3B" opacity="0.85"/>
  <circle cx="138" cy="40" r="6" fill="#8A6D3B" opacity="0.85"/>
  <circle cx="246" cy="40" r="6" fill="#8A6D3B" opacity="0.85"/>
  <path d="M138 20 l9 9 -9 9 -9 -9 z" fill="#1C1B19"/>
  <text x="138" y="14" text-anchor="middle" font-size="11" font-weight="700" fill="#1C1B19">Actual: 3</text>
</svg>
```

### 5.9 Option split bars, for name-pick and multiple choice

Show how the room split across the options, sorted most-chosen first, with a check on the option that came true.

```html
<div class="optbar win">
  <div class="ot"><span class="olab">Maya <svg class="ic" style="color:var(--success)"><use href="#ic-check"/></svg></span><span class="oval">13 guests</span></div>
  <div class="otrack"><div class="ofill" style="width:100%"></div></div>
</div>
```

The same bar shape serves free-text questions: show the most-repeated write-in guesses ranked by count, then the operator note of what actually happened. Do not use a word cloud.

### 5.10 Standouts and the operator note

Two cards side by side: the call the room got right, and the one nobody saw. Each is tagged by an outcome icon and carries the operator note. The operator note is the operator's own account of what happened, capped at 140 characters, and it renders wherever an outcome is shown.

```html
<div class="opnote">
  <span class="oplab">Operator note</span>
  <span class="optxt">Renovated the kitchen in 2025.</span>
</div>
```

### 5.11 The wax seal

The hero mark. A filled bronze circle, a scalloped rim built from round-capped dashes, an embossed inner ring, and a lock. Two states: sealed, with the lock closed, and opened, with the lock open and a break line across the seal. Use the opened seal on a results report, since the results are in.

```html
<svg width="72" height="72" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="30" fill="#C9A96A"/>
  <circle cx="48" cy="48" r="33" fill="none" stroke="#C9A96A" stroke-width="8" stroke-linecap="round" stroke-dasharray="0.1 11"/>
  <circle cx="48" cy="48" r="22" fill="none" stroke="#1C1B19" stroke-width="2"/>
  <rect x="41" y="46" width="14" height="12" rx="2" fill="#F6F4F0"/>
  <path d="M43 46 v-4 a5 5 0 0 1 10 0 v4" fill="none" stroke="#F6F4F0" stroke-width="3"/>
</svg>
```

### 5.12 Certificate frame

For the milestone keepsake and the printable archive: a double hairline border with a small bronze diamond at each corner, a Tilt Warp couple or subject name, and outcome-tagged archive rows inside.

```css
.cert { position:relative; border:1px solid var(--bronze); border-radius:8px; padding:28px 20px 22px; }
.cert::before { content:""; position:absolute; inset:5px; border:1px solid var(--hairline); border-radius:4px; }
.cert .cdia { position:absolute; width:9px; height:9px; background:var(--bronze); transform:rotate(45deg); }
```

**Reference implementation.** A full assembled report using every component above is provided in this set as `vaultzombie-report-rich.html`. Treat the code samples in this section as the source of truth for each component, and that file as the picture of them assembled.

---

## 6. Data each report consumes

All reports read from the outcome records defined in the master build brief. Two rules govern every report:

- **Only unlocked outcomes ever render.** A report reads through the single unlocked-content path, filtered on the reveal having passed. A report never queries sealed answer content.
- **The operator health dashboard shows counts and metadata only.** No answer text, sealed or unlocked, appears there. It is limited to totals, guest counts, schedule progress, and dates.

Inputs the charts need, all computed from unlocked outcome records:

- Overall tally of came true, sort of, and nope, for the ring gauge and stat callouts.
- Per-guest called-it counts and totals, for the scoreboard and pictograph.
- Per-area tallies of came true and missed, for the diverging bars.
- Per-reveal came-true share, for the timeline.
- Per-question option counts, for the split bars.
- Per-question guess values and the recorded actual value, for the number spread.
- The operator note per resolved question, for the standouts, the archive, and the guest email.

---

## 7. The reports to build

Grouped by surface. Each names the components it uses and how tiers gate it. Tier depth is a proposal to confirm, see section 9.

### A. Operator surfaces

1. **Vault health dashboard.** The operator's ongoing view while the vault is sealed and running. Counts and metadata only, never answer content. Shows predictions sealed, guests answered, the schedule and the next reveal date, and progress through the run. Components: stat callouts, a compact schedule preview, guest pictograph. Available on all tiers.

2. **Reveal report.** One per reveal date. The batch of predictions that just unlocked, each with its guess and the outcome control where the operator marks came true, sort of, or nope, and optionally writes the operator note. Auto-scored structured questions arrive pre-marked. Components: prediction rows, outcome icons, operator note block. Available on any tier that has reveals, which is all of them.

### B. Results reports

3. **Vault results summary.** The flagship rich report, the aggregate of results as they accumulate. Components: masthead with the opened seal, stat callouts, ring gauge with outcome breakdown, guest pictograph, by-area diverging bars, reveal timeline, standouts. Full depth on paid tiers. Lockbox shows a trimmed version suited to its short run.

4. **Who knew you best scoreboard.** The full leaderboard as its own page: lollipop ranks with the leader medal, the your-standing spotlight, and the sliced mini-titles. Available on paid tiers.

5. **By-area breakdown.** The diverging bars, with an optional drill into the questions inside a chosen area and their outcomes. Available on paid tiers.

6. **Reveal timeline.** Accuracy reveal by reveal. Needs at least two reveals to read, so it appears on the multi-reveal schedules, which is Safe and above.

7. **Per-question detail.** A single question opened up: the option split for name-pick and multiple choice, the guesses-vs-actual spread for number questions, the ranked write-ins for free text, and the operator note. Available on all tiers as a drill-in.

8. **Guest personal report.** One guest's own results: their called-it count, their rank, their standout guesses, and the operator notes on the questions they answered. Since guests never read the vault back, this reaches them by email, and the operator can view it per guest. Available wherever a guest left an email.

### C. Finale and keepsake

9. **Grand summary, the milestone report.** The Deep Vault finale: the certificate keepsake, the winner crowned, the full archive with every question tagged by its outcome icon, and all the aggregate visuals. The milestone certificate framing is Deep Vault. Other paid tiers close on a final-reveal summary using the same visuals without the milestone certificate. Confirm this split, see section 9.

10. **Printable keepsake archive.** A print-styled version of the grand summary and the full question-by-question archive, produced through the browser's print-to-PDF, per the master build brief. Certificate framing, built to survive printing in a limited palette. Richest on Deep Vault.

### D. Email reports

These are transactional, but they carry results, so build them in the same visual language using email-safe HTML.

11. **Operator emails.** Vault created; sealed and ready to share; a reveal is ready; a nudge if a reveal stays unopened; the guest cap was exceeded with an upgrade offer.

12. **Guest emails,** sent to every guest who did not opt out of email (email is on by default, per the master build brief). Thanks for your prediction; your prediction just unlocked; the outcome is in, carrying the mark and the operator note. At the point a guest is offered the opt-out, state plainly that opting out means no unlock and no outcome updates, since results are never shown through the guest link.

13. **Gifter emails.** Purchase receipt; the recipient activated the vault.

---

## 8. Build rules for the agent

- Build every chart with plain SVG and CSS. Do not add a charting library or any new dependency.
- Include the icon sprite once per page and reference symbols with `<use>`. Color icons through `currentColor`.
- Read a single `--vault-accent` variable for the vault accent, defaulting to bronze, so a per-vault theme swaps one value.
- Make outcomes legible without color: always pair the color with the outcome icon shape.
- Keep the seal as the one hero graphic per report. Do not scatter large decorative art.
- Make every report responsive down to a narrow phone. The reveal report and the guest-facing surfaces run at live events on phone data, so keep them light.
- Give every interactive control a visible keyboard focus style. Respect reduced motion.
- Build the keepsake and archive with a print stylesheet so print-to-PDF produces a clean page in the limited palette.
- Never render sealed content in any report. Read only through the unlocked-content path. The health dashboard is counts and metadata only.

---

## 9. Open items to confirm before this locks

1. **Tier to report mapping.** Section 7 proposes which reports and which depth each tier carries, for example the milestone certificate being Deep Vault only and the timeline needing a multi-reveal schedule. Confirm the mapping, then it gets locked here.
2. **Per-vault theme colors.** The master build brief lists per-vault theme colors as an open item and never defines them. The report is built to read one `--vault-accent` token so this drops in later. The palette itself still needs to be chosen. Until then, every report ships on the bronze accent.
